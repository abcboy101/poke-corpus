import corpus from './i18n/corpus.json'

export type SearchParams = {
  query: string,
  regex: boolean,
  caseInsensitive: boolean,
  common: boolean,
  script: boolean,
  collections: string[],
  languages: string[]
};

export type SearchResults = {
  complete: boolean,
  status: string,
  progress: number,
  resultsLanguages: string[][],
  results: [string, string, string[][]][]
};

const cacheVersion = "v1";

/**
 * Attempts the following, in order:
 * - Retrieving the file from the cache
 * - Populating the cache with the file
 * - Fetching the file directly
 *
 * Returns a promise of the text of the file.
 */
function getFileFromCache(collectionKey: string, languageKey: string, fileKey: string) {
  const url = process.env.PUBLIC_URL + `/corpus/${collectionKey}/${languageKey}_${fileKey}.txt`;
  return caches.open(cacheVersion)
  .then((cache) => cache.match(url).then(res => res
    ?? cache.add(url).then(() => cache.match(url)).then(res => res
      ?? fetch(url))))
  .catch(() => fetch(url))
  .then((res) => res.text())
  .then(preprocessString);
}

/**
 * Converts private use characters to the corresponding Unicode characters.
 *
 * Returns the resulting string.
 */
function preprocessString(s: string) {
  return (s
    .replaceAll('\t', '')
    .replaceAll('\u2469', 'ᵉʳ') // Gen 5 superscript er
    .replaceAll('\u246A', 'ʳᵉ') // Gen 5 superscript re
    .replaceAll('\u246B', 'ʳ') // Gen 5 superscript r
    .replaceAll('\u2485', 'ᵉ') // Gen 5 superscript e
    .replaceAll('\uE08A', 'ᵉʳ') // 3DS superscript er
    .replaceAll('\uE08B', 'ʳᵉ') // 3DS superscript re
    .replaceAll('\uE08C', 'ʳ') // 3DS superscript r
    .replaceAll('\uE0A6', 'ᵉ') // 3DS superscript e
  );
}

/**
 * Converts the provided string to HTML by escaping `<` and `>`,
 * replacing line break control characters such as  `\n` with `<br>`,
 * and converting the ruby syntax `{base|ruby}` to the corresponding HTML tags.
 *
 * Returns the resulting HTML string.
 */
function postprocessString(s: string) {
  return s.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll(/\\r\\n|\\c\\n|\\n/g, '<br>')
    .replaceAll(/\\r|\\c/g, '<br>')
    .replaceAll('\u2486', '<sup>P</sup><sub>K</sub>') // Gen 5 PK
    .replaceAll('\u2487', '<sup>M</sup><sub>N</sub>') // Gen 5 MN
    .replaceAll('\uE0A7', '<sup>P</sup><sub>K</sub>') // 3DS PK
    .replaceAll('\uE0A8', '<sup>M</sup><sub>N</sub>') // 3DS MN
    .replaceAll(/\{([^|}]+)\|([^|}]+)\}/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>'); // Switch furigana
}

const progressPortionLoading = 0.49;
const progressPortionProcessing = 0.49;
const progressPortionCollecting = 0.01; // 0.01 for rendering

function updateStatusInProgress(status: string, loadingProgress: number, processingProgress: number, collectingProgress: number) {
  const progress = loadingProgress * progressPortionLoading + processingProgress * progressPortionProcessing + collectingProgress * progressPortionCollecting;
  const message: SearchResults = {
    complete: false,
    status: status,
    progress: progress,
    resultsLanguages: [],
    results: []
  };
  postMessage(message);
}

function updateStatusComplete(status: string, resultsLanguages: string[][] = [], results: [string, string, string[][]][] = []) {
  const message: SearchResults = {
    complete: true,
    status: status,
    progress: 1.0,
    resultsLanguages: resultsLanguages,
    results: results
  };
  postMessage(message);
}

