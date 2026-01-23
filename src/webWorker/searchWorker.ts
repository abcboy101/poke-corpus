import { preprocessString } from '../utils/string/cleanStringPre';
import { codeId, Speaker, Literals, CollectionKey, FileKey, LanguageKey } from '../utils/corpus';
import { SearchTaskResultDone, SearchTaskResultNotDone } from '../utils/Status';
import { parseWhereClause, isBooleanQueryValid, getMatchConditionBoolean } from './searchBoolean';
import { extractSpeakers } from '../utils/speaker';
import { SearchParams } from '../utils/searchParams';
import { getMatchConditionAll, getMatchConditionExact, getMatchConditionRegex, MatchCondition } from './searchCondition';
import { replaceLiteralsPreFactory } from '../utils/string/literals';

export type WhereCondition = (i: number) => boolean;
export type WhereConditionFactory = (fileData: readonly string[][], languageKeys: readonly string[]) => WhereCondition;

export interface SearchTask {
  readonly index: number,
  readonly params: SearchParams,
  readonly collectionKey: CollectionKey,
  readonly fileKey: FileKey,
  readonly languages: readonly LanguageKey[],
  readonly files: readonly string[],
  readonly speaker?: Speaker,
  readonly speakerFiles?: readonly string[],
  readonly literals?: Literals,
}

export interface SearchTaskResultLines {
  readonly collection: CollectionKey,
  readonly file: FileKey,
  readonly languages: readonly LanguageKey[],
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
      params.type satisfies never;
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
 * The development/localization teams sometimes uses these characters interchangeably.
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

      .replaceAll('\u2010', '-') // hyphen -> hyphen-minus
      .replaceAll('\u2013', '-') // en dash -> hyphen-minus
      .replaceAll('\u2014', '-') // em dash -> hyphen-minus
      .replaceAll('\u2015', '-') // horizontal bar -> hyphen-minus
      .replaceAll('\u2212', '-') // minus -> hyphen-minus

      .replaceAll('º', '°') // masculine ordinal indicator -> degree symbol
      .replaceAll('˚', '°') // ring above -> degree symbol
      .replaceAll('ᵒ', '°') // modifier letter small O -> degree symbol

      .replaceAll('〜', '～') // wave dash -> fullwidth tilde
      .replaceAll('‥', '..') // two dot leader -> full stop (x2)
      .replaceAll('…', '...') // horizontal ellipsis -> full stop (x3)

      .replaceAll(/[\u3041-\u3096\u309D\u309E]/gu, (c) => String.fromCodePoint(c.charCodeAt(0) + 0x60)) // hiragana -> katakana
      .normalize()
    )
  ) : (s) => s;
}

/**
 * Maps GB-era control characters to standard text-based equivalents.
 *
 * Line breaks are folded to their nearest equivalent ('\n', '\r', or '\c'),
 * while the commands marking the start and end of strings are removed.
 * This allows regexes containing `\s`, `\S`, `^`, or `$` to work as expected.
 */
function convertGBControlCharacters(s: string) {
  return (s
    .replaceAll('{text_start}', '')
    .replaceAll('{text_low}', '\\n')
    .replaceAll('<SHY>',    '')    // 1E
    .replaceAll('<BSP>',    ' ')   // 1F
    .replaceAll('<LF>',     '\\n') // 22
    .replaceAll('<WBR>',    '')    // 25
    .replaceAll('<PAGE>',   '\\c') // 49
    .replaceAll('<_CONT>',  '\\r') // 4B
    .replaceAll('<SCROLL>', '\\r') // 4C
    .replaceAll('<NEXT>',   '\\n') // 4E
    .replaceAll('<LINE>',   '\\n') // 4F
    .replaceAll('@',        '')    // 50
    .replaceAll('<PARA>',   '\\c') // 51
    .replaceAll('<CONT>',   '\\r') // 55
    .replaceAll('<DONE>',   '')    // 57
    .replaceAll('<PROMPT>', '')    // 58
  );
}

/**
 * Normalizes a string by removing all whitespace, i.e. "ひとの こころ" -> "ひとのこころ".
 * Intended for languages where whitespace is not significant such as Japanese, Korean, Chinese, and Thai.
 */
function removeWhitespace(s: string) {
  return s.replaceAll(/\\[nrc]|\s/g, '');
}

/**
 * Normalizes a string by replacing all whitespace with a standard space.
 * Soft hyphens (hyphens followed by a newline) are removed, i.e. "break-\ning" -> "breaking".
 */
function normalizeWhitespaceRemoveHyphen(s: string) {
  s = s.replaceAll(/(\p{L})-(?:\\[nrc])+(\p{L})/gu, '$1$2'); // words broken across lines
  s = s.replaceAll(/(?:\\[nrc]|\s)+/g, ' '); // collapse whitespace to space
  return s;
}

