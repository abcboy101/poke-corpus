import { CollectionKey, corpusEntries } from '../utils/corpus';
import { getCache, getFile, getFilePath, getFileSize, getIndexedDB } from '../utils/files';

export type CacheManagerStatus = 'done' | 'error' | 'loading';
export type CacheManagerParams = CollectionKey | null;
export interface CacheManagerResult {
  readonly status: CacheManagerStatus,
  readonly loadedBytes: number,
  readonly totalBytes: number,
  readonly params: CacheManagerParams,
};

self.onmessage = async (message: MessageEvent<CacheManagerParams>) => {
  const updateStatus = (result: CacheManagerResult) => { postMessage(result); };
  const params = message.data;
  try {
    if (import.meta.env.DEV) {
      console.debug('Caching worker started');
    }

    // Get the URLs of all the files to be cached
    const collections = (params === null) ? corpusEntries
      : corpusEntries.filter(([collectionKey]) => collectionKey === params);
    const filePaths = collections.flatMap(([collectionKey, collection]) =>
      collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
        getFilePath(collectionKey, languageKey, fileKey)
      ))
    );

    // Calculate and report the total size in bytes
    let loadedBytes = 0;
    const totalBytes = filePaths.reduce((acc, path) => acc + getFileSize(path), 0);
    updateStatus({status: 'loading', loadedBytes, totalBytes, params});

    // Load the files and save them to the cache
    const cache = await getCache();
    const db = await getIndexedDB();
    await Promise.all(filePaths.map((filePath) => getFile(cache, db, filePath)
      .then(() => {
        loadedBytes += getFileSize(filePath);
        updateStatus({status: 'loading', loadedBytes, totalBytes, params});
        if (import.meta.env.DEV) {
          console.debug(`Loaded ${loadedBytes}/${totalBytes}`);
        }
      })
    ));
    db.close();

    // Send results once all done
    updateStatus({status: 'done', loadedBytes, totalBytes, params});
    console.debug('Caching worker complete');
  }
  catch (err) {
    console.error(err);
    updateStatus({status: 'error', loadedBytes: 0, totalBytes: 0, params});
    console.debug('Caching worker error');
  }
};
