import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";

import CacheManagerWorker from '../../webWorker/cacheManagerWorker.ts?worker';
import { CacheManagerParams, CacheManagerResult } from "../../webWorker/cacheManagerWorker";
import Delete from "./Delete";

import './CacheManager.css';
import corpus from '../../utils/corpus';
import { getCache, getFilePath, getFileCacheOnly, getDownloadSizeTotal, clearLocalFileInfo, deleteLocalFileInfo, getAllLocalFilePaths, getIndexedDB } from '../../utils/files';
import { formatBytesParams } from "../../utils/utils";
import Refresh from "./Refresh";
import { ModalArguments } from '../Modal';
import ProgressBar from "../ProgressBar";

type CachedFileInfoEntry = readonly [readonly [string, string, string], number, boolean];

function CacheStatus({cacheStorageEnabled, cachedFileInfo}: {cacheStorageEnabled: boolean, cachedFileInfo: readonly CachedFileInfoEntry[]}) {
  const { t } = useTranslation();
  const storageUsedAmount = useMemo(() => formatBytesParams(cachedFileInfo.map(([, size]) => size).reduce((a, b) => a + b, 0)), [cachedFileInfo]);
  return (
    <ul>
      <li>{t('cache.storageStatus', {val: cacheStorageEnabled ? t('cache.storageEnabled') : t('cache.storageDisabled')})}</li>
      {cacheStorageEnabled && <li>{t('cache.filesStored', {count: cachedFileInfo.length})}</li>}
      {cacheStorageEnabled && <li>{t('cache.storageUsed', storageUsedAmount)}</li>}
    </ul>
  );
}

function CacheProgress({loadedBytes, totalBytes, progress}: {loadedBytes: number, totalBytes: number, progress: number}) {
  const { t } = useTranslation();
  return (
    <div className="cache-entry-notice">
      {
        t('cache.loading', {
          message: t('cache.inProgress'),
          loaded: t('cache.size', formatBytesParams(loadedBytes)),
          total: t('cache.size', formatBytesParams(totalBytes)),
        })
      }
      <ProgressBar progress={progress}/>
    </div>
  );
}

function CacheEntryList({cachedFileInfo, cacheCollections, clearCachedFile}: {cachedFileInfo: readonly CachedFileInfoEntry[], cacheCollections: (collectionKey: string) => void, clearCachedFile: (collectionKey: string) => void}) {
  const { t } = useTranslation();
  const fileInfoPerCollection = useMemo(() => {
    const value = Object.entries(corpus.collections).map(([collectionKey]) => {
      const collectionFileInfo = cachedFileInfo.filter(([[collection]]) => collectionKey === collection);
      return [
        collectionKey,
        collectionFileInfo.map(([, size]) => size).reduce((a, b) => a + b, 0),
        collectionFileInfo.every(([, , current]) => current === true),
      ] as const;
    }).filter(([, size]) => size > 0);
    return value;
  }, [cachedFileInfo]);
  return (
    <div className="cache-entry-list">
      {
        cachedFileInfo.length > 0
        && fileInfoPerCollection.map(([key, size, current], index) =>
          <div key={index} className={`cache-entry cache-entry-${current ? 'current' : 'outdated'}`}>
            <div className="cache-entry-text">
              <div><abbr title={t(`collections:${key}.name`)}>{t(`collections:${key}.short`)}</abbr></div>
              <div>{t('cache.size', formatBytesParams(size))}</div>
            </div>
            <div className="cache-entry-actions">
              { !current && <Refresh callback={() => cacheCollections(key)}/> }
              <Delete callback={() => clearCachedFile(key)}/>
            </div>
          </div>
        )
      }
    </div>
  );
}

