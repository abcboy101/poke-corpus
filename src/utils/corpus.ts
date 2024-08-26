import corpusJson from '../res/corpus.json';

/**
 * Describes the locations of speaker names in a Collection.
 */
export interface Speaker {
  readonly file: string,
  readonly textFile: string,
}

/**
 * Describes the locations of substituted string literals in a Collection.
 */
export interface Literals {
  [id: string]: LiteralInfoBranch | LiteralInfoBranchLanguage | LiteralInfoNoBranch,
}

/**
 * Lists the 1-indexed line numbers for a substituted literal that depends on the player's gender or the game version.
 */
interface LiteralInfoBranch {
  readonly branch: "gender" | "version",
  readonly line: readonly number[],
}

/**
 * Lists the 1-indexed line numbers for a substituted literal where the line number depends on the game language.
 */
interface LiteralInfoBranchLanguage {
  readonly branch: "language",
  readonly line: {
    [language: string]: number,
  },
}

/**
 * Lists the 1-indexed line number for a substituted literal with no branches.
 */
interface LiteralInfoNoBranch {
  readonly branch?: undefined,
  readonly line: number,
}

/**
 * Describes the properties of a collection of files.
 */
export interface Collection {
  readonly id?: string,                   // used for looking up a specific line by ID
  readonly languages: readonly string[],  // available languages
  readonly structured: boolean,           // true if lines are aligned between languages, false otherwise
  readonly version?: string | {           // which version each language's files in the collection is from
    [language: string]: string,           // can be a string if the version number is the same between languages
  },
  readonly files: readonly string[],      // what files the collection contains
  readonly speaker?: Speaker,             // location of speaker names
  readonly literals?: Literals,           // location of substituted literals
}

/**
 * Describes the structure of the corpus file.
 */
export interface Corpus {
  readonly languages: readonly string[],
  readonly collections: {
    [collectionKey: string]: Collection,
  },
}

const speakerDelimiters: {[language: string]: string} = {
  'ja-Hrkt-JP': '『',
  'ja-JP': '『',
  'fr-FR': ' : ', // space before and after colon
  'zh-CN': '\uFF1A', // fullwidth colon
  'zh-TW': '「',
  // default: ': '
};

export function speakerDelimiter(language: string) {
  return speakerDelimiters[language] ?? ': ';
}

export const codeId = "qid-ZZ";
export const langId = "en-JP";

export const corpus = corpusJson as Corpus;
export default corpus;
