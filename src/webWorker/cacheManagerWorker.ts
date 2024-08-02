import { corpus } from './corpus';
import { cacheName, getFile, getFilePath } from './fileInfo';

/* eslint-disable no-restricted-globals */
self.onmessage = async (message: MessageEvent<string | null>) => {
  try {
    if (import.meta.env.DEV) {
      console.debug('Caching worker started');
    }

    const collections = (message.data === null) ? Object.entries(corpus.collections).reverse() :
      Object.entries(corpus.collections).filter(([collectionKey]) => collectionKey === message.data);
    const cache = await self.caches.open(cacheName);
    for (const [collectionKey, collection] of collections) {
      await Promise.all(
        collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
          getFile(cache, getFilePath(collectionKey, languageKey, fileKey)).then((res) => res.blob())
        )));
    }
    postMessage([true, message.data]);
    console.debug('Caching worker complete');
  }
  catch (err) {
    console.error(err);
    postMessage([false, message.data]);
    console.debug('Caching worker error');
  }
}
