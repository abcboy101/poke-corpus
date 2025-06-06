import 'compression-streams-polyfill';
import { codeId, CollectionKey, LanguageKey, FileKey, deserializeCorpus, SerializedCorpus } from '../utils/corpus';
import { getLoader, Loader } from '../utils/loader';
import SearchWorker from "./searchWorker.ts?worker";
import { SearchParams } from '../utils/searchParams';
import { SearchTask, SearchTaskResult, SearchTaskResultComplete } from './searchWorker';
import { SearchResultsInProgress, SearchResultsComplete, SearchResultsStatus } from '../utils/Status';
import { isBooleanQueryValid, parseWhereClause } from './searchBoolean';
import { isValidRegex, Mutable } from '../utils/utils';

declare global {
  interface Window {
    /**
     * Cache for loaded files that is shared between queries.
     */
    memoryCache?: Map<string, WeakRef<Promise<string>>>,
  }
}

export interface SearchManagerParams extends SearchParams {
  readonly serializedCorpus: SerializedCorpus,
}

interface SearchManagerStatus {
  readonly complete: boolean,
  readonly status: SearchResultsStatus,
  readonly progress: number,
  readonly showId: boolean,
}

interface SearchManagerStatusWithResult extends SearchManagerStatus, Omit<SearchTaskResultComplete, "status"> {}

export type SearchManagerResponse = SearchManagerStatus | SearchManagerStatusWithResult;

type SearchTaskPartial = Omit<SearchTask, "files" | "speakerFiles">;

/** Returns a promise for the text of the file if it is cached in memory, or undefined if it has not been cached or has been evicted. */
const memoryCacheGet = (path: string) => self.memoryCache?.get(path)?.deref();

/** Adds the promise for the text of the file to the in-memory cache. */
const memoryCacheSet = (path: string, value: Promise<string>) => self.memoryCache?.set(path, new WeakRef(value));

