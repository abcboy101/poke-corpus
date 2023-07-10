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

function postProcess(s: string) {
  return s.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll(/\\r\\n|\\c\\n|\\n/g, '<br>')
    .replaceAll(/\\r|\\c|\\l|\\x25BD/g, '<br>')
    .replaceAll(/\{([^|}]+)\|([^|}]+)\}/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>')
    .trimStart();
}

const progressPortionLoading = 0.1;
const progressPortionProcessing = 0.8;
const progressPortionCollecting = 0.1;

/* eslint-disable no-restricted-globals */
self.onmessage = (message: MessageEvent<SearchParams>) => {
  const params = message.data;
  const re = params.regex ? new RegExp(params.query, params.caseInsensitive ? 'ui' : 'u') : null;

  let corpusPromises: Promise<[[string, string], string[], Set<number>, string[][]]>[] = [];
  let loadedCount = 0;
  const loadedTotal = params.collections.length;
  let processedCount = 0;
  const processedTotal = Object.entries(corpus.collections)
    .filter(([key, _]) => params.collections.includes(key))
    .map(([_, val]) => val.languages.length * val.files.length)
    .reduce((a, b) => a + b, 0);

  params.collections.forEach((collectionKey) => {
    const collection = corpus.collections[collectionKey as keyof typeof corpus.collections];
    loadedCount++;
    postMessage({
      complete: false,
      status: 'loading',
      progress: loadedCount/loadedTotal * progressPortionLoading,
      resultsLanguages: [],
      results: []
    });

    if (params.languages.every((languageKey) => !collection.languages.includes(languageKey))) {
      return;
    }
    collection.files.forEach((fileKey) => {
      if (fileKey === 'common' && !params.common) {
        return;
      }
      if (fileKey === 'script' && !params.script) {
        return;
      }

      let collectionPromises: Promise<[[string, string[]], number[]]>[] = [];
      collection.languages.forEach((languageKey) => {
        // postMessage({
        //   complete: false,
        //   status: 'loading',
        //   filename: `${collectionKey}_${languageKey}_${fileKey}`,
        //   resultsLanguages: [],
        //   results: []
        // });

        const url = process.env.PUBLIC_URL + `/corpus/${collectionKey}/${languageKey}_${fileKey}.txt`;
        collectionPromises.push(
          caches.open("v1")
          .then((cache) => cache.match(url)
            .then(res => res ?? fetch(url).then((res) => cache.put(url, res).then(() => cache.match(url).then((res) => res ?? fetch(url))))))
          .catch(() => fetch(url))
          .then((res) => res.text())
          .then((data) => {
            const lines = data.split(/\r\n|\n/);
            let lineKeys: number[] = [];

            processedCount++;
            postMessage({
              complete: false,
              status: 'processing',
              progress: progressPortionLoading + processedCount/processedTotal * progressPortionProcessing,
              resultsLanguages: [],
              results: []
            });

            if (params.languages.includes(languageKey)) {
              lines.forEach((line, i) => {
                if ((params.regex && re !== null && line.match(re))
                    || (!params.regex && !params.caseInsensitive && line.includes(params.query))
                    || (!params.regex && params.caseInsensitive && (line.toLowerCase().includes(params.query.toLowerCase()) || line.toUpperCase().includes(params.query.toUpperCase())))) {
                  lineKeys.push(i);
                }
              });
            }

            return [[languageKey, lines], lineKeys];
          }));
      });
      corpusPromises.push(Promise.all(collectionPromises).then((corpusResult) => {
        let languageKeys: string[] = [];
        let lineKeys: Set<number> = new Set();
        let fileData: string[][] = [];

        corpusResult.forEach(([[languageKeyResult, linesResult], lineKeysResult]) => {
          languageKeys.push(languageKeyResult);
          lineKeysResult.forEach((lineKey) => lineKeys.add(lineKey));
          fileData.push(linesResult);
        })

        return [[collectionKey, fileKey], languageKeys, lineKeys, fileData];
      }));
    });
  });

  let resultsLanguages: string[][] = [];
  let results: [string, string, string[][]][] = [];
  let collectedCount = 0;
  Promise.all(corpusPromises).then((corpusResults) => {
    return corpusResults;
  }).then((corpusResults) =>
    corpusResults.forEach(([[collectionKey, fileKey], languageKeys, lineKeys, fileData]) => {
      let fileResults: string[][] = [];

      collectedCount++;
      postMessage({
        complete: false,
        status: "collecting",
        progress: (progressPortionLoading + progressPortionProcessing) + collectedCount/corpusResults.length * progressPortionCollecting,
        resultsLanguages: [],
        results: []
      });

      Array.from(lineKeys).sort().forEach((i) => {
        const lineResults = fileData.map((lines) => postProcess(lines[i] ?? ''));
        fileResults.push(lineResults);
      });
      resultsLanguages.push(languageKeys);
      results.push([collectionKey, fileKey, fileResults]);
    })
  ).then(() =>
    postMessage({
      complete: true,
      status: "done",
      progress: 1.0,
      resultsLanguages: resultsLanguages,
      results: results
    })
  ).catch((err) => {
    console.error(err);
    postMessage({
      complete: true,
      status: "error",
      progress: 1.0,
      resultsLanguages: [],
      results: []
    });
  });
};
