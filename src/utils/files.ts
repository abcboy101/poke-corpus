import filesJson from '../res/files.json';

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
export const getDownloadSize = async (path: string): Promise<number> => {
  const [remoteFileInfo, localFileInfo] = await getFileInfo(path);

  // Cached file is up-to-date, no need to download
  if ((localFileInfo?.hash === remoteFileInfo.hash)) {
    return 0;
  }

  // Out-of-date or miss, need to download from remote
  return remoteFileInfo.size;
};

/**
 * Retrieves a file from the cache, if present and up-to-date, or the server otherwise.
 */
export const getFile = async (cache: Cache, path: string) => {
  const url = import.meta.env.BASE_URL + path;
  const [remoteFileInfo, localFileInfo] = await getFileInfo(path);

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
      await setLocalFileInfo(path);
  });
  return res;
};

/**
 * Retrieves a file from the cache, if present, and whether it is up-to-date.
 */
export const getFileCacheOnly = async (cache: Cache, path: string) => {
  // Try retrieving file from cache
  const url = import.meta.env.BASE_URL + path;
  const [remoteFileInfo, localFileInfo] = await getFileInfo(path);
  if (localFileInfo?.hash !== undefined)
    return [await cacheMatch(cache, url), (localFileInfo.hash === remoteFileInfo.hash)] as const;

  // No file is cached
  return [undefined, false] as const;
};

//#region Indexed DB/FileInfo
const filesRemote = filesJson as Files;

type FileInfo = {hash: string, size: number};
export interface Files {
  [path: string]: FileInfo,
}

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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getRemoteFileInfo = (path: string): FileInfo => filesRemote[path];

const getLocalFileInfo = (path: string): Promise<FileInfo> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction([dbObjectStore], "readonly");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.get(path);
    db.close();
    return new Promise<FileInfo>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise((_, reject) => reject(reason)))
);

const setLocalFileInfo = (path: string): Promise<boolean> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction([dbObjectStore], "readwrite");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.put(filesRemote[path], path);
    db.close();
    return new Promise<boolean>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result === (path as IDBValidKey));
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise((_, reject) => reject(reason)))
);

export const deleteLocalFileInfo = (path: string): Promise<boolean> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction([dbObjectStore], "readwrite");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.delete(path);
    db.close();
    return new Promise<boolean>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result !== undefined);
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise((_, reject) => reject(reason)))
);

const getFileInfo = async (path: string) => [getRemoteFileInfo(path), await getLocalFileInfo(path)] as const;

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

export const cacheName = "corpus";
