import 'compression-streams-polyfill';
import corpus, { codeId } from '../utils/corpus';
import { getCache, getFile, getFilePath, getFileRemote, getIndexedDB } from '../utils/files';
import SearchWorker from "./searchWorker.ts?worker";
import { SearchTaskParams } from '../utils/searchParams';
import { SearchTask, SearchTaskResult, SearchTaskResultComplete, SearchTaskResultLines } from './searchWorker';
import { SearchResultsInProgress, SearchResultsComplete, SearchResultsStatus } from '../utils/Status';
import { isBooleanQueryValid, parseWhereClause } from './searchBoolean';
import { isValidRegex } from '../utils/utils';

declare global {
  interface Window {
    /**
     * Cache for loaded files that is shared between queries.
     */
    memoryCache: Map<string, WeakRef<Promise<string>>>,
  }
}

export interface SearchResultLines extends SearchTaskResultLines {
  readonly displayHeader: boolean,
}

export interface SearchResults {
  readonly complete: boolean,
  readonly status: SearchResultsStatus,
  readonly progress: number,
  readonly showId: boolean,
  readonly richText: boolean,
  readonly results: readonly SearchResultLines[],
}

type SearchTaskPartial = Omit<SearchTask, "files" | "speakerFiles">;

/** Returns a promise for the text of the file if it is cached in memory, or undefined if it has not been cached or has been evicted. */
const memoryCacheGet = (path: string) => self.memoryCache.get(path)?.deref();

/** Adds the promise for the text of the file to the in-memory cache. */
const memoryCacheSet = (path: string, value: Promise<string>) => self.memoryCache.set(path, new WeakRef(value));

/** Returns true if the file is cached in memory, or false otherwise. */
const isMemoryCached = (collectionKey: string, languageKey: string, fileKey: string): boolean => {
  const path = getFilePath(collectionKey, languageKey, fileKey);
  return memoryCacheGet(path) !== undefined;
};

/**
 * Attempts the following, in order:
 * - Getting the data from the in-memory cache in the worker's global scope
 * - Retrieving the file from cache storage
 * - Fetching the file directly from the server
 *
 * Returns a promise for the text of the file.
 */
const loadFile = async (collectionKey: string, languageKey: string, fileKey: string): Promise<string> => {
  const path = getFilePath(collectionKey, languageKey, fileKey);
  const memoryCached = memoryCacheGet(path);
  if (memoryCached) {
    return memoryCached;
  }

  let res: Response | null;
  try {
    if (import.meta.env.DEV) {
      console.debug(`Loading ${path}`);
    }

    if ('caches' in self && 'indexedDB' in self && 'databases' in self.indexedDB) {
      // Retrieve from cache storage
      const cache = await getCache();
      const db = await getIndexedDB();
      res = await getFile(cache, db, path);
      db.close();
    }
    else {
      // Can't access cache storage or indexedDB, download file from the server
      res = await getFileRemote(path);
    }
  }
  catch (err) {
    // Couldn't download it from the server
    console.error(err);
    return '';
  }

  // Due to a bug, the Vite dev server serves .gz files with `Content-Encoding: gzip`.
  // To work around this, don't bother decompressing the file in the dev environment.
  // https://github.com/vitejs/vite/issues/12266
  let stream = (await res.blob()).stream();
  if (!import.meta.env.DEV) {
    stream = stream.pipeThrough(new DecompressionStream('gzip'));
  }

  const text = new Response(stream).text();
  memoryCacheSet(path, text);
  return text;
};

