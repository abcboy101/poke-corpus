import 'compression-streams-polyfill';
import { preprocessString, convertWhitespace, postprocessString } from './cleanString';
import { codeId, Speaker, Literals } from '../utils/corpus';
import { SearchTaskResultDone, SearchTaskResultNotDone } from '../utils/Status';
import { getMatchConditionBoolean, isBooleanQueryValid } from './searchBoolean';
import { extractSpeakers, replaceSpeaker } from '../utils/speaker';
import { SearchParams } from '../utils/searchParams';

export type MatchCondition = (line: string) => boolean;
export type WhereCondition = (i: number) => boolean;
export type WhereConditionFactory = (fileData: string[][], languageKeys: string[]) => WhereCondition;

export interface SearchTask {
  readonly index: number,
  readonly params: SearchParams,
  readonly collectionKey: string,
  readonly fileKey: string,
  readonly languages: readonly string[],
  readonly files: readonly string[],
  readonly speaker?: Speaker,
  readonly speakerFiles?: readonly string[],
  readonly literals?: Literals,
}

export interface SearchTaskResultLines {
  readonly collection: string,
  readonly file: string,
  readonly languages: readonly string[],
  readonly lines: readonly string[][],
}

export type SearchTaskResult = SearchTaskResultIncomplete | SearchTaskResultComplete;

export interface SearchTaskResultComplete {
  readonly index: number,
  readonly status: SearchTaskResultDone,
  readonly result: SearchTaskResultLines,
}

export interface SearchTaskResultIncomplete {
  readonly index: number,
  readonly status: SearchTaskResultNotDone,
}

function getMatchCondition(params: SearchParams): MatchCondition {
  if (params.type === "exact") {
    // exact match
    if (!params.caseInsensitive) {
      return (line) => line.includes(params.query); // case-sensitive
    }
    else {
      const lowercase = params.query.toLowerCase();
      const uppercase = params.query.toUpperCase();
      return (line) => line.toLowerCase().includes(lowercase) || line.toUpperCase().includes(uppercase); // case-insensitive
    }
  }
  else if (params.type === "regex") {
    // regex match
    const re = new RegExp(params.query, params.caseInsensitive ? 'sui' : 'su');
    return (line) => convertWhitespace(line).match(re) !== null;
  }
  else if (params.type === "boolean") {
    return getMatchConditionBoolean(params);
  }
  return () => false;
}

function parseQuery(params: SearchParams): [MatchCondition, WhereConditionFactory] {
  // Not a boolean query, use params directly
  if (params.type !== "boolean") {
    return [getMatchCondition(params), () => () => true];
  }

  // Check for WHERE clause
  const whereClause = /(.*)\bWHERE\s+([A-Za-z-]+)\s*(=|==|<>|!=)\s*([A-Za-z-]+)/u.exec(params.query);
  if (!whereClause) {
    return [getMatchCondition(params), () => () => true];
  }

  // WHERE clause found, parse it
  const [, query, languageKey1, comparison, languageKey2] = whereClause;
  const paramsModified = {...params, query: query};
  const matchCondition: MatchCondition = (isBooleanQueryValid(paramsModified) === 'empty')
    ? () => true
    : getMatchCondition({...params, query: query});
  const whereConditionFactory: WhereConditionFactory = (fileData, languageKeys) => {
    // Find the index of both languages
    const languageIndex1 = languageKeys.indexOf(languageKey1);
    const languageIndex2 = languageKeys.indexOf(languageKey2);
    if (languageIndex1 === -1 || languageIndex2 === -1)
      return () => false; // Collection does not have both languages requested, exclude all lines

    // Return the appropriate condition
    if (comparison === '=' || comparison === '==')
      return (i) => (fileData[languageIndex1][i] === fileData[languageIndex2][i]);
    else if (comparison === '<>' || comparison === '!=')
      return (i) => (fileData[languageIndex1][i] !== fileData[languageIndex2][i]);
    return () => false;
  };
  return [matchCondition, whereConditionFactory];
}

/**
 * Generates the appropriate function to clean special characters.
 *
 * The development/localization team sometimes uses these characters interchangeably.
 * Fold them to the same codepoint, unless the user requests a case-sensitive/regex search.
 * (i.e. would have an expectation that the characters are treated literally)
 */
function cleanSpecialFactory(params: SearchParams): (s: string) => string {
  return (params.caseInsensitive && params.type !== 'regex') ? (
    (s) => (s
      .replaceAll('\u00A0', ' ') // non-breaking space -> space
      .replaceAll('\u2007', ' ') // figure space -> space
      .replaceAll('\u202F', ' ') // narrow non-breaking space -> space
      .replaceAll('\u3000', ' ') // fullwidth space -> space
      .replaceAll('“', '"') // left double quotation mark -> quotation mark
      .replaceAll('”', '"') // right double quotation mark -> quotation mark
      .replaceAll('\u2018', "'") // left single quotation mark -> apostrophe
      .replaceAll('\u2019', "'") // right single quotation mark -> apostrophe
      .replaceAll('º', '°') // masculine ordinal indicator -> degree symbol
      .replaceAll('‥', '..') // two dot leader -> full stop (x2)
      .replaceAll('…', '...') // horizontal ellipsis -> full stop (x3)
      .normalize()
    )
  ) : (s) => s;
}

