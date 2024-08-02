import { MutableRefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import CacheManagerWorker from '../webWorker/cacheManagerWorker.ts?worker';
import Delete from "./Delete";

import './CacheManager.css';
import corpus from '../webWorker/corpus';
import { cacheName, getFilePath, getFileCacheOnly, getDownloadSize, clearLocalFileInfo, deleteLocalFileInfo } from '../webWorker/fileInfo';
import { formatBytesParams } from "../utils/utils";
import Refresh from "./Refresh";
import { ShowModalArguments } from './Modal';

type CachedFileInfoEntry = readonly [readonly [string, string, string], number, boolean];

function CacheManager({active, showModal}: {active: boolean, showModal: (args: ShowModalArguments) => void}) {
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

  const onMessage = (e: MessageEvent<[boolean, string | null]>) => {
    const [success, collectionKey] = e.data;
    if (success) {
      console.log('Caching complete');
      workerRef.current?.terminate();
      workerRef.current = null;
    }
    else {
      console.error('Caching error');
    }
    checkCachedFiles(collectionKey);
    setCacheInProgress(false);
  };

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

  const checkCachedFiles = async (collectionKey?: string | null) => {
    if ('caches' in window) {
      const cache = await window.caches.open(cacheName);
      const keys = Object.entries(corpus.collections).flatMap(([collectionKey, collection]) =>
        collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
          [collectionKey, languageKey, fileKey] as const
      )));
      const fileInfo = await Promise.all(keys.map(([collectionKey, languageKey, fileKey]) =>
        getFileCacheOnly(cache, getFilePath(collectionKey, languageKey, fileKey)).then(async ([res, current]) =>
          [res !== undefined ? (await res.blob()).size : -1, current] as const
      )));
      setCachedFileInfo(fileInfo.map(([size, current], i) => [keys[i], size, current] as const).filter(([, size]) => size !== -1));

      if (collectionKey === null) {
        if (fileInfo.some(([size, current]) => size === -1 || !current))
          cacheAllFailedModal();
      }
    }
  }

  const clearCache = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(registration => registration.unregister())
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

    Promise.all(promises).then(() => {
      console.log('Cache cleared');
    })
    .catch((err) => {
      console.log('Error clearing cache');
      console.error(err);
    });
  };

  const clearCachedFile = async (collectionKey: string) => {
    if ('caches' in window) {
      const cache = await window.caches.open(cacheName)
      await Promise.all(corpus.collections[collectionKey].languages.flatMap((languageKey) =>
        corpus.collections[collectionKey].files.flatMap((fileKey) => {
          const path = getFilePath(collectionKey, languageKey, fileKey);
          return [
            deleteLocalFileInfo(path),
            cache.delete(path)
          ];
        })
      ));
      checkCachedFiles();
    }
  };

  useEffect(() => {
    checkCacheStorageEnabled();
    checkCachedFiles();
  }, [active]);

  const storageUsedAmount = () => formatBytesParams(cachedFileInfo.map(([, size]) => size).reduce((a, b) => a + b, 0));

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

  const cacheAllModal = async () => {
    const size = (await Promise.all(Object.keys(corpus.collections).flatMap((collectionKey) =>
      corpus.collections[collectionKey].languages.flatMap((languageKey) =>
        corpus.collections[collectionKey].files.map((fileKey) =>
          getDownloadSize(getFilePath(collectionKey, languageKey, fileKey))
      ))
    ))).reduce((a, b) => a + b, 0);
    showModal({
      message: t('cache.cacheAllModal.message', formatBytesParams(size)),
      buttons: [
        {
          message: t('cache.cacheAllModal.buttons.yes'),
          callback: cacheCollections
        },
        {
          message: t('cache.cacheAllModal.buttons.no'),
          autoFocus: true
        },
      ]
    });
  };

  const cacheAllFailedModal = () => {
    showModal({
      message: t('cache.cacheAllFailedModal.message'),
      buttons: [
        {
          message: t('cache.cacheAllFailedModal.buttons.ok'),
          autoFocus: true
        }
      ]
    });
  };

  const clearCacheModal = async () => {
    showModal({
      message: t('cache.clearCacheModal.message'),
      buttons: [
        {
          message: t('cache.clearCacheModal.buttons.yes'),
          callback: clearCache
        },
        {
          message: t('cache.clearCacheModal.buttons.no'),
          autoFocus: true
        },
      ]
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
          cacheInProgress ? <div className="cache-entry-notice">{ t('cache.inProgress') }</div> :
          <div className="cache-entry-list">
            {
              cachedFileInfo.length > 0 &&
              fileInfoPerCollection().map(([collectionKey, size, current], index) =>
                <div key={index} className={`cache-entry cache-entry-${current ? 'current' : 'outdated'}`}>
                  <div className="cache-entry-text">
                    <div>{t(`collections:${collectionKey}.short`)}</div>
                    <div>{t('cache.size', formatBytesParams(size))}</div>
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
