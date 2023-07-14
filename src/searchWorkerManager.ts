import corpus from './i18n/corpus.json'
import { SearchParams, SearchTask, SearchTaskResult, SearchTaskResultError } from './searchWorker';

export type SearchResultsInProgress = 'loading' | 'processing' | 'collecting';
export type SearchResultsComplete = 'done' | SearchTaskResultError;
export type SearchResultsStatus = SearchResultsInProgress | SearchResultsComplete;

export interface SearchResults {
  complete: boolean,
  status: SearchResultsStatus,
  progress: number,
  resultsLanguages: string[][],
  results: [string, string, string[][], boolean][]
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
      resultsLanguages: [],
      results: []
    };
    postMessage(message);
  };

  const updateStatusComplete = (status: SearchResultsComplete, resultsLanguages: string[][] = [], results: [string, string, string[][], boolean][] = []) => {
    const message: SearchResults = {
      complete: true,
      status: status,
      progress: 1.0,
      resultsLanguages: resultsLanguages,
      results: results
    };
    postMessage(message);
  };

  try {
    const params = message.data;
    updateStatusInProgress('loading', 0, 0, 0);

    // Load files
    let taskCount = 0;
    const taskList: SearchTask[] = [];
    Object.keys(corpus.collections).filter((collectionKey) => params.collections.includes(collectionKey)).forEach((collectionKey) => {
      const collection = corpus.collections[collectionKey as keyof typeof corpus.collections];

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
            languages: languages
          });
        }
        taskCount += languages.length;
      });
    });

    // Initialize helpers
    let loadedCount = 0;
    let processedCount = 0;
    let collectedCount = 0;
    const taskResults: SearchTaskResult[] = [];
    const helpers: Worker[] = [];
    const helperOnMessage = (e: MessageEvent<SearchTaskResult>) => {
      const result = e.data;
      if (result.status === 'loading') {
        loadedCount++;
        updateStatusInProgress('loading', loadedCount/taskCount, processedCount/taskCount, collectedCount/taskList.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.log(`Loaded ${loadedCount}/${taskCount}`);
        }
      }
      else if (result.status === 'processing') {
        processedCount++;
        updateStatusInProgress('processing', loadedCount/taskCount, processedCount/taskCount, collectedCount/taskList.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.log(`Processed ${processedCount}/${taskCount}`);
        }
      }
      else if (result.status === 'done') {
        taskResults.push(result);
        collectedCount++;
        updateStatusInProgress('collecting', loadedCount/taskCount, processedCount/taskCount, collectedCount/taskList.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.log(`Collected ${collectedCount}/${taskList.length}`);
        }

        // Send results
        if (collectedCount === taskList.length) {
          const resultsLanguages: string[][] = [];
          const results: [string, string, string[][], boolean][] = [];
          taskResults.sort((a, b) => a.index - b.index);
          let lastCollectionKey = '';
          let lastFileKey = '';
          taskResults.forEach((taskResult) => {
            if (taskResult.resultLanguages !== undefined && taskResult.result !== undefined) {
              const [collectionKey, fileKey, fileResults] = taskResult.result;
              const displayHeader = collectionKey !== lastCollectionKey || fileKey !== lastFileKey;
              resultsLanguages.push(taskResult.resultLanguages);
              results.push([collectionKey, fileKey, fileResults, displayHeader]);
              lastCollectionKey = collectionKey;
              lastFileKey = fileKey;
            }
          });

          updateStatusComplete('done', resultsLanguages, results);
          helpers.forEach((helper) => helper.terminate());
        }
      }
      else { // error
        updateStatusComplete(result.status);
        helpers.forEach((helper) => helper.terminate());
      }
    }

    // Start helpers
    const numWorkers = Math.min(taskList.length, (navigator.hardwareConcurrency - 2) || 4);
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