self.onmessage = (message: MessageEvent<SearchTaskParams>) => {
  const params = message.data;
  if (self.memoryCache === undefined) {
    self.memoryCache = new Map();
  }

  const showId = params.showAllLanguages || params.languages.includes(codeId);
  const richText = params.richText;

  let progressPortionLoading = 0.5;
  let progressPortionProcessing = 0.5;
  let progressPortionCollecting = 0.0;

  const updateStatusInProgress = (status: SearchResultsInProgress, loadingProgress: number, processingProgress: number, collectingProgress: number) => {
    const progress = (loadingProgress * progressPortionLoading) + (processingProgress * progressPortionProcessing) + (collectingProgress * progressPortionCollecting);
    const message: SearchResults = {
      complete: false,
      status: status,
      progress: progress,
      showId: showId,
      richText: richText,
      results: [],
    };
    postMessage(message);
  };

  const updateStatusComplete = (status: SearchResultsComplete, results: readonly SearchResultLines[] = []) => {
    const message: SearchResults = {
      complete: true,
      status: status,
      progress: 1.0,
      showId: showId,
      richText: richText,
      results: results,
    };
    postMessage(message);
  };

  try {
    updateStatusInProgress('loading', 0, 0, 0);

    // Ensure the regex is valid.
    // If it's invalid, return with that error immediately.
    if (params.type === 'regex' && !isValidRegex(params.query)) {
      updateStatusComplete('regex');
      return;
    }

    // Ensure the boolean expression is valid.
    // If it's invalid, return with that error immediately.
    if (params.type === 'boolean') {
      // Check for WHERE clause
      let paramsModified = params;
      const whereClause = parseWhereClause(params.query);
      if (whereClause) {
        const [, query, languageKey1, , languageKey2] = whereClause;
        if (!corpus.languages.includes(languageKey1) || !corpus.languages.includes(languageKey2)) {
          // Language is invalid
          updateStatusComplete('boolean.where');
          return;
        }
        paramsModified = {...params, query: query};
      }

      const result = isBooleanQueryValid(paramsModified.query, paramsModified.caseInsensitive);
      if (result !== 'success' && !(whereClause && result === 'empty')) {
        updateStatusComplete(`boolean.${result}`);
        return;
      }
    }

    // Load files
    let taskCount = 0;
    let cachedCount = 0;
    const taskList: SearchTaskPartial[] = [];
    Object.entries(corpus.collections).forEach(([collectionKey, collection]) => {
      // Do not process collection if it it does not need to be searched
      if (!params.collections.includes(collectionKey))
        return;

      // Do not process collection if it does not include any language being searched
      if (!params.languages.some((languageKey) => collection.languages.includes(languageKey))) {
        return;
      }

      // Load all files in all needed languages in the collection
      const commonKeys = ['common', 'messages', 'ui'];
      const scriptKeys = ['script', 'talk'];
      const languages = (collection.structured && params.showAllLanguages) ? collection.languages : collection.languages.filter((languageKey) => params.languages.includes(languageKey) || languageKey === codeId);
      collection.files.forEach((fileKey) => {
        if ((!params.common && commonKeys.includes(fileKey)) || (!params.script && scriptKeys.includes(fileKey)))
          return;

        if (!collection.structured) {
          languages.forEach((languageKey, languageIndex) => {
            taskList.push({
              index: taskCount + languageIndex,
              params: params,
              collectionKey: collectionKey,
              fileKey: fileKey,
              languages: [languageKey],
            });
          });
        }
        else {
          taskList.push({
            index: taskCount,
            params: params,
            collectionKey: collectionKey,
            fileKey: fileKey,
            languages: languages,
            speaker: collection?.speaker,
            literals: collection?.literals,
          });
        }
        taskCount += languages.length;
        cachedCount += languages.reduce((acc, languageKey) => acc + +isMemoryCached(collectionKey, languageKey, fileKey), 0);
      });
    });
    // Check if the combination of collections/languages yielded no files.
    // If it did, return with that error immediately.
    if (taskList.length === 0) {
      updateStatusComplete('noMatch');
      return;
    }

    // Adjust progress bar portions
    if (cachedCount > 0) {
      progressPortionLoading *= (taskCount - cachedCount) / taskCount;
      progressPortionProcessing *= (1 - progressPortionLoading) / (progressPortionProcessing + progressPortionCollecting);
      progressPortionCollecting *= (1 - progressPortionLoading) / (progressPortionProcessing + progressPortionCollecting);
    }

    // Initialize helpers
    let loadedCount = 0;
    let processedCount = 0;
    let collectedCount = 0;
    const calculateProgress = () => [loadedCount / taskCount, processedCount / taskCount, collectedCount / taskList.length] as const;
    const updateProgressLoaded = (file: string) => {
      loadedCount++;
      updateStatusInProgress('loading', ...calculateProgress());
      if (import.meta.env.DEV) {
        console.debug(`Loaded ${loadedCount}/${taskCount}`);
      }
      return file;
    };
    const updateProgressProcessed = () => {
      processedCount++;
      updateStatusInProgress('processing', ...calculateProgress());
      if (import.meta.env.DEV) {
        console.debug(`Processed ${processedCount}/${taskCount}`);
      }
    };
    const updateProgressCollected = () => {
      collectedCount++;
      updateStatusInProgress('collecting', ...calculateProgress());
      if (import.meta.env.DEV) {
        console.debug(`Collected ${collectedCount}/${taskList.length}`);
      }
    };

    let helperError = false;
    let networkError = false;
    const taskResults: SearchTaskResultComplete[] = [];
    const helpers: Worker[] = [];
    const helperOnMessage = (e: MessageEvent<SearchTaskResult>) => {
      // Another helper had an error, no need to process the message
      if (helperError)
        return;

      // Handle message
      const result = e.data;
      if (result.status === 'processing') {
        updateProgressProcessed();
      }
      else if (result.status === 'done') {
        taskResults.push(result);
        updateProgressCollected();

        // Send results if all tasks are done
        if (collectedCount === taskList.length) {
          const results: SearchResultLines[] = [];
          taskResults.sort((a, b) => a.index - b.index);
          let lastCollection = '';
          let lastFile = '';
          taskResults.forEach(({result}) => {
            if (result.lines.length === 0)
              return;
            results.push({...result, displayHeader: result.collection !== lastCollection || result.file !== lastFile});
            lastCollection = result.collection;
            lastFile = result.file;
          });

          // Raise network error if it occurred at the end here
          updateStatusComplete(networkError ? 'network' : 'done', results);
          helpers.forEach((helper) => helper.terminate());
        }
      }
      else { // error caught in searchWorker
        helperError = true;
        updateStatusComplete(result.status);
        helpers.forEach((helper) => helper.terminate());
      }
    };

    // Start helpers
    const numWorkers = Math.max(1, Math.min(taskList.length, (navigator.hardwareConcurrency || 4) - 2));
    for (let i = 0; i < numWorkers; i++) {
      const helper = new SearchWorker();
      helper.onmessage = helperOnMessage;
      helper.onerror = () => {
        // error not caught in searchWorker (such as stack overflow)
        if (!helperError) {
          helperError = true;
          updateStatusComplete('error');
          helpers.forEach((helper) => helper.terminate());
        }
      };
      helpers.push(helper);
    }
    taskList.forEach(async (task, i) => {
      // Due to a bug in Safari, access to cache storage fails in subworkers.
      // To work around this, we need to fetch the files in the manager worker instead.
      const speaker = task.speaker;
      const files = await Promise.all(task.languages.map((languageKey) =>
        loadFile(task.collectionKey, languageKey, task.fileKey).then(updateProgressLoaded)));
      const speakerFiles = speaker === undefined ? undefined : await Promise.all(task.languages.map((languageKey) =>
        loadFile(task.collectionKey, languageKey, speaker.file)));

      if (files.some((file) => file === '') || (speakerFiles && speakerFiles.some((file) => file === ''))) {
        // Network error occurred, but allow the search to continue
        // Partial results may still be useful even if incomplete
        networkError = true;
      }

      // Another helper had an error while loading, no need to continue
      if (helperError)
        return;

      // Start helper
      const taskFull: SearchTask = {
        ...task,
        files: files,
        speakerFiles: speakerFiles,
      };
      helpers[i % helpers.length].postMessage(taskFull);
    });
  }
  catch (err) {
    console.error(err);
    updateStatusComplete('error');
  }
};
