import { corpus, cacheVersion, getCachedFile, getFileUrl } from './corpus';

/* eslint-disable no-restricted-globals */
self.onmessage = (message: MessageEvent<null>) => {
  try {
    if (import.meta.env.DEV) {
      console.debug('Caching worker started');
    }

    self.caches.open(cacheVersion).then((cache) =>
      Promise.all(Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
        collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
          getCachedFile(cache, getFileUrl(collectionKey, languageKey, fileKey))
            .then((res) => res.blob())
        ))
      ))
    ).then(() => {
      postMessage(true);
      console.debug('Caching worker complete');
    }).catch((err) => {
      console.error(err);
      postMessage(false);
      console.debug('Caching worker error');
    })
  }
  catch (err) {
    console.error(err);
    postMessage(false);
    console.debug('Caching worker error');
  }
}
