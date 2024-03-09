import { MouseEventHandler, MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import CacheManagerWorker from '../webWorker/cacheManagerWorker.ts?worker';
import Delete from "./Delete";

import './CacheManager.css';
import corpus, { cacheVersion, getFileUrl } from '../webWorker/corpus';
import { formatBytes } from "../utils/utils";

type CachedFileInfoEntry = readonly [readonly [string, string, string], number];

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

  const cacheAll = () => {
    if ('caches' in window) {
      setCacheInProgress(true);
      if (workerRef.current === null) {
        console.log('Creating new worker...');
        workerRef.current = new CacheManagerWorker();
        workerRef.current.addEventListener("message", onMessage);
        workerRef.current.postMessage(null);
      }
    }
  }

  const checkCachedFiles = async () => {
    if ('caches' in window) {
      window.caches.open(cacheVersion).then(async (cache) => {
        const keys = Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
          collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
            [collectionKey, languageKey, fileKey] as const
        )));
        const sizes = await Promise.all(keys.map(([collectionKey, languageKey, fileKey]) =>
          cache.match(getFileUrl(collectionKey, languageKey, fileKey)).then(async (res) =>
            res !== undefined ? (await res.blob()).size : -1
        )));
        setCachedFileInfo(sizes.map((size, i) => [keys[i], size] as const).filter(([_, size]) => size !== -1));
      }).catch(() => {});
    }
  }

  const clearCache: MouseEventHandler<HTMLButtonElement> = (e) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => registration.unregister()).catch(() => {});
    }
    /*
    // VitePWA does not use indexedDB
    if (indexedDB && 'databases' in indexedDB){
      indexedDB.databases()
        .then(databases => databases.forEach((db) => {
          if (db.name !== undefined)
            indexedDB.deleteDatabase(db.name);
        }))
        .catch(() => {});
    }
    */
    if ('caches' in window) {
      window.caches.keys()
        .then((keyList) => Promise.all(keyList.map((key) => window.caches.delete(key))))
        .then(() => checkCachedFiles())
        .catch(() => {});
    }
    console.log('Cache cleared');
  };

  const clearCachedFile = (collectionKey: string, fileKey: string) => {
    if ('caches' in window) {
      window.caches.open(cacheVersion).then((cache) =>
        Promise.all(corpus.collections[collectionKey].languages.map((languageKey) =>
          cache.delete(getFileUrl(collectionKey, languageKey, fileKey))
        ))
      ).then(() => checkCachedFiles());
    }
  };

  useEffect(() => {
    checkCacheStorageEnabled();
    checkCachedFiles();
  }, [active]);

  const storageUsedAmount = () => {
    const total = cachedFileInfo.map(([_, size]) => size).reduce((a, b) => a + b, 0);
    const [amount, format] = formatBytes(total);
    return {amount: amount, formatParams: {amount: format}};
  };

  const fileInfoParams = (size: number) => {
    const [amount, format] = formatBytes(size);
    return {amount: amount, formatParams: {amount: format}};
  };

  const fileInfoSumByLanguage = () => {
    const value = Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
      collection.files.map((fileKey) => [collectionKey, fileKey,
        cachedFileInfo.filter(([[collection, _language, file], _size]) => collectionKey === collection && fileKey === file).map(([_, size]) => size).reduce((a, b) => a + b, 0)
      ] as const
    )).filter(([_collection, _file, size]) => size > 0);
    return value;
  };

  return (
    <>
      <div className='App-cache App-cache-button-group'>
        <button onClick={cacheAll} disabled={cacheInProgress}>{t('cacheAll')}</button>
        <button onClick={clearCache}>{t('clearCache')}</button>
      </div>
      <div className="App-cache App-cache-results">
        <ul>
          <li>{t('cache.storageStatus', {val: cacheStorageEnabled ? t('cache.storageEnabled') : t('cache.storageDisabled')})}</li>
          {cacheStorageEnabled && <li>{t('cache.filesStored', {count: cachedFileInfo.length})}</li>}
          {cacheStorageEnabled && <li>{t('cache.storageUsed', storageUsedAmount())}</li>}
        </ul>
        <div>
          {
            cacheInProgress ? t('cache.inProgress') : cachedFileInfo.length > 0 &&
            <table className="App-cache-table">
              <thead>
                <tr>
                  <th>{t('cache.headerCollection')}</th>
                  <th>{t('cache.headerSize')}</th>
                  <th>{t('cache.headerActions')}</th>
                </tr>
              </thead>
              <tbody>
              {
                fileInfoSumByLanguage().map(([collectionKey, fileKey, size], index) =>
                  <tr key={index}>
                    <td>{t('tableHeader', {collection: t(`collections:${collectionKey}.short`), file: t(`files:${fileKey}`), interpolation: {escapeValue: false}})}</td>
                    <td>{t('cache.size', fileInfoParams(size))}</td>
                    <td>
                      <div className="App-cache-table-actions">
                        <Delete callback={() => clearCachedFile(collectionKey, fileKey)}/>
                      </div>
                    </td>
                  </tr>
                )
              }
              </tbody>
            </table>
          }
        </div>
      </div>
    </>
  );
}

export default CacheManager;
