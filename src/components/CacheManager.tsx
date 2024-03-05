import { MouseEventHandler, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Delete from "./Delete";

import './CacheManager.css';
import corpus, { cacheVersion, getFileUrl } from '../webWorker/corpus';
import { formatBytes } from "../utils/utils";

function CacheManager({active}: {active: boolean}) {
  const { t } = useTranslation();
  const [cacheStorageEnabled, setCacheStorageEnabled] = useState(true);
  const [cachedFileInfo, setCachedFileInfo] = useState([] as (readonly [readonly [string, string, string], number])[]);

  const checkCacheStorageEnabled = async () => {
    setCacheStorageEnabled('caches' in window && await window.caches.keys().then(() => true).catch(() => false));
  }

  const [cacheInProgress, setCacheInProgress] = useState(false);
  const cacheAll = () => {
    if ('caches' in window) {
      setCacheInProgress(true);
      window.caches.open(cacheVersion).then((cache) =>
        Promise.all(Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
          collection.files.flatMap((fileKey) => collection.languages.map((languageKey) => {
            const url = getFileUrl(collectionKey, languageKey, fileKey);
            return cache.match(url).then(res => res
              ?? cache.add(url).then(() => cache.match(url)).then(res => res
                ?? fetch(url)));
          }))
        ))
      ).catch(() => {}).then(() => {
        console.log('Caching complete')
        checkCachedFiles();
        setCacheInProgress(false);
      });
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
        .then(databases => databases.filter((db) => db.name !== undefined).forEach((db) => indexedDB.deleteDatabase(db.name as string)))
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
        {
        cachedFileInfo.length > 0 &&
        <div>
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
        </div>
        }
      </div>
    </>
  );
}

export default CacheManager;