/** Returns true if the file is cached in memory, or false otherwise. */
const isMemoryCached = (loader: Loader, collectionKey: CollectionKey, languageKey: LanguageKey, fileKey: FileKey): boolean => {
  const path = loader.getFilePath(collectionKey, languageKey, fileKey);
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
const loadFile = async (loader: Loader, collectionKey: CollectionKey, languageKey: LanguageKey, fileKey: FileKey): Promise<string> => {
  const path = loader.getFilePath(collectionKey, languageKey, fileKey);
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
      const [cache, db] = await Promise.all([loader.getCache(), loader.getIndexedDB()] as const);
      res = await loader.getFile(cache, db, path);
      db.close();
    }
    else {
      // Can't access cache storage or indexedDB, download file from the server
      res = await loader.getFileRemote(path);
    }

    if (res === null) {
      return '';
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

self.onmessage = async (message: MessageEvent<SearchManagerParams>) => {
  const params = message.data;
  self.memoryCache ??= new Map();

  const showId = params.showAllLanguages || params.languages.includes(codeId);

  let progressPortionLoading = 0.5;
  let progressPortionProcessing = 0.5;
  let progressPortionCollecting = 0.0;

  const updateStatusInProgress = (status: SearchResultsInProgress, loadingProgress: number, processingProgress: number, collectingProgress: number) => {
    const progress = (loadingProgress * progressPortionLoading) + (processingProgress * progressPortionProcessing) + (collectingProgress * progressPortionCollecting);
    const message: SearchManagerResponse = {
      complete: false,
      status: status,
      progress: progress,
      showId: showId,
    };
    postMessage(message);
  };

  const updateStatusWithResult = (status: SearchResultsInProgress, loadingProgress: number, processingProgress: number, collectingProgress: number, result: SearchTaskResultComplete) => {
    const progress = (loadingProgress * progressPortionLoading) + (processingProgress * progressPortionProcessing) + (collectingProgress * progressPortionCollecting);
    const message: SearchManagerResponse = {
      complete: false,
      status: status,
      progress: progress,
      showId: showId,
      index: result.index,
      result: result.result,
    };
    postMessage(message);
  };

  const updateStatusComplete = (status: SearchResultsComplete) => {
    const message: SearchManagerResponse = {
      complete: true,
      status: status,
      progress: 1.0,
      showId: showId,
    };
    postMessage(message);
  };

  try {
    updateStatusInProgress('loading', 0, 0, 0);

    // Deserialize corpus and loader
    const corpus = deserializeCorpus(params.serializedCorpus);
    const loader = getLoader(corpus);

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
        if (!corpus.isLanguageKey(languageKey1) || !corpus.isLanguageKey(languageKey2)) {
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
    let fileCount = 0;
    let cachedCount = 0;
    const taskList: SearchTaskPartial[] = [];
    corpus.entries.forEach(([collectionKey, collection]) => {
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
          languages.forEach((languageKey) => {
            taskList.push({
              index: taskCount,
              params: params,
              collectionKey: collectionKey,
              fileKey: fileKey,
              languages: [languageKey],
            });
            taskCount++;
          });
        }
        else {
          taskList.push({
            index: taskCount,
            params: params,
            collectionKey: collectionKey,
            fileKey: fileKey,
            languages: languages,
            speaker: collection.speaker,
            literals: collection.literals,
          });
          taskCount++;
        }
        fileCount += languages.length;
        cachedCount += languages.reduce((acc, languageKey) => acc + +isMemoryCached(loader, collectionKey, languageKey, fileKey), 0);
      });
    });
    // Check if the combination of collections/languages yielded no files.
    // If it did, return with that error immediately.
    if (taskCount === 0) {
      updateStatusComplete('noMatch');
      return;
    }

    // Adjust progress bar portions
    if (cachedCount > 0) {
      progressPortionLoading *= (fileCount - cachedCount) / fileCount;
      progressPortionProcessing *= (1 - progressPortionLoading) / (progressPortionProcessing + progressPortionCollecting);
      progressPortionCollecting *= (1 - progressPortionLoading) / (progressPortionProcessing + progressPortionCollecting);
    }

    // Initialize helpers
    let loadedCount = 0;
    let processedCount = 0;
    let collectedCount = 0;
    const calculateProgress = () => [loadedCount / fileCount, processedCount / fileCount, collectedCount / taskCount] as const;
    const updateProgressLoaded = (file: string) => {
      loadedCount++;
      updateStatusInProgress('loading', ...calculateProgress());
      if (import.meta.env.DEV) {
        console.debug(`Loaded ${loadedCount}/${fileCount}`);
      }
      return file;
    };
    const updateProgressProcessed = () => {
      processedCount++;
      updateStatusInProgress('processing', ...calculateProgress());
      if (import.meta.env.DEV) {
        console.debug(`Processed ${processedCount}/${fileCount}`);
      }
    };
    const updateProgressCollected = (result: SearchTaskResultComplete) => {
      collectedCount++;
      updateStatusWithResult('collecting', ...calculateProgress(), result);
      if (import.meta.env.DEV) {
        console.debug(`Collected ${collectedCount}/${taskCount}`);
      }
    };

    let helperError = false;
    let networkError = false;
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
        updateProgressCollected(result);
        if (collectedCount === taskCount) {
          // Raise network error if it occurred at the end here
          updateStatusComplete(networkError ? 'network' : 'done');
          helpers.forEach((helper) => { helper.terminate(); });
        }
      }
      else { // error caught in searchWorker
        helperError = true;
        updateStatusComplete(result.status);
        helpers.forEach((helper) => { helper.terminate(); });
      }
    };

    // Start helpers
    const numWorkers = Math.max(1, Math.min(taskCount, (navigator.hardwareConcurrency || 4) - 2));
    for (let i = 0; i < numWorkers; i++) {
      const helper = new SearchWorker();
      helper.onmessage = helperOnMessage;
      helper.onerror = () => {
        // error not caught in searchWorker (such as stack overflow)
        if (!helperError) {
          helperError = true;
          updateStatusComplete('error');
          helpers.forEach((helper) => { helper.terminate(); });
        }
      };
      helpers.push(helper);
    }
    await Promise.all(taskList.map(async (task, i) => {
      // Due to a bug in Safari, access to cache storage fails in subworkers.
      // To work around this, we need to fetch the files in the manager worker instead.
      const speaker = task.speaker;
      const files = await Promise.all(task.languages.map((languageKey) =>
        loadFile(loader, task.collectionKey, languageKey, task.fileKey).then(updateProgressLoaded)));
      const speakerFiles = speaker === undefined ? undefined : await Promise.all(task.languages.map((languageKey) =>
        loadFile(loader, task.collectionKey, languageKey, speaker.file)));

      // Another helper had an error while loading, no need to continue
      if (helperError)
        return;

      const taskFull: Mutable<SearchTask> = { ...task, files, speakerFiles };

      // Network error occurred, but allow the search to continue
      // Partial results may still be useful even if incomplete
      if (files.some((file) => file === '') || (speakerFiles?.some((file) => file === ''))) {
        networkError = true;

        // Remove files that didn't load from the task
        taskFull.languages = task.languages.filter((_, i) => files[i] !== '');
        taskFull.files = files.filter((_, i) => files[i] !== '');
        taskFull.speakerFiles = speakerFiles?.filter((_, i) => files[i] !== '');
        if (taskFull.speakerFiles?.some((file) => file === ''))
          taskFull.speaker = undefined;
      }

      // Start helper
      helpers[i % helpers.length].postMessage(taskFull);
    }));
  }
  catch (err) {
    console.error(err);
    updateStatusComplete('error');
  }
};
