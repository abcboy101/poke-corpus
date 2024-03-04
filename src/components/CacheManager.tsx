import { MouseEventHandler, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import './CacheManager.css';
import corpus, { cacheVersion, getFileUrl } from '../webWorker/corpus';
import { formatBytes } from "../utils/utils";

function CacheManager({active}: {active: boolean}) {
  const { t } = useTranslation();
  const [cacheStorageEnabled, setCacheStorageEnabled] = useState(true);
  const [cachedFileCount, setCachedFileCount] = useState(-1);
  const [cachedFileSize, setCachedFileSize] = useState(-1);

  const checkCacheStorageEnabled = async () => {
    setCacheStorageEnabled('caches' in window && await window.caches.keys().then(() => true).catch(() => false));
  }

  const checkCachedFiles = async () => {
    if ('caches' in window) {
      window.caches.open(cacheVersion).then((cache) => {
        Promise.all(Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
          collection.languages.flatMap((languageKey) => collection.files.flatMap((fileKey) =>
            cache.match(getFileUrl(collectionKey, languageKey, fileKey))))))
        .then(async (resArr) => {
          const responses = resArr.filter((res) => res !== undefined) as Response[];
          setCachedFileCount(responses.length);
          const fileSizes = await Promise.all(responses.map((res) => res.blob().then((blob) => blob.size)));
          setCachedFileSize(fileSizes.reduce((a, b) => a + b, 0));
        });
      });
    }
  }

  const clearCache: MouseEventHandler<HTMLButtonElement> = (e) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => registration.unregister());
    }
    if (indexedDB){
      indexedDB.databases()
        .then(databases => databases.filter((db) => db.name !== undefined).forEach((db) => indexedDB.deleteDatabase(db.name as string)))
        .catch(() => {});
    }
    if ('caches' in window) {
      window.caches.keys()
        .then((keyList) => Promise.all(keyList.map((key) => window.caches.delete(key))))
        .catch(() => {})
        .then(() => checkCachedFiles());
    }
    console.log('Cache cleared');
  };

  useEffect(() => {
    checkCacheStorageEnabled();
    checkCachedFiles();
  });

  const storageUsedAmount = () => {
    const [amount, format] = formatBytes(cachedFileSize);
    return {amount: amount, formatParams: {amount: format}};
  };

  return (
    <>
      <div className='App-cache App-cache-button-group'>
        <button onClick={clearCache}>{t('clearCache')}</button>
      </div>
      <div className="App-cache App-cache-results">
        <ul>
          <li>{t('cache.storageStatus', {val: cacheStorageEnabled ? t('cache.storageEnabled') : t('cache.storageDisabled')})}</li>
          {cacheStorageEnabled && <li>{t('cache.filesStored', {count: cachedFileCount})}</li>}
          {cacheStorageEnabled && <li>{t('cache.storageUsed', storageUsedAmount())}</li>}
        </ul>
      </div>
    </>
  );
}

export default CacheManager;
