import { MouseEventHandler, MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import CacheManagerWorker from '../webWorker/cacheManagerWorker.ts?worker';
import Delete from "./Delete";

import './CacheManager.css';
import corpus from '../webWorker/corpus';
import { cacheName, getFilePath, getFileCacheOnly } from '../webWorker/fileInfo';
import { formatBytes } from "../utils/utils";
import Refresh from "./Refresh";

type CachedFileInfoEntry = readonly [readonly [string, string, string], number, boolean];

function CacheManager({active}: {active: boolean}) {
  const { t } = useTranslation();
  const [cacheStorageEnabled, setCacheStorageEnabled] = useState(true);
  const [cachedFileInfo, setCachedFileInfo] = useState([] as readonly CachedFileInfoEntry[]);
  const [cacheInProgress, setCacheInProgress] = useState(false);
  const workerRef: MutableRefObject<Worker | null> = useRef(null);

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
  }

  const onMessage = useCallback((e: MessageEvent<boolean>) => {
    if (e.data) {
      console.log('Caching complete');
      workerRef.current?.terminate();
      workerRef.current = null;
    }
    else {
      console.error('Caching error');
    }
    checkCachedFiles();
    setCacheInProgress(false);
  }, []);

  const cacheCollections = (collectionKey: string | null = null) => {
    if ('caches' in window) {
      setCacheInProgress(true);
      if (workerRef.current === null) {
        console.log('Creating new worker...');
        workerRef.current = new CacheManagerWorker();
        workerRef.current.addEventListener("message", onMessage);
        workerRef.current.postMessage(collectionKey);
      }
    }
  }

  const checkCachedFiles = async () => {
    if ('caches' in window) {
      window.caches.open(cacheName).then(async (cache) => {
        const keys = Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
          collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
            [collectionKey, languageKey, fileKey] as const
        )));
        const fileInfo = await Promise.all(keys.map(([collectionKey, languageKey, fileKey]) =>
          getFileCacheOnly(cache, getFilePath(collectionKey, languageKey, fileKey)).then(async ([res, current]) =>
            [res !== undefined ? (await res.blob()).size : -1, current] as const
        )));
        setCachedFileInfo(fileInfo.map(([size, current], i) => [keys[i], size, current] as const).filter(([, size]) => size !== -1));
      }).catch(() => {});
    }
  }

  const clearCache: MouseEventHandler<HTMLButtonElement> = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => registration.unregister()).catch(() => {});
    }
    if (indexedDB && 'databases' in indexedDB) {
      indexedDB.databases()
        .then(databases => databases.forEach((db) => {
          if (db.name !== undefined)
            indexedDB.deleteDatabase(db.name);
        }))
        .catch(() => {});
    }
    if ('caches' in window) {
      window.caches.keys()
        .then((keyList) => Promise.all(keyList.map((key) => window.caches.delete(key))))
        .then(() => checkCachedFiles())
        .catch(() => {});
    }
    console.log('Cache cleared');
  };

  const clearCachedFile = (collectionKey: string) => {
    if ('caches' in window) {
      window.caches.open(cacheName).then((cache) =>
        Promise.all(corpus.collections[collectionKey].languages.flatMap((languageKey) =>
          corpus.collections[collectionKey].files.map((fileKey) =>
            cache.delete(getFilePath(collectionKey, languageKey, fileKey))
        )))
      ).then(() => checkCachedFiles());
    }
  };

  useEffect(() => {
    checkCacheStorageEnabled();
    checkCachedFiles();
  }, [active]);

  const storageUsedAmount = () => {
    const total = cachedFileInfo.map(([, size]) => size).reduce((a, b) => a + b, 0);
    const [amount, format] = formatBytes(total);
    return {amount: amount, formatParams: {amount: format}};
  };

  const fileInfoParams = (size: number) => {
    const [amount, format] = formatBytes(size);
    return {amount: amount, formatParams: {amount: format}};
  };

  const fileInfoPerCollection = () => {
    const value = Object.entries(corpus.collections).map(([collectionKey]) => {
      const collectionFileInfo = cachedFileInfo.filter(([[collection]]) => collectionKey === collection);
      return [
        collectionKey,
        collectionFileInfo.map(([, size]) => size).reduce((a, b) => a + b, 0),
        collectionFileInfo.every(([, , current]) => current === true)
      ] as const;
    }).filter(([, size]) => size > 0);
    return value;
  };

  return (
    <>
      <div className='cache cache-button-group'>
        <button onClick={() => cacheCollections()} disabled={cacheInProgress}>{t('cacheAll')}</button>
        <button onClick={clearCache}>{t('clearCache')}</button>
      </div>
      <div className="cache cache-results app-window">
        <ul>
          <li>{t('cache.storageStatus', {val: cacheStorageEnabled ? t('cache.storageEnabled') : t('cache.storageDisabled')})}</li>
          {cacheStorageEnabled && <li>{t('cache.filesStored', {count: cachedFileInfo.length})}</li>}
          {cacheStorageEnabled && <li>{t('cache.storageUsed', storageUsedAmount())}</li>}
        </ul>
        {
          cacheInProgress ? <div className="cache-entry-notice">{ t('cache.inProgress') }</div> :
          <div className="cache-entry-list">
            {
              cachedFileInfo.length > 0 &&
              fileInfoPerCollection().map(([collectionKey, size, current], index) =>
                <div key={index} className={`cache-entry cache-entry-${current ? 'current' : 'outdated'}`}>
                  <div className="cache-entry-text">
                    <div>{t(`collections:${collectionKey}.short`)}</div>
                    <div>{t('cache.size', fileInfoParams(size))}</div>
                  </div>
                  <div className="cache-entry-actions">
                    { !current && <Refresh callback={() => cacheCollections(collectionKey)}/> }
                    <Delete callback={() => clearCachedFile(collectionKey)}/>
                  </div>
                </div>
              )
            }
          </div>
        }
      </div>
    </>
  );
}

export default CacheManager;
