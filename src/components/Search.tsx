import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import SearchWorkerManager from '../webWorker/searchWorkerManager.ts?worker';
import { SearchParams } from '../webWorker/searchWorker';
import { SearchResults, SearchResultLines } from '../webWorker/searchWorkerManager';
import { Status, statusInProgress } from '../utils/Status';
import SearchForm from './SearchForm';
import Results from './Results';

import '../i18n/config';

function Search() {
  const workerRef: MutableRefObject<Worker | null> = useRef(null);
  const [status, setStatus]: [Status, Dispatch<SetStateAction<Status>>] = useState('initial' as Status);
  const [progress, setProgress] = useState(0.0);
  const [results, setResults] = useState([] as readonly SearchResultLines[]);

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
  }, [onMessage]);

  return (
    <>
      <SearchForm status={status} postToWorker={postToWorker} terminateWorker={terminateWorker} />
      <Results status={status} progress={progress} results={results} />
    </>
  );
}

export default Search;
