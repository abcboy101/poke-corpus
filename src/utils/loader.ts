import { Dispatch, SetStateAction } from 'react';
import { CollectionKey, Corpus, CorpusSource, Metadata, getCorpus, getFilePath, isMetadata } from './corpus';

const cacheName = 'corpus';

const getFileURL = (path: string) => import.meta.env.BASE_URL + path;
const dataURL = getFileURL('data.json');

export const loaderFactory = (corpus: Corpus) => {
  //#region Metadata/Fetch
  /**
   * Returns the size of the text file.
   */
  const getFileSize = (path: string): number => {
    return getRemoteMetadata(path).size;
  };

  /**
   * Returns the size of the pending download, or 0 if already downloaded.
   */
  const getDownloadSize = async (db: IDBDatabase, path: string): Promise<number> => {
    const [remoteMetadata, localMetadata] = await getMetadata(db, path);

    // Cached file is up-to-date, no need to download
    if ((localMetadata?.hash === remoteMetadata.hash)) {
      return 0;
    }

    // Out-of-date or miss, need to download from remote
    return remoteMetadata.size;
  };

  /**
   * Returns the total size of the pending downloads, or 0 if already downloaded.
   */
  const getDownloadSizeTotal = async (collections: readonly CollectionKey[] = corpus.collections): Promise<number> => {
    try {
      const db = await getIndexedDB();
      const size = (await Promise.all(collections.flatMap((collectionKey) =>
        corpus.getCollection(collectionKey).languages.flatMap((languageKey) =>
          corpus.getCollection(collectionKey).files.map((fileKey) =>
            getDownloadSize(db, getFilePath(collectionKey, languageKey, fileKey))
          )
        )
      ))).reduce((a, b) => a + b, 0);
      db.close();
      return size;
    }
    catch {
      // Can't access cache storage or indexedDB, assume we'll need to download all files from the server
      return collections.flatMap((collectionKey) =>
        corpus.getCollection(collectionKey).languages.flatMap((languageKey) =>
          corpus.getCollection(collectionKey).files.map((fileKey) =>
            getFileSize(getFilePath(collectionKey, languageKey, fileKey))
          )
        )
      ).reduce((a, b) => a + b, 0);
    }
  };

  /**
   * Retrieves a file from the cache, if present and up-to-date, or the server otherwise.
   */
  const getFile = async (cache: Cache, db: IDBDatabase, path: string): Promise<Response | null> => {
    const url = getFileURL(path);

    const [remoteMetadata, localMetadata] = await getMetadata(db, path);

    // Use cached file if local hash is up-to-date, or if we are offline
    if ((localMetadata?.hash === remoteMetadata.hash) || (!navigator.onLine && localMetadata?.hash !== undefined)) {
      const local = await cacheMatch(cache, url);
      if (local !== undefined)
        return local;
    }

    // Out-of-date or miss, overwrite cached file and update local hash
    const remote = await fetch(url);
    if (remote.ok) {
      if (import.meta.env.DEV)
        console.debug(`Retrieved ${url} from the server`);
      await cachePut(cache, url, remote).then(async (success) => {
        if (success)
          await setLocalMetadata(db, path);
      });
      return remote;
    }

    // Server error, use cached file even if it is out-of-date
    const local = await cacheMatch(cache, url);
    return local ?? null;
  };

  /**
   * Retrieves a file from the cache, if present, and whether it is up-to-date.
   */
  const getFileCacheOnly = async (cache: Cache, db: IDBDatabase, path: string) => {
    // Try retrieving file from cache
    const url = getFileURL(path);
    const [remoteMetadata, localMetadata] = await getMetadata(db, path);
    if (localMetadata !== undefined)
      return [await cacheMatch(cache, url), (localMetadata.hash === remoteMetadata.hash)] as const;

    // No file is cached
    return [undefined, false] as const;
  };

  /**
   * Retrieves a file from the server.
   */
  const getFileRemote = async (path: string): Promise<Response | null> => {
    const url = getFileURL(path);
    const res = await fetch(url);
    return res.ok ? res : null;
  };
  //#endregion

  //#region Indexed DB
  const dbName = 'corpus';
  const dbObjectStore = 'files';
  const getIndexedDB = (): Promise<IDBDatabase> => {
    const request = indexedDB.open(dbName);
    return new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore(dbObjectStore);
        if (request.transaction !== null) {
          request.transaction.oncomplete = () => {
            console.log('Created object store');
          };
        }
      };
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(request.error!); }; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- in onerror
    });
  };

  const getRemoteMetadata = (path: string): Metadata => corpus.metadata[path];

  const getLocalMetadata = (db: IDBDatabase, path: string) => {
    const transaction = db.transaction([dbObjectStore], "readonly");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.get(path);
    return new Promise<Metadata | undefined>((resolve, reject) => {
      request.onsuccess = () => { resolve(isMetadata(request.result) ? request.result : undefined); };
      request.onerror = () => { reject(request.error!); }; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- in onerror
    });
  };

  const setLocalMetadata = (db: IDBDatabase, path: string): Promise<boolean> => {
    const transaction = db.transaction([dbObjectStore], "readwrite");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.put(getRemoteMetadata(path), path);
    return new Promise<boolean>((resolve, reject) => {
      request.onsuccess = () => { resolve(request.result === path); };
      request.onerror = () => { reject(request.error!); }; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- in onerror
    });
  };

  const deleteLocalMetadata = (db: IDBDatabase, path: string): Promise<boolean> => {
    const transaction = db.transaction([dbObjectStore], "readwrite");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.delete(path);
    return new Promise<boolean>((resolve, reject) => {
      request.onsuccess = () => { resolve(true); };
      request.onerror = () => { reject(request.error!); }; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- in onerror
    });
  };

  const getMetadata = async (db: IDBDatabase, path: string) => [getRemoteMetadata(path), await getLocalMetadata(db, path)] as const;

  /**
   * Clear all stored file info from the indexed DB.
   * Returns true on success.
   */
  const clearLocalMetadata = (): Promise<boolean> => (
    getIndexedDB().then((db) => {
      const transaction = db.transaction(["files"], "readwrite");
      const objectStore = transaction.objectStore("files");
      const request = objectStore.clear();
      db.close();
      return new Promise<boolean>((resolve, reject) => {
        request.onsuccess = () => { resolve(true); };
        request.onerror = () => { reject(request.error!); }; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- in onerror
      });
    })
  );

  const getAllLocalFilePaths = (): Promise<readonly string[]> => (
    getIndexedDB().then((db) => {
      const transaction = db.transaction([dbObjectStore], "readonly");
      const objectStore = transaction.objectStore(dbObjectStore);
      const request = objectStore.getAllKeys();
      db.close();
      return new Promise<readonly string[]>((resolve, reject) => {
        request.onsuccess = () => { resolve(request.result.filter((key) => typeof key === 'string')); };
        request.onerror = () => { reject(request.error!); }; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- in onerror
      });
    })
  );
  //#endregion

  //#region Cache Storage
  const getCache = async () => await caches.open(cacheName);

  const cacheMatch = async (cache: Cache, url: string) => {
    try {
      const res = await cache.match(url);
      // if (res !== undefined && import.meta.env.DEV)
      //   console.debug(`Retrieved ${url} from cache`);
      return res;
    }
    catch (err) {
      console.error(err);
      return undefined;
    }
  };

  const cachePut = async (cache: Cache, url: string, res: Response) => {
    try {
      await cache.put(url, res.clone());
      if (import.meta.env.DEV)
        console.debug(`Saved ${url} to cache`);
      return true;
    }
    catch (err) {
      console.error(err);
      return false;
    }
  };
  //#endregion

  return {
    corpus,
    getFilePath,
    getFileSize,
    getDownloadSizeTotal,
    getFile,
    getFileCacheOnly,
    getFileRemote,
    getIndexedDB,
    deleteLocalMetadata,
    clearLocalMetadata,
    getAllLocalFilePaths,
    getCache,
  };
};

