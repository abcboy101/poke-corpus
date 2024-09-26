import filesJson from '../res/files.json';
import corpus from './corpus';

/**
 * Formats the collection, language, and file into the relative path to the text file.
 */
export const getFilePath = (collectionKey: string, languageKey: string, fileKey: string) =>
  `corpus/${collectionKey}/${languageKey}_${fileKey}.txt.gz`;

/**
 * Returns the size of the text file.
 */
export const getFileSize = (path: string): number => {
  return getRemoteFileInfo(path).size;
};

/**
 * Returns the size of the pending download, or 0 if already downloaded.
 */
export const getDownloadSize = async (db: IDBDatabase, path: string): Promise<number> => {
  const [remoteFileInfo, localFileInfo] = await getFileInfo(db, path);

  // Cached file is up-to-date, no need to download
  if ((localFileInfo?.hash === remoteFileInfo.hash)) {
    return 0;
  }

  // Out-of-date or miss, need to download from remote
  return remoteFileInfo.size;
};

/**
 * Returns the total size of the pending downloads, or 0 if already downloaded.
 */
export const getDownloadSizeTotal = async (collections: readonly string[]): Promise<number> => {
  try {
    const db = await getIndexedDB();
    const size = (await Promise.all(collections.flatMap((collectionKey) =>
      corpus.collections[collectionKey].languages.flatMap((languageKey) =>
        corpus.collections[collectionKey].files.map((fileKey) =>
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
      corpus.collections[collectionKey].languages.flatMap((languageKey) =>
        corpus.collections[collectionKey].files.map((fileKey) =>
          getFileSize(getFilePath(collectionKey, languageKey, fileKey))
        )
      )
    ).reduce((a, b) => a + b, 0);
  }
};

export const getFileURL = (path: string) => import.meta.env.BASE_URL + path;

/**
 * Retrieves a file from the cache, if present and up-to-date, or the server otherwise.
 */
export const getFile = async (cache: Cache, db: IDBDatabase, path: string) => {
  const url = getFileURL(path);

  const [remoteFileInfo, localFileInfo] = await getFileInfo(db, path);

  // Use cached file if local hash is up-to-date, or if we are offline
  if ((localFileInfo?.hash === remoteFileInfo.hash) || (!navigator.onLine && localFileInfo?.hash !== undefined)) {
    const res = await cacheMatch(cache, url);
    if (res !== undefined)
      return res;
  }

  // Out-of-date or miss, overwrite cached file and update local hash
  const res = await fetch(url);
  if (import.meta.env.DEV)
    console.debug(`Retrieved ${url} from the server`);
  await cachePut(cache, url, res).then(async (success) => {
    if (success)
      await setLocalFileInfo(db, path);
  });
  return res;
};

/**
 * Retrieves a file from the cache, if present, and whether it is up-to-date.
 */
export const getFileCacheOnly = async (cache: Cache, db: IDBDatabase, path: string) => {
  // Try retrieving file from cache
  const url = getFileURL(path);
  const [remoteFileInfo, localFileInfo] = await getFileInfo(db, path);
  if (localFileInfo?.hash !== undefined)
    return [await cacheMatch(cache, url), (localFileInfo.hash === remoteFileInfo.hash)] as const;

  // No file is cached
  return [undefined, false] as const;
};

/**
 * Retrieves a file from the server.
 */
export const getFileRemote = (path: string) => {
  const url = getFileURL(path);
  return fetch(url);
};

//#region Indexed DB/FileInfo
type FileInfo = {hash: string, size: number};
export interface Files {
  [path: string]: FileInfo,
}

const filesRemoteData = filesJson as ([string, number])[];
const filesRemote: Files = Object.fromEntries(
  Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
    collection.languages.flatMap((languageKey) =>
      collection.files.map((fileKey) => getFilePath(collectionKey, languageKey, fileKey))
    )
  ).map((filePath, i) => [filePath, {hash: filesRemoteData[i][0], size: filesRemoteData[i][1]} as FileInfo] as const)
);

const dbName = 'corpus';
const dbObjectStore = 'files';
export const getIndexedDB = (): Promise<IDBDatabase> => {
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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getRemoteFileInfo = (path: string): FileInfo => filesRemote[path];

const getLocalFileInfo = (db: IDBDatabase, path: string): Promise<FileInfo> => {
  const transaction = db.transaction([dbObjectStore], "readonly");
  const objectStore = transaction.objectStore(dbObjectStore);
  const request = objectStore.get(path);
  return new Promise<FileInfo>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const setLocalFileInfo = (db: IDBDatabase, path: string): Promise<boolean> => {
  const transaction = db.transaction([dbObjectStore], "readwrite");
  const objectStore = transaction.objectStore(dbObjectStore);
  const request = objectStore.put(filesRemote[path], path);
  return new Promise<boolean>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result === path);
    request.onerror = () => reject(request.error);
  });
};

export const deleteLocalFileInfo = (db: IDBDatabase, path: string): Promise<boolean> => {
  const transaction = db.transaction([dbObjectStore], "readwrite");
  const objectStore = transaction.objectStore(dbObjectStore);
  const request = objectStore.delete(path);
  return new Promise<boolean>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () => reject(request.error);
  });
};

const getFileInfo = async (db: IDBDatabase, path: string) => [getRemoteFileInfo(path), await getLocalFileInfo(db, path)] as const;

/**
 * Clear all stored file info from the indexed DB.
 * Returns true on success.
 */
export const clearLocalFileInfo = (): Promise<boolean> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction(["files"], "readwrite");
    const objectStore = transaction.objectStore("files");
    const request = objectStore.clear();
    db.close();
    return new Promise<boolean>((resolve, reject) => {
      request.onsuccess = () => resolve(request === undefined);
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise((_, reject) => reject(reason)))
);

export const getAllLocalFilePaths = (): Promise<string[]> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction([dbObjectStore], "readonly");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.getAllKeys();
    db.close();
    return new Promise<string[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result.filter((key) => typeof key === 'string'));
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise((_, reject) => reject(reason)))
);
//#endregion

//#region Cache Storage
const cacheName = "corpus";

export const getCache = async () => await caches.open(cacheName);

const cacheMatch = async (cache: Cache, url: string) => {
  try {
    const res = await cache.match(url);
    if (res !== undefined && import.meta.env.DEV)
      console.debug(`Retrieved ${url} from cache`);
    return res;
  }
  catch (e) {
    console.error(e);
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
  catch (e) {
    console.error(e);
    return false;
  }
};
//#endregion
