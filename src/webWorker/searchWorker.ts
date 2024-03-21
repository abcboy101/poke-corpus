import 'compression-streams-polyfill';
import { preprocessString, convertWhitespace, postprocessString } from './cleanString';
import { Speaker, speakerDelimiter } from './corpus';
import { SearchTaskResultDone, SearchTaskResultNotDone } from '../utils/Status';

export interface SearchParams {
  readonly query: string,
  readonly regex: boolean,
  readonly caseInsensitive: boolean,
  readonly common: boolean,
  readonly script: boolean,
  readonly collections: readonly string[],
  readonly languages: readonly string[]
}

export interface SearchTask {
  readonly index: number,
  readonly params: SearchParams,
  readonly collectionKey: string,
  readonly fileKey: string,
  readonly languages: readonly string[],
  readonly files: readonly string[],
  readonly speaker?: Speaker,
  readonly speakerFiles?: readonly string[]
}

export interface SearchTaskResultLines {
  readonly collection: string,
  readonly file: string,
  readonly languages: readonly string[],
  readonly lines: readonly string[][]
}

export type SearchTaskResult = SearchTaskResultIncomplete | SearchTaskResultComplete;

export interface SearchTaskResultComplete {
  readonly index: number,
  readonly status: SearchTaskResultDone,
  readonly result: SearchTaskResultLines
}

export interface SearchTaskResultIncomplete {
  readonly index: number,
  readonly status: SearchTaskResultNotDone
}

/* eslint-disable no-restricted-globals */
self.onmessage = (task: MessageEvent<SearchTask>) => {
  const {index, params, collectionKey, fileKey, languages, files, speaker, speakerFiles: speakerData} = task.data;
  const notifyIncomplete = (status: SearchTaskResultNotDone) => {
    const message: SearchTaskResultIncomplete = {
      index: index,
      status: status
    }
    postMessage(message);
  }
  const notifyComplete = (status: SearchTaskResultDone, result: SearchTaskResultLines) => {
    const message: SearchTaskResultComplete = {
      index: index,
      status: status,
      result: result
    }
    postMessage(message);
  }

  const re = params.regex ? new RegExp(params.query, params.caseInsensitive ? 'sui' : 'su') : null;
  const matchCondition = (line: string): boolean => {
    return (params.regex && re !== null && convertWhitespace(line).match(re) !== null)
      || (!params.regex && !params.caseInsensitive && line.includes(params.query))
      || (!params.regex && params.caseInsensitive && (line.toLowerCase().includes(params.query.toLowerCase()) || line.toUpperCase().includes(params.query.toUpperCase())));
  };

  try {
    // Load files
    const filePromises = languages.map(((languageKey, i) => Promise.resolve([languageKey, preprocessString(files[i])] as const)));
    // notify('loading'); // for progress bar

    // Process files
    const processingFilePromises = filePromises.map((promise) => promise.then(([languageKey, data]) => {
      const lines = data.split(/\r\n|\n/);
      const lineKeys: number[] = [];

      // Check selected languages for lines that satisfy the query
      if (params.languages.includes(languageKey)) {
        lines.forEach((line, i) => {
          if (matchCondition(line)) {
            lineKeys.push(i);
          }
        });
      }
      return [languageKey, lineKeys, lines] as const;
    }));
    processingFilePromises.forEach((promise) => promise.then(() => notifyIncomplete('processing')).catch(() => {})); // for progress bar

    // Load speakers
    // Since all dialogue with speaker names are in the script file while the speaker names are in the common file, we always have to load it separately
    const speakerPromises = (speaker === undefined || speakerData === undefined) ? [] : speakerData.map((data) =>
      Promise.resolve(data).then((data) => {
        const lines = data.split(/\r\n|\n/);
        const start = lines.indexOf(`Text File : ${speaker.textFile}`) + 2;
        const end = lines.indexOf('~~~~~~~~~~~~~~~', start);
        return lines.slice(start, end);
      })
    );


    // Filter only the lines that matched
    Promise.all([Promise.all(processingFilePromises), Promise.all(speakerPromises)]).then(([processedFiles, speakers]) => {
      const languageKeys: string[] = [];
      const lineKeysSet: Set<number> = new Set();
      const fileData: string[][] = [];

      processedFiles.forEach(([languageKey, lineKeys, lines]) => {
        languageKeys.push(languageKey);
        lineKeys.forEach((i) => lineKeysSet.add(i));
        fileData.push(lines);
      });

      const fileResults: string[][] = [];
      const replaceSpeaker = (s: string, languageIndex: number) => speaker === undefined ? s : s.replace(/(.*?)(\[VAR 0114\(([0-9A-F]{4})\)\])(?:$|(?=\u{F0000}))/u, (_, rest, tag, speakerIndexHex) => {
        const speakerIndex = parseInt(speakerIndexHex, 16);
        const speakerName = speakers[languageIndex][speakerIndex];
        return `${tag.replaceAll('[', '\\[')}\u{F1100}${speakerName}${speakerDelimiter(languages[languageIndex]) ?? ': '}\u{F1101}${rest}`;
      });
      const offsetsPBR = {'No.': 992, 'Lv.': 998, 'HP': 1036, 'PP': 1042} as {[key: string]: number};
      const languagesPBR = ['ja', 'en', 'de', 'fr', 'es', 'it'];
      const replacePBR = (s: string, languageIndex: number) => collectionKey !== 'BattleRevolution' ? s : s.replace(/\["(No.|Lv.|PP|HP)"\]/gu, (_, tag) => {
        const literalOffset = offsetsPBR[tag] - 1;
        const literalIndex = languagesPBR.indexOf(languages[languageIndex].split('-')[0]);
        const literal = fileData[languageIndex][literalOffset + literalIndex].substring('[FONT 0][SPACING 1]'.length).trim();
        return `\u{F1102}${literal}\u{F1103}`
      });
      Array.from(lineKeysSet).sort((a, b) => a - b).forEach((i) => fileResults.push(fileData.map((lines, languageIndex) => postprocessString(replacePBR(replaceSpeaker(lines[i] ?? '', languageIndex), languageIndex)))));
      notifyComplete('done', {
        collection: collectionKey,
        file: fileKey,
        languages: languageKeys,
        lines: fileResults,
      });
    })
    .catch((err) => {
      console.error(err);
      notifyIncomplete('error');
    });
  }
  catch (err) {
    console.error(err);
    notifyIncomplete('error');
  }
};
