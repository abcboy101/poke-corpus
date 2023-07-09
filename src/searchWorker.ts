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
  filename: string,
  resultsLanguages: string[][],
  results: string[][][]
};

function postProcess(s: string) {
  return s.replaceAll(/\\r\\n|\\c\\n|\\n/g, '\n').replaceAll(/\\r|\\c|\\l|\\x25BD/g, '\n').trimStart();
}

/* eslint-disable no-restricted-globals */
self.onmessage = (message: MessageEvent<SearchParams>) => {
  const params = message.data;
  const re = params.regex ? new RegExp(params.query, params.caseInsensitive ? 'ui' : 'u') : null;

  let corpusPromises: Promise<[string[], Set<number>, string[][]]>[] = [];

  params.collections.forEach((collectionKey) => {
    const collection = corpus.collections[collectionKey as keyof typeof corpus.collections];
    collection.files.forEach((fileKey) => {
      postMessage({
        complete: false,
        status: 'loading',
        filename: `${collectionKey}_${fileKey}`,
        resultsLanguages: [],
        results: []
      });

      if (fileKey === 'common' && !params.common) {
        return;
      }
      if (fileKey === 'script' && !params.script) {
        return;
      }

      let collectionPromises: Promise<[[string, string[]], number[]]>[] = [];
      collection.languages.forEach((languageKey) => {
        postMessage({
          complete: false,
          status: 'loading',
          filename: `${collectionKey}_${languageKey}_${fileKey}`,
          resultsLanguages: [],
          results: []
        });

        const url = `/poke-corpus/corpus/${collectionKey}/${languageKey}_${fileKey}.txt`;
        collectionPromises.push(
          caches.open("v1")
          .then((cache) => cache.match(url)
            .then(res => res ?? fetch(url).then((res) => cache.put(url, res).then(() => cache.match(url).then((res) => res ?? fetch(url))))))
          .catch(() => fetch(url))
          .then((res) => res.text())
          .then((data) => {
            const lines = data.split(/\r\n|\n/);
            let lineKeys: number[] = [];

            postMessage({
              complete: false,
              status: 'processing',
              filename: `${collectionKey}_${languageKey}_${fileKey}`,
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

            postMessage({
              complete: false,
              status: `processingDone`,
              filename: `${collectionKey}_${languageKey}_${fileKey}`,
              resultsLanguages: [],
              results: []
            });

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

        return [languageKeys, lineKeys, fileData];
      }));
    });
  });

  let resultsLanguages: string[][] = [];
  let results: string[][][] = [];
  Promise.all(corpusPromises).then((corpusResults) => corpusResults.forEach(([languageKeys, lineKeys, fileData]) => {
    let fileResults: string[][] = [];
    Array.from(lineKeys).sort().forEach((i) => {
      const lineResults = fileData.map((lines) => postProcess(lines[i] ?? ''));
      fileResults.push(lineResults);
    });
    resultsLanguages.push(languageKeys);
    results.push(fileResults);
  })).then(() =>
    postMessage({
      complete: true,
      status: "done",
      filename: '',
      resultsLanguages: resultsLanguages,
      results: results
    })
  ).catch((err) => {
    console.error(err);
    postMessage({
      complete: true,
      status: "error",
      filename: '',
      resultsLanguages: [],
      results: []
    });
  });
};
