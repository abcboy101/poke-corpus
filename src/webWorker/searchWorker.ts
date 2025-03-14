import { preprocessString } from '../utils/string/cleanStringPre';
import { codeId, Speaker, Literals } from '../utils/corpus';
import { SearchTaskResultDone, SearchTaskResultNotDone } from '../utils/Status';
import { parseWhereClause, isBooleanQueryValid, getMatchConditionBoolean } from './searchBoolean';
import { extractSpeakers } from '../utils/speaker';
import { SearchParams, SearchTaskParams } from '../utils/searchParams';
import { getMatchConditionAll, getMatchConditionExact, getMatchConditionRegex, MatchCondition } from './searchCondition';

export type WhereCondition = (i: number) => boolean;
export type WhereConditionFactory = (fileData: readonly string[][], languageKeys: readonly string[]) => WhereCondition;

export interface SearchTask {
  readonly index: number,
  readonly params: SearchTaskParams,
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
  readonly speakers: readonly string[][],
  readonly literals: readonly ReadonlyMap<number, string>[],
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
  switch (params.type) {
    case 'all':
      return getMatchConditionAll(params.query, params.caseInsensitive);
    case 'exact':
      return getMatchConditionExact(params.query, params.caseInsensitive);
    case 'regex':
      return getMatchConditionRegex(params.query, params.caseInsensitive);
    case 'boolean':
      return getMatchConditionBoolean(params.query, params.caseInsensitive);
    default:
      return () => false;
  }
}

function parseQuery(params: SearchParams): [MatchCondition, WhereConditionFactory] {
  // Not a boolean query, use params directly
  if (params.type !== "boolean") {
    return [getMatchCondition(params), () => () => true];
  }

  // Check for WHERE clause
  const whereClause = parseWhereClause(params.query);
  if (!whereClause) {
    return [getMatchCondition(params), () => () => true];
  }

  // WHERE clause found, parse it
  const [, query, languageKey1, comparison, languageKey2] = whereClause;
  const paramsModified = {...params, query: query};
  const matchCondition: MatchCondition = (isBooleanQueryValid(paramsModified.query, paramsModified.caseInsensitive) === 'empty')
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
 * Fold them to the same codepoint, unless the user requests a case-sensitive search.
 * (i.e. would have an expectation that the characters are treated literally)
 */
function cleanSpecialFactory(params: SearchParams): (s: string) => string {
  return (params.caseInsensitive) ? (
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
      const ignoreSpaces = params.caseInsensitive && ['ja', 'ko', 'zh', 'th'].some((lang) => languageKey.startsWith(lang));
      if (params.languages.includes(languageKey)) {
        lines.forEach((line, i) => {
          const clean = cleanSpecial(line);
          if (matchCondition(clean) || (ignoreSpaces && matchCondition(clean.replaceAll(' ', '')))) {
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
    const lineKeysSet = new Set<number>();
    const fileData: string[][] = [];

    processedFiles.forEach(([languageKey, lineKeys, lines]) => {
      languageKeys.push(languageKey);
      lineKeys.forEach((i) => lineKeysSet.add(i));
      fileData.push(lines);
    });

    const messageIdIndex = languageKeys.indexOf(codeId);
    const lineKeysSorted = Array.from(lineKeysSet).sort((a, b) => a - b);
    const whereCondition = whereConditionFactory(fileData, languageKeys);
    const fileResults: readonly string[][] = ((messageIdIndex === -1) ? lineKeysSorted
      : lineKeysSorted.filter((i) => {
        // Ignore lines that don't correspond to text data (blank lines, text file headers) based on the message ID file
        const messageId = fileData[messageIdIndex][i];
        return messageId !== '' && messageId !== '~~~~~~~~~~~~~~~' && !messageId.startsWith('Text File : ');
      }))
      .filter(whereCondition)
      .map((i) => fileData.map((lines) => lines[i]));

    // Substituted string literals vary by language, so we need to look up what the string is in the appropriate language here
    const literalsLine = literals ? Object.keys(literals).flatMap((id) => (literals[id].branch !== 'language') ? literals[id].line : Object.values(literals[id].line)) : undefined;
    const literalsData = literalsLine ? fileData.map((lines) => new Map(literalsLine.map((i) => [i, lines[i - 1]]))) : [];

    notifyComplete('done', {
      collection: collectionKey,
      file: fileKey,
      languages: languageKeys,
      lines: fileResults,
      speakers: speakers,
      literals: literalsData,
    });
  }
  catch (err) {
    console.error(err);
    notifyIncomplete('error');
  }
};
