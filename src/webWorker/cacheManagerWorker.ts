import { corpus } from '../utils/corpus';
import { getCache, getFile, getFilePath, getFileSize, getIndexedDB } from '../utils/files';

export type CacheManagerStatus = 'done' | 'error' | 'loading';
export type CacheManagerParams = string | null;
export type CacheManagerResult = [CacheManagerStatus, number, number, CacheManagerParams];

self.onmessage = async (message: MessageEvent<CacheManagerParams>) => {
  const updateStatus = (result: CacheManagerResult) => postMessage(result);
  try {
    if (import.meta.env.DEV) {
      console.debug('Caching worker started');
    }

    // Get the URLs of all the files to be cached
    const collections = (message.data === null) ? Object.entries(corpus.collections).reverse()
      : Object.entries(corpus.collections).filter(([collectionKey]) => collectionKey === message.data);
    const filePaths = collections.flatMap(([collectionKey, collection]) =>
      collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
        getFilePath(collectionKey, languageKey, fileKey)
      ))
    );

    // Calculate and report the total size in bytes
    const totalBytes = filePaths.reduce((acc, path) => acc + getFileSize(path), 0);
    updateStatus(['loading', 0, totalBytes, message.data]);

    // Load the files and save them to the cache
    let loadedBytes = 0;
    const cache = await getCache();
    const db = await getIndexedDB();
    await Promise.all(filePaths.map((filePath) => getFile(cache, db, filePath)
      .then((res) => {
        res.blob();
        loadedBytes += getFileSize(filePath);
        updateStatus(['loading', loadedBytes, totalBytes, message.data]);
        if (import.meta.env.DEV) {
          console.debug(`Loaded ${loadedBytes}/${totalBytes}`);
        }
      })
    ));
    db.close();

    // Send results once all done
    updateStatus(['done', totalBytes, totalBytes, message.data]);
    console.debug('Caching worker complete');
  }
  catch (err) {
    console.error(err);
    updateStatus(['error', 0, 0, message.data]);
    console.debug('Caching worker error');
  }
};