/* eslint-disable no-restricted-globals */
self.onmessage = (message: MessageEvent<SearchParams>) => {
  try {
    const params = message.data;
    updateStatusInProgress('loading', 0, 0, 0);

    // Clear old caches
    caches.keys().then((keyList) => Promise.all(keyList.filter((key) => key !== cacheVersion).map((key) => caches.delete(key))));


    // Load files
    const loadingPromises: [string, string, Promise<[string, string]>[]][] = [];
    const loadingPromisesIndividual: Promise<[string, string]>[] = []; // for progress bar
    params.collections.forEach((collectionKey) => {
      const collection = corpus.collections[collectionKey as keyof typeof corpus.collections];

      // Do not process collection if it does not include any language being searched
      if (params.languages.every((languageKey) => !collection.languages.includes(languageKey))) {
        return;
      }

      // Load all files in all languages in the collection
      collection.files
      .filter((fileKey) => !((fileKey === 'common' && !params.common) || (fileKey === 'script' && !params.script)))
      .forEach((fileKey) => {
        const loadingFilePromises = collection.languages.map((languageKey) => getFileFromCache(collectionKey, languageKey, fileKey).then((data) => [languageKey, data] as [string, string]));
        loadingFilePromises.forEach((promise) => loadingPromisesIndividual.push(promise)); // for progress bar
        loadingPromises.push([collectionKey, fileKey, loadingFilePromises] as [string, string, Promise<[string, string]>[]]);
      });
    });


    // Process files
    const re = params.regex ? new RegExp(params.query, params.caseInsensitive ? 'ui' : 'u') : null;
    const matchCondition = (line: string): boolean => {
      return (params.regex && re !== null && line.match(re) !== null)
        || (!params.regex && !params.caseInsensitive && line.includes(params.query))
        || (!params.regex && params.caseInsensitive && (line.toLowerCase().includes(params.query.toLowerCase()) || line.toUpperCase().includes(params.query.toUpperCase())));
    }

    const processingPromisesIndividual: Promise<[string, number[], string[]]>[] = []; // for progress bar
    const processingPromises: Promise<[string, string, string[], string[][]]>[] = loadingPromises.map(([collectionKey, fileKey, filePromises]) => {
      // Check selected languages for lines that satisfy the query
      const processingFilePromises = filePromises.map((promise) => promise.then(([languageKey, data]) => {
        const lines = data.split(/\r\n|\n/);
        const lineKeys: number[] = [];
        if (params.languages.includes(languageKey)) {
          lines.forEach((line, i) => {
            if (matchCondition(line)) {
              lineKeys.push(i);
            }
          });
        }
        return [languageKey, lineKeys, lines] as [string, number[], string[]];
      }));
      processingFilePromises.forEach((promise) => processingPromisesIndividual.push(promise)); // for progress bar

      // Filter only the lines that matched
      return Promise.all(processingFilePromises).then((processedFiles) => {
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
        return [collectionKey, fileKey, languageKeys, fileResults];
      });
    });


    // Update progress bar as each file is loaded/processed
    let loadedCount = 0;
    let processedCount = 0;
    let collectedCount = 0;

    loadingPromisesIndividual.forEach((promise) => {
      promise.then(() => {
        loadedCount++;
        updateStatusInProgress('loading', loadedCount/loadingPromisesIndividual.length, processedCount/processingPromisesIndividual.length, collectedCount/processingPromises.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.log(`Loaded ${loadedCount}/${loadingPromisesIndividual.length}`);
        }
      });
    })

    processingPromisesIndividual.forEach((promise) => {
      promise.then(() => {
        processedCount++;
        updateStatusInProgress('processing', loadedCount/loadingPromisesIndividual.length, processedCount/processingPromisesIndividual.length, collectedCount/processingPromises.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.log(`Processed ${processedCount}/${processingPromisesIndividual.length}`);
        }
      });
    })


    // Collect results
    Promise.all(processingPromises).then((processingResults) => {
      const resultsLanguages: string[][] = [];
      const results: [string, string, string[][]][] = [];
      processingResults.forEach(([collectionKey, fileKey, languageKeys, fileResults], collectedCount) => {
        resultsLanguages.push(languageKeys);
        results.push([collectionKey, fileKey, fileResults]);
        collectedCount++;
        updateStatusInProgress('collecting', loadedCount/loadingPromisesIndividual.length, processedCount/processingPromisesIndividual.length, collectedCount/processingPromises.length);
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
          console.log(`Collected ${collectedCount}/${processingPromises.length}`);
        }
      });
      updateStatusComplete('done', resultsLanguages, results);
    })
    .catch((err) => {
      console.error(err);
      updateStatusComplete('error');
    });
  }
  catch (err) {
    console.error(err);
    updateStatusComplete('error');
  }
};