function CacheManager({active, showModal}: {active: boolean, showModal: (args: ModalArguments) => void}) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [cacheStorageEnabled, setCacheStorageEnabled] = useState(false);
  const [cachedFileInfo, setCachedFileInfo] = useState<readonly CachedFileInfoEntry[]>([]);
  const [cacheInProgress, setCacheInProgress] = useState<boolean | null>(false);
  const [progress, setProgress] = useState(0.0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const checkCacheStorageEnabled = async () => {
    setCacheStorageEnabled('caches' in window && await window.caches.keys().then(() => true).catch(() => false));
  };

  const onMessage = (e: MessageEvent<CacheManagerResult>) => {
    const [status, loadedBytes, totalBytes, collectionKey] = e.data;
    setProgress(loadedBytes / totalBytes);
    setLoadedBytes(loadedBytes);
    setTotalBytes(totalBytes);
    if (status === 'loading') {
      return;
    }

    if (status === 'done') {
      console.log('Caching complete');
    }
    else if (status === 'error') {
      console.error('Caching error');
    }
    workerRef.current?.terminate();
    workerRef.current = null;
    checkCachedFiles(collectionKey);
    setCacheInProgress(false);
  };

  const cacheCollections = (collectionKey: CacheManagerParams = null) => {
    if ('caches' in window) {
      setCacheInProgress(true);
      setProgress(0.0);
      setLoadedBytes(0);
      if (workerRef.current === null) {
        console.log('Creating new worker...');
        workerRef.current = new CacheManagerWorker();
        workerRef.current.addEventListener("message", onMessage);
        workerRef.current.postMessage(collectionKey);
      }
    }
  };

  const checkCachedFiles = async (collectionKey?: CacheManagerParams) => {
    if ('caches' in window && 'indexedDB' in window && 'databases' in window.indexedDB) {
      const cache = await getCache();
      const db = await getIndexedDB();

      // Check for all files in the cache
      const keys = Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
        collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
          [collectionKey, languageKey, fileKey] as const
        ))
      );
      const paths = keys.map(([collectionKey, languageKey, fileKey]) => getFilePath(collectionKey, languageKey, fileKey));
      const fileInfo = await Promise.all(paths.map((path) =>
        getFileCacheOnly(cache, db, path).then(async ([res, current]) =>
          [res !== undefined ? (await res.blob()).size : -1, current] as const
        ))
      );
      setCachedFileInfo(fileInfo.map(([size, current], i) => [keys[i], size, current] as const).filter(([, size]) => size !== -1));

      // Remove files that are no longer referenced from the cache
      const pathsSet = new Set(paths);
      const pathsToDelete = (await getAllLocalFilePaths()).filter((path) => !pathsSet.has(path));
      pathsToDelete.forEach((path) => {
        console.debug(`Deleted ${path} from cache`);
        cache.delete(path);
        deleteLocalFileInfo(db, path);
      });
      db.close();

      if (collectionKey === null) {
        if (fileInfo.some(([size, current]) => size === -1 || !current))
          cacheAllFailedModal();
      }
    }
  };

  const clearCache = async () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => registration.unregister());
    }

    const promises = [];
    if ('indexedDB' in window && 'databases' in window.indexedDB) {
      promises.push(
        clearLocalFileInfo().then(() => checkCachedFiles())
      );
    }
    if ('caches' in window) {
      const cache = await getCache();
      promises.push(
        cache.keys().then((keyList) => Promise.all(keyList.map((key) => cache.delete(key))))
      );
    }

    Promise.all(promises)
      .then(() => {
        console.log('Cache cleared');
      })
      .catch((err) => {
        console.log('Error clearing cache');
        console.error(err);
      });
  };

  const clearCachedFile = async (collectionKey: string) => {
    if ('caches' in window && 'indexedDB' in window && 'databases' in window.indexedDB) {
      const cache = await getCache();
      const db = await getIndexedDB();
      await Promise.all(corpus.collections[collectionKey].languages.flatMap((languageKey) =>
        corpus.collections[collectionKey].files.flatMap((fileKey) => {
          const path = getFilePath(collectionKey, languageKey, fileKey);
          return [deleteLocalFileInfo(db, path), cache.delete(path)];
        })
      ));
      db.close();
      checkCachedFiles();
    }
  };

  // Refresh on page load
  useEffect(() => {
    startTransition(async () => {
      await Promise.all([
        checkCacheStorageEnabled(),
        checkCachedFiles(),
      ]);
    });
  }, []);

  // Refresh on switch to cache manager
  useEffect(() => {
    if (active) {
      checkCacheStorageEnabled();
      checkCachedFiles();
    }
  }, [active]);

  const cacheAllModal = async () => {
    const size = await getDownloadSizeTotal(Object.keys(corpus.collections));
    showModal({
      message: t('cache.cacheAllModal.message', formatBytesParams(size)),
      buttons: [
        {
          message: t('cache.cacheAllModal.buttons.yes'),
          callback: cacheCollections,
        },
        {
          message: t('cache.cacheAllModal.buttons.no'),
          callback: () => setCacheInProgress(false),
          autoFocus: true,
        },
      ],
      cancelCallback: () => setCacheInProgress(false),
    });
  };

  const cacheAllFailedModal = () => {
    showModal({
      message: t('cache.cacheAllFailedModal.message'),
      buttons: [
        {
          message: t('cache.cacheAllFailedModal.buttons.ok'),
          autoFocus: true,
        },
      ],
    });
  };

  const clearCacheModal = async () => {
    showModal({
      message: t('cache.clearCacheModal.message'),
      buttons: [
        {
          message: t('cache.clearCacheModal.buttons.yes'),
          callback: clearCache,
        },
        {
          message: t('cache.clearCacheModal.buttons.no'),
          autoFocus: true,
        },
      ],
    });
  };

  return (
    <>
      <div className='cache cache-button-group item-group'>
        <button onClick={cacheAllModal} disabled={cacheInProgress !== false}>{t('cacheAll')}</button>
        <button onClick={clearCacheModal}>{t('clearCache')}</button>
      </div>
      <div className="cache cache-results app-window">
        {
          !isPending && <>
            <CacheStatus cacheStorageEnabled={cacheStorageEnabled} cachedFileInfo={cachedFileInfo} />
            { cacheInProgress
              ? <CacheProgress loadedBytes={loadedBytes} totalBytes={totalBytes} progress={progress} />
              : <CacheEntryList cachedFileInfo={cachedFileInfo} cacheCollections={cacheCollections} clearCachedFile={clearCachedFile} />
            }
          </>
        }
      </div>
    </>
  );
}

export default CacheManager;
