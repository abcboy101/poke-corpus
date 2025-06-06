import corpusJson from '../res/corpusJson';

export type CollectionKey = keyof typeof corpusJson['collections'] & {};
export type LanguageKey = typeof corpusJson['languages'][number] & {};
export type FileKey = typeof corpusJson['collections'][CollectionKey]['files'][number] & {};

/**
 * Describes the locations of speaker names in a Collection.
 */
export interface Speaker {
  readonly file: FileKey,
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
  readonly line: Partial<Record<LanguageKey, number>>,
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
interface Collection {
  readonly id?: string,                        // used for looking up a specific line by ID
  readonly languages: readonly LanguageKey[],  // available languages
  readonly structured: boolean,                // true if lines are aligned between languages, false otherwise
  readonly softWrap?: true,                    // true if lines are soft-wrapped, undefined otherwise
  readonly version?: string | Partial<Record<LanguageKey, string>> | Partial<Record<FileKey, string>>, // which version each language's files in the collection is from, can be a string if the version number is the same between languages
  readonly files: readonly FileKey[],          // what files the collection contains
  readonly speaker?: Speaker,                  // location of speaker names
  readonly literals?: Literals,                // location of substituted literals
}

/**
 * Describes the structure of the corpus file.
 */
export interface CorpusData {
  readonly languages: readonly LanguageKey[],
  readonly collections: Record<CollectionKey, Collection>,
}

/**
 * Describes the structure of the corpus source file.
 */
export interface CorpusSource {
  readonly corpus: CorpusData,
  readonly hashes: readonly string[],
  readonly sizes: readonly number[],
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


/**
 * Metadata for a file in a collection.
 */
export interface Metadata {
  readonly hash: string,
  readonly size: number,
}

export type MetadataRecord = Record<string, Metadata>;

export const isMetadata = (o: unknown): o is Metadata => o !== null && typeof o === 'object' && 'hash' in o && typeof o.hash === 'string' && 'size' in o && typeof o.size === 'number';

const convertMetadata = (source: CorpusSource): MetadataRecord => {
  const entries = Object.entries(source.corpus.collections) as readonly [CollectionKey, Collection][];
  return Object.fromEntries(
    entries.flatMap(([collectionKey, collection]) =>
      collection.languages.flatMap((languageKey) =>
        collection.files.map((fileKey) => getFilePath(collectionKey, languageKey, fileKey))
      )
    ).map((filePath, i) => [filePath, {hash: source.hashes[i], size: source.sizes[i]}] as const)
  );
};

export const getCorpus = (source: CorpusSource) => {
  const corpus = source.corpus;
  const collections = Object.keys(corpus.collections) as readonly CollectionKey[];
  const entries = Object.entries(corpus.collections) as readonly [CollectionKey, Collection][];
  const metadata: Record<string, Metadata> = convertMetadata(source);
  return {
    // protected (serialization)
    _corpus: corpus,

    // public
    collections,
    languages: corpus.languages,
    entries,
    metadata,
    getCollection: (collection: CollectionKey) => corpus.collections[collection],
    isCollectionKey: (s: string): s is CollectionKey => collections.some((collection) => s === collection),
    isLanguageKey: (s: string): s is LanguageKey => corpus.languages.some((language) => s === language),
  };
};

/**
 * Formats the collection, language, and file into the relative path to the text file.
 */
export const getFilePath = (collectionKey: CollectionKey, languageKey: LanguageKey, fileKey: FileKey) => `corpus/${collectionKey}/${languageKey}_${fileKey}.txt.gz`;

export const cacheName = 'corpus';

async function fetchLatest(url: string): Promise<Response | undefined> {
  // Fetch from both the cache and the server simultaneously
  const [[cache, local], remote] = await Promise.all([
    'caches' in window
      ? caches.open(cacheName)
        .then(async (cache) => [cache, await cache.match(url).catch(() => undefined)] as const)
        .catch(() => [undefined, undefined])
      : [undefined, undefined],
    navigator.onLine
      ? fetch(url)
        .then((res) => res.ok ? res : undefined)
        .catch(() => undefined)
      : undefined,
  ]);

  // Save to cache
  if (cache && remote)
    cache.put(url, remote.clone()).catch((err: unknown) => { console.error(err); });
  return remote ?? local;
}

export async function fetchCorpus(): Promise<Corpus> {
  const res = await fetchLatest(import.meta.env.BASE_URL + 'data.json');
  if (res === undefined)
    throw new TypeError('Failed to fetch corpus data');
  const source = await res.json() as CorpusSource;
  return getCorpus(source);
}

//#region Serialization
export interface SerializedCorpus {
  readonly corpus: CorpusData,
  readonly metadata: Record<string, Metadata>,
}

export function serializeCorpus(corpus: Corpus): SerializedCorpus {
  return {
    corpus: corpus._corpus,
    metadata: corpus.metadata,
  };
};

export function deserializeCorpus(serialized: SerializedCorpus): Corpus {
  const corpus = serialized.corpus;
  const collections = Object.keys(corpus.collections) as readonly CollectionKey[];
  const entries = Object.entries(corpus.collections) as readonly [CollectionKey, Collection][];
  return {
    // protected (serialization)
    _corpus: corpus,

    // public
    collections,
    languages: corpus.languages,
    entries,
    metadata: serialized.metadata,
    getCollection: (collection: CollectionKey) => corpus.collections[collection],
    isCollectionKey: (s: string): s is CollectionKey => collections.some((collection) => s === collection),
    isLanguageKey: (s: string): s is LanguageKey => corpus.languages.some((language) => s === language),
  };
};
//#endregion

export type Corpus = ReturnType<typeof getCorpus>;
