import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SearchWorkerManager from '../webWorker/searchWorkerManager.ts?worker';
import { SearchParams } from '../webWorker/searchWorker';
import { SearchResults, SearchResultLines } from '../webWorker/searchWorkerManager';
import { Status, statusError, statusInProgress } from '../utils/Status';
import SearchForm from './SearchForm';
import Results from './Results';
import { ShowModalArguments } from './Modal';

import './Search.css';
import '../i18n/config';
import { formatBytesParams, localStorageGetItem, localStorageSetItem } from '../utils/utils';
import corpus from '../webWorker/corpus';
import { getDownloadSize, getFilePath } from '../webWorker/fileInfo';

const searchModalWarn = 'corpus-warn';
const searchModalThreshold = 20_000_000; // 20 MB
function Search({showModal}: {showModal: (args: ShowModalArguments) => void}) {
  const { t } = useTranslation();
  const workerRef: MutableRefObject<Worker | null> = useRef(null);
  const [status, setStatus]: [Status, Dispatch<SetStateAction<Status>>] = useState('initial' as Status);
  const [progress, setProgress] = useState(0.0);
  const [results, setResults] = useState([] as readonly SearchResultLines[]);
  const [showSearchModal, setShowSearchModal] = useState(localStorageGetItem(searchModalWarn) !== 'false');

  useEffect(() => {
    const onBlur = () => {
      if (workerRef.current !== null && !statusInProgress.includes(status)) {
        console.log('Terminating worker!');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('blur', onBlur);
    };
  }, [status]);

  const onMessage = useCallback((e: MessageEvent<SearchResults>) => {
    if (e.data.complete) {
      // use requestAnimationFrame to ensure that the browser has displayed the 'rendering' status before the results start being rendered
      setStatus('rendering');
      window.requestAnimationFrame(() => {
        setStatus(e.data.status);
        setProgress(e.data.progress);
        setResults(e.data.results);
        if (statusError.includes(e.data.status)) {
          showModal({
            message: t(`statusModal.${e.data.status}`),
            buttons: [{message: t('statusModal.buttons.ok'), autoFocus: true}]
          });
        }
      });
    }
    else {
      setStatus(e.data.status);
      setProgress(e.data.progress);
    }
  }, []);

  const terminateWorker = () => {
    if (workerRef.current !== null) {
      console.log('Terminating worker!');
      workerRef.current.terminate();
      workerRef.current = null;
      setStatus('initial');
      setProgress(0.0);
    }
  };

  const postToWorker = useCallback((params: SearchParams) => {
    setResults([]);
    if (params.query.length > 0 && params.collections.length > 0 && params.languages.length > 0) {
      if (workerRef.current === null) {
        console.log('Creating new worker...');
        workerRef.current = new SearchWorkerManager();
        workerRef.current.addEventListener("message", onMessage);
      }
      setStatus('waiting');
      setProgress(0.0);
      if (import.meta.env.DEV) {
        console.log(params);
      }
      workerRef.current.postMessage(params);
    }
  }, []);

  const postToWorkerModal = useCallback(async (params: SearchParams) => {
    if (showSearchModal) {
      const size = (await Promise.all(params.collections.flatMap((collectionKey) =>
        corpus.collections[collectionKey].languages.flatMap((languageKey) =>
          corpus.collections[collectionKey].files.map((fileKey) =>
            getDownloadSize(getFilePath(collectionKey, languageKey, fileKey))
        ))
      ))).reduce((a, b) => a + b, 0);
      if (size > searchModalThreshold) {
        showModal({
          message: t('searchModal.message', formatBytesParams(size)),
          checkbox: {
            message: t('searchModal.checkboxDoNotShowAgain'),
            checked: false
          },
          buttons: [
            {
              message: t('searchModal.buttons.yes'),
              callback: () => postToWorker(params),
              checkboxCallback: (checked) => {
                setShowSearchModal(!checked);
                localStorageSetItem(searchModalWarn, (!checked).toString());
              }
            },
            {
              message: t('searchModal.buttons.no'),
              autoFocus: true
            },
          ]
        });
        return;
      }
    }
    postToWorker(params);
  }, [showSearchModal]);

  return (
    <>
      <SearchForm status={status} postToWorker={postToWorkerModal} terminateWorker={terminateWorker} />
      <Results status={status} progress={progress} results={results} />
    </>
  );
}

export default Search;
