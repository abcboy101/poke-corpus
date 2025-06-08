import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CacheManagerParams, CacheManagerResult, RequestedCollection } from "../../webWorker/cacheManagerWorker";
import CacheManagerWorker from '../../webWorker/cacheManagerWorker.ts?worker';
import Delete from "./Delete";

import { Corpus, CollectionKey, FileKey, LanguageKey, serializeCorpus } from '../../utils/corpus';
import { Loader } from '../../utils/loader';
import { formatBytes } from "../../utils/utils";
import { ShowModal } from '../Modal';
import ProgressBar from "../ProgressBar";
import './CacheManager.css';
import Refresh from "./Refresh";

type CachedMetadataEntry = readonly [readonly [CollectionKey, LanguageKey, FileKey], number, boolean];

function CacheStatus({cacheStorageEnabled, cachedMetadata}: {cacheStorageEnabled: boolean, cachedMetadata: readonly CachedMetadataEntry[]}) {
  const { t } = useTranslation();
  const storageUsedAmount = useMemo(() => formatBytes(cachedMetadata.reduce((acc, [, size]) => acc + size, 0)), [cachedMetadata]);
  return (
    <ul>
      <li>{t('cache.storageStatus', {val: t(cacheStorageEnabled ? 'cache.storageEnabled' : 'cache.storageDisabled')})}</li>
      {cacheStorageEnabled && <li>{t('cache.filesStored', {count: cachedMetadata.length})}</li>}
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

function CacheEntryList({corpus, cachedMetadata, cacheCollections, clearCachedFile}: {corpus: Corpus, cachedMetadata: readonly CachedMetadataEntry[], cacheCollections: (collectionKey: CollectionKey) => void, clearCachedFile: (collectionKey: CollectionKey) => void}) {
  const { t } = useTranslation();
  const metadataPerCollection = useMemo(() => {
    const value = corpus.collections.map((collectionKey) => {
      const collectionMetadata = cachedMetadata.filter(([[collection]]) => collectionKey === collection);
      return [
        collectionKey,
        collectionMetadata.reduce((acc, [, size]) => acc + size, 0),
        collectionMetadata.every(([, , current]) => current),
      ] as const;
    }).filter(([, size]) => size > 0);
    return value;
  }, [cachedMetadata]);
  return (
    <div className="cache-entry-list">
      {
        cachedMetadata.length > 0
        && metadataPerCollection.map(([key, size, current], index) =>
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

function CacheManager({active, loader, showModal}: {active: boolean, loader: Loader, showModal: ShowModal}) {
  const { t } = useTranslation();
  const [cacheStorageEnabled, setCacheStorageEnabled] = useState(false);
  const [cachedMetadata, setCachedMetadata] = useState<readonly CachedMetadataEntry[]>([]);
  const [cacheInProgress, setCacheInProgress] = useState<boolean | null>(false);
  const [progress, setProgress] = useState(0.0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const workerRef = useRef<Worker>(null);

  const checkCacheStorageEnabled = async () => {
    setCacheStorageEnabled('caches' in window && await window.caches.keys().then(() => true).catch(() => false));
  };

  const onMessage = (e: MessageEvent<CacheManagerResult>) => {
    const { status, loadedBytes, totalBytes, requestedCollection } = e.data;
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
    checkCachedFiles(requestedCollection);
  };

  const cacheCollections = useCallback((requestedCollection: RequestedCollection) => {
    if ('caches' in window) {
      setCacheInProgress(true);
      setProgress(0.0);
      setLoadedBytes(0);
      if (workerRef.current === null) {
        console.log('Creating new CacheManagerWorker...');
        workerRef.current = new CacheManagerWorker();
        workerRef.current.addEventListener("message", onMessage);
        workerRef.current.postMessage({serializedCorpus: serializeCorpus(loader.corpus), requestedCollection} satisfies CacheManagerParams);
      }
    }
  }, [loader]);

  const checkCachedFilesAsync = async (collectionKey: RequestedCollection = 'background') => {
    if ('caches' in window && 'indexedDB' in window && 'databases' in window.indexedDB) {
      const [cache, db] = await Promise.all([loader.getCache(), loader.getIndexedDB()] as const);

      // Check for all files in the cache
      const keys = loader.corpus.entries.flatMap(([collectionKey, collection]) =>
        collection.files.flatMap((fileKey) => collection.languages.map((languageKey) =>
          [collectionKey, languageKey, fileKey] as const
        ))
      );
      const paths = keys.map(([collectionKey, languageKey, fileKey]) => loader.getFilePath(collectionKey, languageKey, fileKey));
      const metadata = await Promise.all(paths.map((path) =>
        loader.getFileCacheOnly(cache, db, path).then(async ([res, current]) =>
          [res !== undefined ? (await res.blob()).size : -1, current] as const
        ))
      );
      setCachedMetadata(metadata.map(([size, current], i) => [keys[i], size, current] as const).filter(([, size]) => size !== -1));

      // Remove files that are no longer referenced from the cache
      const pathsSet = new Set(paths);
      const pathsToDelete = (await loader.getAllLocalFilePaths()).filter((path) => !pathsSet.has(path));
      await Promise.all(pathsToDelete.flatMap((path) => (
        loader.deleteLocalMetadata(db, path)
          .then(() => cache.delete(path))
          .then(() => { console.debug(`Deleted ${path} from cache`); })
      )));
      db.close();

      if (collectionKey === 'cacheAll') {
        if (metadata.some(([size, current]) => size === -1 || !current))
          cacheAllFailedModal();
      }
    }
  };
  const checkCachedFiles = (collectionKey: RequestedCollection) => {
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
        loader.clearLocalMetadata().then(() => checkCachedFilesAsync())
      );
    }
    if ('caches' in window) {
      promises.push(loader.getCache().then((cache) =>
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
      const [cache, db] = await Promise.all([loader.getCache(), loader.getIndexedDB()] as const);
      await Promise.all(loader.corpus.getCollection(collectionKey).languages.flatMap((languageKey) =>
        loader.corpus.getCollection(collectionKey).files.flatMap((fileKey) => {
          const path = loader.getFilePath(collectionKey, languageKey, fileKey);
          return [loader.deleteLocalMetadata(db, path), cache.delete(path)];
        })
      ));
      db.close();
      await checkCachedFilesAsync();
    }
  };
  const clearCachedFile = useCallback((collectionKey: CollectionKey) => {
    clearCachedFileAsync(collectionKey).catch((err: unknown) => {
      console.error(err);
    });
  }, []);

  // Refresh on page load or switch to cache manager
  useEffect(() => {
    Promise.all([
      checkCacheStorageEnabled(),
      checkCachedFilesAsync(),
    ]).catch((err: unknown) => {
      console.error(err);
    });
  }, [active, loader.corpus.entries, loader.corpus.metadata]);

  const cacheAllModal = () => {
    loader.getDownloadSizeTotal().then((size) => {
      showModal({
        message: t('cache.cacheAllModal.message', formatBytes(size)),
        buttons: [
          {
            message: t('cache.cacheAllModal.buttons.yes'),
            callback: () => { cacheCollections('cacheAll'); },
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
        <div className="app-window-inner">
          <CacheStatus cacheStorageEnabled={cacheStorageEnabled} cachedMetadata={cachedMetadata} />
          { cacheInProgress
            ? <CacheProgress loadedBytes={loadedBytes} totalBytes={totalBytes} progress={progress} />
            : <CacheEntryList corpus={loader.corpus} cachedMetadata={cachedMetadata} cacheCollections={cacheCollections} clearCachedFile={clearCachedFile} />
          }
        </div>
      </div>
    </div>
  );
}

export default CacheManager;
