import 'compression-streams-polyfill';
import { preprocessString, convertWhitespace, postprocessString } from './cleanString';

export interface SearchParams {
  readonly query: string,
  readonly regex: boolean,
  readonly caseInsensitive: boolean,
  readonly common: boolean,
  readonly script: boolean,
  readonly collections: readonly string[],
  readonly languages: readonly string[]
};

export interface SearchTask {
  readonly index: number,
  readonly params: SearchParams,
  readonly collectionKey: string,
  readonly fileKey: string,
  readonly languages: readonly string[]
}

export type SearchTaskResultError = 'error' | 'regex' | 'network';
export type SearchTaskResultDone = 'done';
export type SearchTaskResultStatus = 'loading' | 'processing' | SearchTaskResultDone | SearchTaskResultError;
export interface SearchTaskResultLines {
  readonly collection: string,
  readonly file: string,
  readonly languages: readonly string[],
  readonly lines: readonly string[][]
}
export interface SearchTaskResult {
  readonly index: number,
  readonly status: SearchTaskResultStatus,
  readonly result?: SearchTaskResultLines
}
export interface SearchTaskResultComplete {
  readonly index: number,
  readonly status: SearchTaskResultDone,
  readonly result: SearchTaskResultLines
}

export const cacheVersion = "v1";

/* eslint-disable no-restricted-globals */
self.onmessage = (task: MessageEvent<SearchTask>) => {
  const {index, params, collectionKey, fileKey, languages} = task.data;
  const notify = (status: SearchTaskResultStatus, result?: SearchTaskResultLines) => {
    const message: SearchTaskResult = {
      index: index,
      status: status,
      result: result
    }
    postMessage(message);
  }

  /**
   * Attempts the following, in order:
   * - Retrieving the file from the cache
   * - Populating the cache with the file
   * - Fetching the file directly
   *
   * Returns a promise of the text of the file.
   */
  const getFileFromCache = (collectionKey: string, languageKey: string, fileKey: string) => {
    const url = process.env.PUBLIC_URL + `/corpus/${collectionKey}/${languageKey}_${fileKey}.txt.gz`;
    return ('caches' in self ? caches.open(cacheVersion)
    .then((cache) => cache.match(url).then(res => res
      ?? cache.add(url).then(() => cache.match(url)).then(res => res
        ?? fetch(url))))
    .catch(() => fetch(url)) : fetch(url))
    .catch((err) => {
      console.error(err);
      notify('network');
      return null;
    })
    .then((res) => res === null ? '' :
      res.blob().then((blob) => new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()))
    .then(preprocessString);
  }

  const re = params.regex ? new RegExp(params.query, params.caseInsensitive ? 'sui' : 'su') : null;
  const matchCondition = (line: string): boolean => {
    return (params.regex && re !== null && convertWhitespace(line).match(re) !== null)
      || (!params.regex && !params.caseInsensitive && line.includes(params.query))
      || (!params.regex && params.caseInsensitive && (line.toLowerCase().includes(params.query.toLowerCase()) || line.toUpperCase().includes(params.query.toUpperCase())));
  };

  try {
    // Load files
    const filePromises = languages.map((languageKey) => getFileFromCache(collectionKey, languageKey, fileKey).then((data) => [languageKey, data] as [string, string]));
    filePromises.forEach((promise) => promise.then(() => notify('loading')).catch(() => {})); // for progress bar

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
      return [languageKey, lineKeys, lines] as [string, number[], string[]];
    }));
    processingFilePromises.forEach((promise) => promise.then(() => notify('processing')).catch(() => {})); // for progress bar

    // Filter only the lines that matched
    Promise.all(processingFilePromises).then((processedFiles) => {
      const languageKeys: string[] = [];
      const lineKeysSet: Set<number> = new Set();
      const fileData: string[][] = [];

      processedFiles.forEach(([languageKey, lineKeys, lines]) => {
        languageKeys.push(languageKey);
        lineKeys.forEach((i) => lineKeysSet.add(i));
        fileData.push(lines);
      });

      const fileResults: string[][] = [];
      Array.from(lineKeysSet).sort((a, b) => a - b).forEach((i) => fileResults.push(fileData.map((lines) => postprocessString(lines[i] ?? ''))));
      notify('done', {
        collection: collectionKey,
        file: fileKey,
        languages: languageKeys,
        lines: fileResults,
      });
    })
    .catch((err) => {
      console.error(err);
      notify('error');
    });
  }
  catch (err) {
    console.error(err);
    notify('error');
  }
};
