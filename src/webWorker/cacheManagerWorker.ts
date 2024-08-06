import { corpus } from './corpus';
import { cacheName, getFile, getFilePath } from './fileInfo';

/* eslint-disable no-restricted-globals */
self.onmessage = (message: MessageEvent<string | null>) => {
  try {
    if (import.meta.env.DEV) {
      console.debug('Caching worker started');
    }

    const collections = (message.data === null) ? Object.entries(corpus.collections) :
      Object.entries(corpus.collections).filter(([collectionKey]) => collectionKey === message.data);
    self.caches.open(cacheName).then(async (cache) => {
      for (const [collectionKey, collection] of collections) {
        await Promise.all(
          collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
            getFile(cache, getFilePath(collectionKey, languageKey, fileKey)).then((res) => res.blob())
          )));
      }
    }).then(() => {
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
