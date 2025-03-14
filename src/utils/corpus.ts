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
export type Literals = Record<string, LiteralInfoBranch | LiteralInfoBranchLanguage | LiteralInfoNoBranch>;

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
  readonly line: Record<string, number>,
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
  readonly softWrap?: boolean,            // true if lines are soft-wrapped, false otherwise
  readonly version?: string | Record<string, string>, // which version each language's files in the collection is from, can be a string if the version number is the same between languages
  readonly files: readonly string[],      // what files the collection contains
  readonly speaker?: Speaker,             // location of speaker names
  readonly literals?: Literals,           // location of substituted literals
}

/**
 * Describes the structure of the corpus file.
 */
export interface Corpus {
  readonly languages: readonly string[],
  readonly collections: Record<string, Collection>,
}

/*
Message IDs use the private-use language code "qid". ("qaa"-"qtz" are reserved for local use in ISO 639-2.)
- For GB/GBC/GBA games, these are assigned based on the identifiers from the pret decompilation.
- For DS/3DS games, these are assigned numerically based on which file it is in.
- For Switch games, these are based on the identifiers assigned to it in the table files.

These tend to be in a mixture of English ("en") and romanized Japanese ("ja-Latn").
Since these are not natural language, we use the language code "zxx" (not applicable) on display.
*/
export const codeId = "qid";
export const langId = "zxx";

export const corpus = corpusJson as Corpus;
export default corpus;