export type Loader = ReturnType<typeof loaderFactory>;

export function getLoader(corpus: Corpus): Loader {
  return loaderFactory(corpus);
}

//#region Initialization
export function initializeLoader(setLoader: Dispatch<SetStateAction<Loader | null | undefined>>, url: string | URL | Request = dataURL) {
  const replaceLoaderOnFailure = () => { setLoader((prev) => prev === undefined ? null : prev); };
  Promise.all([
    getLoaderCacheOnly(url)
      .then((loader) => { setLoader((prev) => (prev === undefined && loader !== null) ? loader : prev); })
      .catch((err: unknown) => { console.log(err); }),
    getLoaderRemote(url)
      .then((loader) => { setLoader((prev) => loader ?? prev); })
      .catch((err: unknown) => { console.log(err); }),
  ]).then(replaceLoaderOnFailure, replaceLoaderOnFailure);
}

async function getLoaderCacheOnly(url: string | URL | Request): Promise<Loader | null> {
  const cache = await caches.open(cacheName);
  const local = await cache.match(url);
  if (local === undefined)
    return null; // no match
  if (!local.ok)
    return null; // HTTP error

  return getLoaderFromResponse(local);
}

async function getLoaderRemote(url: string | URL | Request): Promise<Loader | null> {
  const remote = await fetch(url);
  if (!remote.ok)
    return null; // HTTP error

  // Save to cache storage
  if ('caches' in window) {
    const remoteClone = remote.clone();
    caches.open(cacheName)
      .then((cache) => cache.put(url, remoteClone))
      .catch((err: unknown) => { console.log(err); });
  }
  return getLoaderFromResponse(remote);
}

async function getLoaderFromResponse(res: Response): Promise<Loader> {
  const source = await res.json() as CorpusSource;
  const corpus = getCorpus(source);
  return getLoader(corpus);
}
//#endregion
