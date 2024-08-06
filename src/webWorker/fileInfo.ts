import filesJson from '../res/files.json'

const filesRemote = filesJson as Files;

type FileInfo = {hash: string, size: number};
export interface Files {
  [path: string]: FileInfo
}

export const getFilePath = (collectionKey: string, languageKey: string, fileKey: string) =>
  `corpus/${collectionKey}/${languageKey}_${fileKey}.txt.gz`;

const dbName = 'corpus';
const dbObjectStore = 'files';
const getIndexedDB = (): Promise<IDBDatabase> => {
  const request = indexedDB.open(dbName);
  return new Promise((resolve, reject) => {
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(dbObjectStore);
      console.log('Created object store');
      resolve(db);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const getRemoteFileInfo = (path: string): FileInfo => filesRemote[path];

const getLocalFileInfo = (path: string): Promise<FileInfo> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction([dbObjectStore], "readonly");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.get(path);
    return new Promise<FileInfo>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise<FileInfo>((_, reject) => reject(reason)))
);

const setLocalFileInfo = (path: string): Promise<boolean> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction([dbObjectStore], "readwrite");
    const objectStore = transaction.objectStore(dbObjectStore);
    const request = objectStore.put(filesRemote[path], path);
    return new Promise<boolean>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result === (path as IDBValidKey));
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise<boolean>((_, reject) => reject(reason)))
);

export const clearLocalFileInfo = (): Promise<boolean> => (
  getIndexedDB().then((db) => {
    const transaction = db.transaction(["files"], "readwrite");
    const objectStore = transaction.objectStore("files");
    const request = objectStore.clear();
    return new Promise<boolean>((resolve, reject) => {
      request.onsuccess = () => resolve(request === undefined);
      request.onerror = () => reject(request.error);
    });
  }).catch((reason) => new Promise<boolean>((_, reject) => reject(reason)))
);

export const getFile = async (cache: Cache, path: string): Promise<Response> => {
  const url = import.meta.env.BASE_URL + path;
  const remoteFileInfo = getRemoteFileInfo(path);
  const localFileInfo = await getLocalFileInfo(path);

  // Use cached file if local hash is up-to-date, or if we are offline
  if ((localFileInfo?.hash === remoteFileInfo.hash)
      || (!navigator.onLine && localFileInfo?.hash !== undefined)) {
    return getCachedUrl(cache, url);
  }

  // Out-of-date or miss, overwrite cached file and update local hash
  const res = fetchAndSaveUrl(cache, url);
  res.then(() => setLocalFileInfo(path));
  return res;
};

export const getFileCacheOnly = async (cache: Cache, path: string): Promise<[Response | undefined, boolean]> => {
  const url = import.meta.env.BASE_URL + path;
  const remoteFileInfo = getRemoteFileInfo(path);
  const localFileInfo = await getLocalFileInfo(path);

  // No file is cached
  if (localFileInfo?.hash === undefined) {
    return [undefined, false];
  }

  // Use cached file
  const current = (localFileInfo.hash === remoteFileInfo.hash);
  return [await cache.match(url), current];
};

const getCachedUrl = (cache: Cache, url: string) => (
   // Try retrieving file from cache
  cache.match(url).then((res) => {
    if (res !== undefined) {
      if (import.meta.env.DEV) {
        console.debug(`Retrieved ${url} from cache`);
      }
      return res;
    }

    // Try adding URL to cache and retrieving it from cache
    return fetchAndSaveUrl(cache, url);
  })
);

const fetchAndSaveUrl = (cache: Cache, url: string) => (
  fetch(url).then((res) => {
    cache.put(url, res.clone()).then(() => {
      if (import.meta.env.DEV) {
        console.debug(`Saved ${url} to cache`);
      }
    }).catch((err) => console.error(err));
    return res;
  })
);

export const cacheName = "corpus";