self.onmessage = (task: MessageEvent<SearchTask>) => {
  const {index, params, collectionKey, fileKey, languages, files, speaker, speakerFiles: speakerData, literals} = task.data;
  const notifyIncomplete = (status: SearchTaskResultNotDone) => {
    const message: SearchTaskResultIncomplete = {
      index: index,
      status: status,
    };
    postMessage(message);
  };
  const notifyComplete = (status: SearchTaskResultDone, result: SearchTaskResultLines) => {
    const message: SearchTaskResultComplete = {
      index: index,
      status: status,
      result: result,
    };
    postMessage(message);
  };

  try {
    // Load files
    const preprocessedFiles = languages.map(((languageKey, i) => [languageKey, preprocessString(files[i], collectionKey, languageKey)] as const));

    // Process files
    const cleanSpecial = cleanSpecialFactory(params);
    const [matchCondition, whereConditionFactory] = parseQuery({...params, query: cleanSpecial(params.query)});
    const processedFiles = preprocessedFiles.map(([languageKey, data]) => {
      notifyIncomplete('processing'); // for progress bar
      const lines = data.split(/\r\n|\n/);
      const lineKeys: number[] = [];

      // Check selected languages for lines that satisfy the query
      if (params.languages.includes(languageKey)) {
        lines.forEach((line, i) => {
          if (matchCondition(cleanSpecial(line))) {
            lineKeys.push(i);
          }
        });
      }
      return [languageKey, lineKeys, lines] as const;
    });

    // Load speakers
    // Since all dialogue with speaker names are in the script file while the speaker names are in the common file, we always have to load it separately
    const speakers = (speaker === undefined || speakerData === undefined) ? [] : extractSpeakers(speakerData, speaker.textFile);

    // Filter only the lines that matched
    const languageKeys: string[] = [];
    const lineKeysSet: Set<number> = new Set();
    const fileData: string[][] = [];

    processedFiles.forEach(([languageKey, lineKeys, lines]) => {
      languageKeys.push(languageKey);
      lineKeys.forEach((i) => lineKeysSet.add(i));
      fileData.push(lines);
    });

    // Substituted string literals vary by language, so we need to look up what the string is in the appropriate language here
    const messageIdIndex = languageKeys.indexOf(codeId);
    const replaceLiterals = (s: string, languageIndex: number) => {
      if (literals === undefined || languageIndex === messageIdIndex)
        return s;

      for (const [literalId, {branch, line}] of Object.entries(literals)) {
        const searchValue = `[${literalId}]`;
        let replaceValue = searchValue;
        if (branch === undefined)
          replaceValue = fileData[languageIndex][line - 1];
        else if (branch === 'gender')
          replaceValue = `\u{F1200}${line.map((lineNo) => fileData[languageIndex][lineNo - 1]).join('\u{F1104}')}`;
        else if (branch === 'version')
          replaceValue = `\u{F1207}${line.map((lineNo) => fileData[languageIndex][lineNo - 1]).join('\u{F1104}')}`;
        else if (branch === 'language')
          replaceValue = fileData[languageIndex][line[languages[languageIndex]] - 1];

        if (collectionKey === 'BattleRevolution')
          replaceValue = replaceValue.substring('[FONT 0][SPACING 1]'.length).trim();

        s = s.replaceAll(searchValue, `\u{F1102}${replaceValue}\u{F1103}`);
      }
      return s;
    };

    const lineKeysSorted = Array.from(lineKeysSet).sort((a, b) => a - b);
    const whereCondition = whereConditionFactory(fileData, languageKeys);
    const fileResults: string[][] = ((messageIdIndex === -1) ? lineKeysSorted
      : lineKeysSorted.filter((i) => {
        // Ignore lines that don't correspond to text data (blank lines, text file headers) based on the message ID file
        const messageId = fileData[messageIdIndex][i];
        return messageId !== '' && messageId !== '~~~~~~~~~~~~~~~' && !messageId.startsWith('Text File : ');
      }))
      .filter(whereCondition)
      .map((i) => fileData.map((lines, languageIndex) => {
        let line = lines[i];
        if (speaker !== undefined)
          line = replaceSpeaker(lines[i] ?? '', speakers[languageIndex], languages[languageIndex]);
        line = replaceLiterals(line, languageIndex);
        return postprocessString(line, collectionKey, languages[languageIndex]);
      }));

    notifyComplete('done', {
      collection: collectionKey,
      file: fileKey,
      languages: languageKeys,
      lines: fileResults,
    });
  }
  catch (err) {
    console.error(err);
    notifyIncomplete('error');
  }
};
