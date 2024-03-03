import corpus from './corpus';
import { SearchParams, SearchTask, SearchTaskResult, SearchTaskResultComplete, SearchTaskResultError } from './searchWorker';

export type SearchResultsInProgress = 'loading' | 'processing' | 'collecting';
export type SearchResultsError = SearchTaskResultError | 'noMatch';
export type SearchResultsComplete = 'done' | SearchResultsError;
export type SearchResultsStatus = SearchResultsInProgress | SearchResultsComplete;
export interface SearchResultLines {
  readonly collection: string,
  readonly file: string,
  readonly languages: readonly string[],
  readonly lines: readonly string[][],
  readonly displayHeader: boolean
};
export interface SearchResults {
  readonly complete: boolean,
  readonly status: SearchResultsStatus,
  readonly progress: number,
  readonly results: readonly SearchResultLines[]
};

/* eslint-disable no-restricted-globals */
self.onmessage = (message: MessageEvent<SearchParams>) => {
  const progressPortionLoading = 0.49;
  const progressPortionProcessing = 0.49;
  const progressPortionCollecting = 0.01; // 0.01 for rendering

  const updateStatusInProgress = (status: SearchResultsInProgress, loadingProgress: number, processingProgress: number, collectingProgress: number) => {
    const progress = loadingProgress * progressPortionLoading + processingProgress * progressPortionProcessing + collectingProgress * progressPortionCollecting;
    const message: SearchResults = {
      complete: false,
      status: status,
      progress: progress,
      results: []
    };
    postMessage(message);
  };

  const updateStatusComplete = (status: SearchResultsComplete, results: SearchResultLines[] = []) => {
    const message: SearchResults = {
      complete: true,
      status: status,
      progress: 1.0,
      results: results
    };
    postMessage(message);
  };

  try {
    const params = message.data;
    updateStatusInProgress('loading', 0, 0, 0);

    try {
      if (params.regex) {
        new RegExp(params.query, params.caseInsensitive ? 'ui' : 'u');
      }
    }
    catch (err) {
      console.error(err);
      updateStatusComplete('regex');
      return;
    }

    // Load files
    let taskCount = 0;
    const taskList: SearchTask[] = [];
    Object.keys(corpus.collections).filter((collectionKey) => params.collections.includes(collectionKey)).forEach((collectionKey) => {
      const collection = corpus.collections[collectionKey];

      // Do not process collection if it does not include any language being searched
      if (params.languages.every((languageKey) => !collection.languages.includes(languageKey))) {
        return;
      }

      // Load all files in all languages in the collection
      collection.files
      .filter((fileKey) => !((fileKey === 'common' && !params.common) || (fileKey === 'script' && !params.script)))
      .forEach((fileKey) => {
        const languages = collection.structured ? collection.languages : collection.languages.filter((languageKey) => params.languages.includes(languageKey));
        if (!collection.structured) {
          languages.forEach((languageKey) => {
            taskList.push({
              index: taskCount,
              params: params,
              collectionKey: collectionKey,
              fileKey: fileKey,
              languages: [languageKey]
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
            speaker: collection?.speaker
          });
        }
        taskCount += languages.length;
      });
    });
    if (taskList.length === 0) {
      updateStatusComplete('noMatch');
      return;
    }

    // Initialize helpers
    let loadedCount = 0;
    let processedCount = 0;
    let collectedCount = 0;
    const taskResults: SearchTaskResultComplete[] = [];
    const helpers: Worker[] = [];
    const helperOnMessage = (e: MessageEvent<SearchTaskResult>) => {
      const result = e.data;
      if (result.status === 'loading') {
        loadedCount++;
        updateStatusInProgress('loading', loadedCount/taskCount, processedCount/taskCount, collectedCount/taskList.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.debug(`Loaded ${loadedCount}/${taskCount}`);
        }
      }
      else if (result.status === 'processing') {
        processedCount++;
        updateStatusInProgress('processing', loadedCount/taskCount, processedCount/taskCount, collectedCount/taskList.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.debug(`Processed ${processedCount}/${taskCount}`);
        }
      }
      else if (result.status === 'done') {
        taskResults.push(result as SearchTaskResultComplete);
        collectedCount++;
        updateStatusInProgress('collecting', loadedCount/taskCount, processedCount/taskCount, collectedCount/taskList.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.debug(`Collected ${collectedCount}/${taskList.length}`);
        }

        // Send results
        if (collectedCount === taskList.length) {
          const results: SearchResultLines[] = [];
          taskResults.sort((a, b) => a.index - b.index);
          let lastCollection = '';
          let lastFile = '';
          taskResults.map((taskResults) => taskResults.result).filter(({lines}) => lines.length > 0).forEach((result) => {
            results.push({...result, displayHeader: result.collection !== lastCollection || result.file !== lastFile});
            lastCollection = result.collection;
            lastFile = result.file;
          });

          updateStatusComplete('done', results);
          helpers.forEach((helper) => helper.terminate());
        }
      }
      else { // error
        updateStatusComplete(result.status);
        helpers.forEach((helper) => helper.terminate());
      }
    }

    // Start helpers
    const numWorkers = Math.max(1, Math.min(taskList.length, (navigator.hardwareConcurrency || 4) - 2));
    for (let i = 0; i < numWorkers; i++) {
      const helper = new Worker(new URL("./searchWorker.ts", import.meta.url));
      helper.onmessage = helperOnMessage;
      helpers.push(helper);
    }
    taskList.forEach((task, i) => {
      helpers[i % helpers.length].postMessage(task);
    });
  }
  catch (err) {
    console.error(err);
    updateStatusComplete('error');
  }
};
