import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import CacheManagerWorker from '../webWorker/cacheManagerWorker.ts?worker';
import { CacheManagerParams, CacheManagerResult } from "../webWorker/cacheManagerWorker";
import Delete from "./Delete";

import './CacheManager.css';
import corpus from '../utils/corpus';
import { cacheName, getFilePath, getFileCacheOnly, getDownloadSize, clearLocalFileInfo, deleteLocalFileInfo, getAllLocalFilePaths } from '../utils/files';
import { formatBytesParams } from "../utils/utils";
import Refresh from "./Refresh";
import { ShowModalArguments } from './Modal';
import ProgressBar from "./ProgressBar";

type CachedFileInfoEntry = readonly [readonly [string, string, string], number, boolean];

function CacheManager({active, showModal}: {active: boolean, showModal: (args: ShowModalArguments) => void}) {
  const { t } = useTranslation();
  const [cacheStorageEnabled, setCacheStorageEnabled] = useState(true);
  const [cachedFileInfo, setCachedFileInfo] = useState<readonly CachedFileInfoEntry[]>([]);
  const [cacheInProgress, setCacheInProgress] = useState(false);
  const [progress, setProgress] = useState(0.0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const onBlur = () => {
      if (workerRef.current !== null && !active) {
        console.log('Terminating worker!');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('blur', onBlur);
    };
  }, [active]);

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
    if ('caches' in window) {
      // Check for all files in the cache
      const cache = await window.caches.open(cacheName);
      const keys = Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
        collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
          [collectionKey, languageKey, fileKey] as const
        ))
      );
      const paths = keys.map(([collectionKey, languageKey, fileKey]) => getFilePath(collectionKey, languageKey, fileKey));
      const fileInfo = await Promise.all(paths.map((path) =>
        getFileCacheOnly(cache, path).then(async ([res, current]) =>
          [res !== undefined ? (await res.blob()).size : -1, current] as const
        ))
      );
      setCachedFileInfo(fileInfo.map(([size, current], i) => [keys[i], size, current] as const).filter(([, size]) => size !== -1));

      // Remove files that are no longer referenced from the cache
      const pathsToDelete = new Set(await getAllLocalFilePaths()).difference(new Set(paths));
      pathsToDelete.forEach((path) => {
        console.debug(`Deleted ${path} from cache`);
        cache.delete(path);
        deleteLocalFileInfo(path);
      });

      if (collectionKey === null) {
        if (fileInfo.some(([size, current]) => size === -1 || !current))
          cacheAllFailedModal();
      }
    }
  };

  const clearCache = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => registration.unregister());
    }

    const promises = [];
    if (indexedDB && 'databases' in indexedDB) {
      promises.push(
        clearLocalFileInfo().then(() => checkCachedFiles())
      );
    }
    if ('caches' in window) {
      promises.push(
        window.caches.keys().then((keyList) => Promise.all(keyList.map((key) => window.caches.delete(key))))
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
    if ('caches' in window) {
      const cache = await window.caches.open(cacheName);
      await Promise.all(corpus.collections[collectionKey].languages.flatMap((languageKey) =>
        corpus.collections[collectionKey].files.flatMap((fileKey) => {
          const path = getFilePath(collectionKey, languageKey, fileKey);
          return [deleteLocalFileInfo(path), cache.delete(path)];
        })
      ));
      checkCachedFiles();
    }
  };

  // Refresh on page load
  useEffect(() => {
    checkCacheStorageEnabled();
    checkCachedFiles();
  }, []);

  // Refresh on switch to cache manager
  useEffect(() => {
    if (active) {
      checkCacheStorageEnabled();
      checkCachedFiles();
    }
  }, [active]);

  const storageUsedAmount = () => formatBytesParams(cachedFileInfo.map(([, size]) => size).reduce((a, b) => a + b, 0));

  const fileInfoPerCollection = () => {
    const value = Object.entries(corpus.collections).map(([collectionKey]) => {
      const collectionFileInfo = cachedFileInfo.filter(([[collection]]) => collectionKey === collection);
      return [
        collectionKey,
        collectionFileInfo.map(([, size]) => size).reduce((a, b) => a + b, 0),
        collectionFileInfo.every(([, , current]) => current === true),
      ] as const;
    }).filter(([, size]) => size > 0);
    return value;
  };

  const cacheAllModal = async () => {
    const size = (await Promise.all(Object.keys(corpus.collections).flatMap((collectionKey) =>
      corpus.collections[collectionKey].languages.flatMap((languageKey) =>
        corpus.collections[collectionKey].files.map((fileKey) =>
          getDownloadSize(getFilePath(collectionKey, languageKey, fileKey))
        )
      )
    ))).reduce((a, b) => a + b, 0);
    showModal({
      message: t('cache.cacheAllModal.message', formatBytesParams(size)),
      buttons: [
        {
          message: t('cache.cacheAllModal.buttons.yes'),
          callback: cacheCollections,
        },
        {
          message: t('cache.cacheAllModal.buttons.no'),
          autoFocus: true,
        },
      ],
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
      <div className='cache cache-button-group'>
        <button onClick={cacheAllModal} disabled={cacheInProgress}>{t('cacheAll')}</button>
        <button onClick={clearCacheModal}>{t('clearCache')}</button>
      </div>
      <div className="cache cache-results app-window">
        <ul>
          <li>{t('cache.storageStatus', {val: cacheStorageEnabled ? t('cache.storageEnabled') : t('cache.storageDisabled')})}</li>
          {cacheStorageEnabled && <li>{t('cache.filesStored', {count: cachedFileInfo.length})}</li>}
          {cacheStorageEnabled && <li>{t('cache.storageUsed', storageUsedAmount())}</li>}
        </ul>
        {
          cacheInProgress
            ? (
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
            )
            : (
              <div className="cache-entry-list">
                {
                  cachedFileInfo.length > 0
                  && fileInfoPerCollection().map(([key, size, current], index) =>
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
            )
        }
      </div>
    </>
  );
}

export default CacheManager;
