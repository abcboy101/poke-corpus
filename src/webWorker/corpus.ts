import corpusJson from '../res/corpus.json'

export interface Speaker {
  readonly file: string,
  readonly textFile: string
}

export interface Collection {
  readonly id?: string,                   // used for looking up a specific line by ID
  readonly languages: readonly string[],  // available languages
  readonly structured: boolean,           // true if lines are aligned between languages, false otherwise
  readonly version?: string | {           // which version each language's files in the collection is from
    [language: string]: string            // can be a string if the version number is the same between languages
  },
  readonly files: readonly string[],      // what files the collection contains
  readonly speaker?: Speaker              // location of speaker names
}

export interface Corpus {
  hash: string,
  readonly languages: readonly string[],
  readonly collections: {
    [collectionKey: string]: Collection
  }
}

const speakerDelimiters: {[language: string]: string} = {
  'ja-Hrkt-JP': '『',
  'ja-JP': '『',
  'fr-FR': ' : ', // space before and after colon
  'zh-CN': '\uFF1A', // fullwidth colon
  'zh-TW': '「'
   // default: ': '
};

export function speakerDelimiter(language: string) {
  return speakerDelimiters[language] ?? ': ';
}

export const getFileUrl = (collectionKey: string, languageKey: string, fileKey: string) =>
  import.meta.env.BASE_URL + `corpus/${collectionKey}/${languageKey}_${fileKey}.txt.gz`;
export const getCachedFile = (cache: Cache, url: string): Promise<Response> => (
  // Try retrieving file from cache
  cache.match(url).then((res) => {
    if (res !== undefined) {
      if (import.meta.env.DEV) {
        console.debug(`Retrieved ${url} from cache`);
      }
      return res;
    }

    // Try adding URL to cache and retrieving it from cache
    return fetch(url).then((res) => {
      cache.put(url, res.clone()).then(() => {
        if (import.meta.env.DEV) {
          console.debug(`Saved ${url} to cache`);
        }
      });
      return res;
    });
  })
);

export const codeId = "qid-ZZ";
export const langId = "en-JP";

export const corpus = corpusJson as Corpus;
export const cacheVersion = `corpus-${corpus.hash}`;
export default corpus;
