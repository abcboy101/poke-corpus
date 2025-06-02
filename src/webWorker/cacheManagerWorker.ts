import { CollectionKey, deserializeCorpus, SerializedCorpus } from '../utils/corpus';
import { getLoader } from '../utils/loader';

export type RequestedCollection = CollectionKey | 'cacheAll' | 'background';
export type CacheManagerStatus = 'done' | 'error' | 'loading';
export interface CacheManagerParams {
  readonly serializedCorpus: SerializedCorpus,
  readonly requestedCollection: RequestedCollection,
};
export interface CacheManagerResult {
  readonly status: CacheManagerStatus,
  readonly loadedBytes: number,
  readonly totalBytes: number,
  readonly requestedCollection: RequestedCollection,
};

self.onmessage = async (message: MessageEvent<CacheManagerParams>) => {
  const updateStatus = (result: CacheManagerResult) => { postMessage(result); };
  const { serializedCorpus, requestedCollection } = message.data;
  try {
    if (import.meta.env.DEV) {
      console.debug('Caching worker started');
    }

    // Deserialize corpus and loader
    const corpus = deserializeCorpus(serializedCorpus);
    const loader = getLoader(corpus);

    // Get the URLs of all the files to be cached
    const collections = (requestedCollection === 'cacheAll' || requestedCollection === 'background') ? corpus.entries
      : corpus.entries.filter(([collectionKey]) => collectionKey === requestedCollection);
    const filePaths = collections.flatMap(([collectionKey, collection]) =>
      collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
        loader.getFilePath(collectionKey, languageKey, fileKey)
      ))
    );

    // Calculate and report the total size in bytes
    let loadedBytes = 0;
    const totalBytes = filePaths.reduce((acc, path) => acc + loader.getFileSize(path), 0);
    updateStatus({status: 'loading', loadedBytes, totalBytes, requestedCollection});

    // Load the files and save them to the cache
    const [cache, db] = await Promise.all([loader.getCache(), loader.getIndexedDB()] as const);
    await Promise.all(filePaths.map((filePath) => loader.getFile(cache, db, filePath)
      .then(() => {
        loadedBytes += loader.getFileSize(filePath);
        updateStatus({status: 'loading', loadedBytes, totalBytes, requestedCollection});
        if (import.meta.env.DEV) {
          console.debug(`Loaded ${loadedBytes}/${totalBytes}`);
        }
      })
    ));
    db.close();

    // Send results once all done
    updateStatus({status: 'done', loadedBytes, totalBytes, requestedCollection});
    console.debug('Caching worker complete');
  }
  catch (err) {
    console.error(err);
    updateStatus({status: 'error', loadedBytes: 0, totalBytes: 0, requestedCollection});
    console.debug('Caching worker error');
  }
};