/**
 * Normalizes a string by replacing all whitespace with a standard space.
 * Newlines following a hyphen are removed preserving the hyphen, i.e. "must-\nhave" -> "must-have".
 */
function normalizeWhitespacePreserveHyphen(s: string) {
  s = s.replaceAll(/(\p{L})-(?:\\[nrc])+(\p{L})/gu, '$1-$2'); // hyphenated compound broken across lines
  s = s.replaceAll(/(?:\\[nrc]|\s)+/g, ' '); // collapse whitespace to space
  return s;
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
    const fileData: string[][] = files.map((data, i) => preprocessString(data, collectionKey, languages[i]).split(/\r\n|\n/));

    // Substituted string literals vary by language, so we need to look up what the string is in the appropriate language here
    const literalsLine = literals ? Object.keys(literals).flatMap((id) => (literals[id].branch !== 'language') ? literals[id].line : Object.values(literals[id].line)) : undefined;
    const literalsData = literalsLine ? fileData.map((lines) => new Map(literalsLine.map((i) => [i, lines[i - 1]]))) : [];

    // Process files
    const lineKeys = new Set<number>();
    const cleanSpecial = cleanSpecialFactory(params);
    const [matchCondition, whereConditionFactory] = parseQuery({...params, query: cleanSpecial(params.query)});
    const replaceLiterals = replaceLiteralsPreFactory(literalsData, languages.indexOf(codeId), collectionKey, languages, literals);
    fileData.forEach((lines, languageIndex) => {
      notifyIncomplete('processing'); // for progress bar
      const languageKey = languages[languageIndex];

      // Determine matching strategy
      // - For case-sensitive searches, only exact matches are allowed.
      // - For case-insensitive searches:
      //   - If whitespace is not significant, matches folding special characters and ignoring whitespace are also allowed.
      //   - If whitespace is significant, matches folding special characters, collapsing whitespace, and allowing hyphens to break words across lines are allowed.
      // - For GB games, both matches to the raw control characters and matches to the converted control characters are allowed.
      // - For games with substituted literals, both matches to the raw control characters and matches to the substituted text are allowed.
      const subMatch1 = (!params.caseInsensitive ? matchCondition : ['ja', 'ko', 'zh', 'th'].some((lang) => languageKey.startsWith(lang))
        ? (line: string) => matchCondition(line) || matchCondition(cleanSpecial(line)) || matchCondition(removeWhitespace(cleanSpecial(line)))
        : (line: string) => matchCondition(line) || matchCondition(cleanSpecial(normalizeWhitespacePreserveHyphen(line))) || matchCondition(cleanSpecial(normalizeWhitespaceRemoveHyphen(line)))
      );
      const subMatch2 = ['RedBlue', 'Yellow', 'GoldSilver', 'Crystal'].includes(collectionKey)
        ? (line: string) => subMatch1(line) || subMatch1(convertGBControlCharacters(line))
        : subMatch1;
      const match = literals === undefined
        ? subMatch2
        : (line: string) => subMatch1(line) || subMatch1(replaceLiterals(line, languageIndex));

      // Check selected languages for lines that satisfy the query
      if (params.languages.includes(languageKey)) {
        lines.forEach((line, i) => {
          if (match(line)) {
            lineKeys.add(i);
          }
        });
      }
    });

    // Load speakers
    // Since all dialogue with speaker names are in the script file while the speaker names are in the common file, we always have to load it separately
    const speakers = (speaker === undefined || speakerData === undefined) ? [] : extractSpeakers(speakerData, speaker.textFile);

    const messageIdIndex = languages.indexOf(codeId);
    const lineKeysSorted = Array.from(lineKeys).sort((a, b) => a - b);
    const whereCondition = whereConditionFactory(fileData, languages);
    if (import.meta.env.DEV && messageIdIndex !== -1 && lineKeysSorted.length > 0 && lineKeysSorted[lineKeysSorted.length - 1] >= fileData[messageIdIndex].length)
      throw new RangeError(`message IDs are incorrectly aligned (expected at least ${lineKeysSorted[lineKeysSorted.length - 1]} but found ${fileData[messageIdIndex].length})`);
    const fileResults: readonly string[][] = ((messageIdIndex === -1) ? lineKeysSorted
      : lineKeysSorted.filter((i) => {
        // Ignore lines that don't correspond to text data (blank lines, text file headers) based on the message ID file
        const messageId = fileData[messageIdIndex][i];
        return messageId && messageId !== '~~~~~~~~~~~~~~~' && !messageId.startsWith('Text File : ');
      }))
      .filter(whereCondition)
      .map((i) => fileData.map((lines) => lines[i]));

    notifyComplete('done', {
      collection: collectionKey,
      file: fileKey,
      languages: languages,
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
