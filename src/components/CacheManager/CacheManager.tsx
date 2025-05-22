import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";

import { CacheManagerParams, CacheManagerResult } from "../../webWorker/cacheManagerWorker";
import CacheManagerWorker from '../../webWorker/cacheManagerWorker.ts?worker';
import Delete from "./Delete";

import corpus, { corpusEntries, corpusKeys, CollectionKey, FileKey, LanguageKey } from '../../utils/corpus';
import { clearLocalFileInfo, deleteLocalFileInfo, getAllLocalFilePaths, getCache, getDownloadSizeTotal, getFileCacheOnly, getFilePath, getIndexedDB } from '../../utils/files';
import { formatBytes } from "../../utils/utils";
import { ShowModal } from '../Modal';
import ProgressBar from "../ProgressBar";
import './CacheManager.css';
import Refresh from "./Refresh";

type CachedFileInfoEntry = readonly [readonly [CollectionKey, LanguageKey, FileKey], number, boolean];

function CacheStatus({cacheStorageEnabled, cachedFileInfo}: {cacheStorageEnabled: boolean, cachedFileInfo: readonly CachedFileInfoEntry[]}) {
  const { t } = useTranslation();
  const storageUsedAmount = useMemo(() => formatBytes(cachedFileInfo.reduce((acc, [, size]) => acc + size, 0)), [cachedFileInfo]);
  return (
    <ul>
      <li>{t('cache.storageStatus', {val: t(cacheStorageEnabled ? 'cache.storageEnabled' : 'cache.storageDisabled')})}</li>
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
          loaded: t('cache.size', formatBytes(loadedBytes)),
          total: t('cache.size', formatBytes(totalBytes)),
        })
      }
      <ProgressBar progress={progress}/>
    </div>
  );
}

function CacheEntryList({cachedFileInfo, cacheCollections, clearCachedFile}: {cachedFileInfo: readonly CachedFileInfoEntry[], cacheCollections: (collectionKey: CollectionKey) => void, clearCachedFile: (collectionKey: CollectionKey) => void}) {
  const { t } = useTranslation();
  const fileInfoPerCollection = useMemo(() => {
    const value = corpusKeys.map((collectionKey) => {
      const collectionFileInfo = cachedFileInfo.filter(([[collection]]) => collectionKey === collection);
      return [
        collectionKey,
        collectionFileInfo.reduce((acc, [, size]) => acc + size, 0),
        collectionFileInfo.every(([, , current]) => current),
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
              <div><abbr title={t(`collections:${key}.name`)}><span translate="no">{t(`collections:${key}.short`)}</span></abbr></div>
              <div translate="no">{t('cache.size', formatBytes(size))}</div>
            </div>
            <div className="cache-entry-actions">
              { !current && <Refresh callback={() => { cacheCollections(key); }}/> }
              <Delete callback={() => { clearCachedFile(key); }}/>
            </div>
          </div>
        )
      }
    </div>
  );
}

function CacheManager({active, showModal}: {active: boolean, showModal: ShowModal}) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [cacheStorageEnabled, setCacheStorageEnabled] = useState(false);
  const [cachedFileInfo, setCachedFileInfo] = useState<readonly CachedFileInfoEntry[]>([]);
  const [cacheInProgress, setCacheInProgress] = useState<boolean | null>(false);
  const [progress, setProgress] = useState(0.0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const workerRef = useRef<Worker>(null);

  const checkCacheStorageEnabled = async () => {
    setCacheStorageEnabled('caches' in window && await window.caches.keys().then(() => true).catch(() => false));
  };

  const onMessage = (e: MessageEvent<CacheManagerResult>) => {
    const { status, loadedBytes, totalBytes, params  } = e.data;
    setProgress(loadedBytes / totalBytes);
    setLoadedBytes(loadedBytes);
    setTotalBytes(totalBytes);
    switch (status) {
      case 'loading':
        return;
      case 'done':
        console.log('Caching complete');
        break;
      case 'error':
        console.log('Caching error');
        break;
      default:
        status satisfies never;
    }
    workerRef.current?.terminate();
    workerRef.current = null;
    setCacheInProgress(false);
    checkCachedFiles(params);
  };

  const cacheCollections = useCallback((collectionKey: CacheManagerParams = null) => {
    if ('caches' in window) {
      setCacheInProgress(true);
      setProgress(0.0);
      setLoadedBytes(0);
      if (workerRef.current === null) {
        console.log('Creating new CacheManagerWorker...');
        workerRef.current = new CacheManagerWorker();
        workerRef.current.addEventListener("message", onMessage);
        workerRef.current.postMessage(collectionKey);
      }
    }
  }, []);

  const checkCachedFilesAsync = async (collectionKey?: CacheManagerParams) => {
    if ('caches' in window && 'indexedDB' in window && 'databases' in window.indexedDB) {
      const cache = await getCache();
      const db = await getIndexedDB();

      // Check for all files in the cache
      const keys = corpusEntries.flatMap(([collectionKey, collection]) =>
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
      await Promise.all(pathsToDelete.flatMap((path) => (
        deleteLocalFileInfo(db, path)
          .then(() => cache.delete(path))
          .then(() => { console.debug(`Deleted ${path} from cache`); })
      )));
      db.close();

      if (collectionKey === null) {
        if (fileInfo.some(([size, current]) => size === -1 || !current))
          cacheAllFailedModal();
      }
    }
  };
  const checkCachedFiles = (collectionKey?: CacheManagerParams) => {
    checkCachedFilesAsync(collectionKey).catch((err: unknown) => {
      console.error(err);
    });
  };

  const clearCache = () => {
    const promises = [];
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if ('serviceWorker' in navigator) {
      promises.push(
        navigator.serviceWorker.ready.then((registration) => registration.unregister())
      );
    }

    if ('indexedDB' in window && 'databases' in window.indexedDB) {
      promises.push(
        clearLocalFileInfo().then(() => checkCachedFilesAsync())
      );
    }
    if ('caches' in window) {
      promises.push(getCache().then((cache) =>
        cache.keys().then((keyList) => Promise.all(keyList.map((key) => cache.delete(key))))
      ));
    }

    Promise.all(promises)
      .then(() => {
        console.log('Cache cleared');
      })
      .catch((err: unknown) => {
        console.log('Error clearing cache');
        console.error(err);
      });
  };

  const clearCachedFileAsync = async (collectionKey: CollectionKey) => {
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
  const clearCachedFile = useCallback((collectionKey: CollectionKey) => {
    clearCachedFileAsync(collectionKey).catch((err: unknown) => {
      console.error(err);
    });
  }, []);

  // Refresh on page load
  useEffect(() => {
    startTransition(async () => {
      await Promise.all([
        checkCacheStorageEnabled(),
        checkCachedFilesAsync(),
      ]);
    });
  }, []);

  // Refresh on switch to cache manager
  useEffect(() => {
    if (active) {
      startTransition(async () => {
        await Promise.all([
          checkCacheStorageEnabled(),
          checkCachedFilesAsync(),
        ]);
      });
    }
  }, [active]);

  const cacheAllModal = () => {
    getDownloadSizeTotal(corpusKeys).then((size) => {
      showModal({
        message: t('cache.cacheAllModal.message', formatBytes(size)),
        buttons: [
          {
            message: t('cache.cacheAllModal.buttons.yes'),
            callback: cacheCollections,
          },
          {
            message: t('cache.cacheAllModal.buttons.no'),
            callback: () => { setCacheInProgress(false); },
            autoFocus: true,
          },
        ],
        cancelCallback: () => { setCacheInProgress(false); },
      });
    }).catch((err: unknown) => {
      console.error(err);
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

  const clearCacheModal = () => {
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

  return active && (
    <div className="cache">
      <div className="cache-button-group item-group">
        <button onClick={cacheAllModal} disabled={cacheInProgress !== false}>{t('cacheAll')}</button>
        <button onClick={clearCacheModal}>{t('clearCache')}</button>
      </div>
      <div className="cache-results app-window">
        {
          !isPending && <div className="app-window-inner">
            <CacheStatus cacheStorageEnabled={cacheStorageEnabled} cachedFileInfo={cachedFileInfo} />
            { cacheInProgress
              ? <CacheProgress loadedBytes={loadedBytes} totalBytes={totalBytes} progress={progress} />
              : <CacheEntryList cachedFileInfo={cachedFileInfo} cacheCollections={cacheCollections} clearCachedFile={clearCachedFile} />
            }
          </div>
        }
      </div>
    </div>
  );
}

export default CacheManager;
