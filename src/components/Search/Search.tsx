import {  useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';

import SearchWorkerManager from '../../webWorker/searchWorkerManager.ts?worker';
import TextWorker from '../../webWorker/textWorker.ts?worker';
import { SearchParams } from '../../utils/searchParams';
import { SearchManagerParams, SearchManagerResponse } from '../../webWorker/searchWorkerManager';
import { isStatusError, isStatusInProgress, Status } from '../../utils/Status';
import SearchForm from './SearchForm';
import Results from './Results';
import { ShowModal } from '../Modal';

import '../../i18n/config';
import { formatBytes, localStorageGetItem, localStorageSetItem, logErrorToConsole } from '../../utils/utils';
import { Loader } from '../../utils/loader';
import { TextResult, TextTask } from '../../webWorker/textWorker';
import { Result, ParamsResult, initialResult } from '../../utils/searchResults';
import { SearchTaskResultLines } from '../../webWorker/searchWorker';
import { serializeCorpus } from '../../utils/corpus';
import LocalizationContext from '../LocalizationContext';

const searchModalWarn = 'corpus-warn';
const searchModalThreshold = 20_000_000; // 20 MB
function Search({loader, showModal, language, richText, limit}: {loader: Loader, showModal: ShowModal, language: string, richText: boolean, limit?: number}) {
  const t = useContext(LocalizationContext);
  const searchWorkerManager = useRef<Worker>(null);
  const textWorker = useRef<Worker>(null);
  const responses = useRef<{index: number, params: SearchTaskResultLines}[]>([]);
  const richTextRef = useRef(richText);
  const showSearchModal = useRef(localStorageGetItem(searchModalWarn) !== 'false');
  const [status, setStatus] = useState<Status>('initial');
  const [progress, setProgress] = useState(0.0);
  const [showId, setShowId] = useState(true);
  const [results, setResults] = useState<readonly Result[]>([]);

  // When the richText option changes, postprocess the text again.
  useEffect(() => {
    richTextRef.current = richText;
    for (const {index, params} of responses.current)
      postText(index, params);
  }, [richText]);

  const addResult = (index: number, result: ParamsResult) => {
    setResults((prev) => {
      const newResults = Array<Result>().concat(prev);
      for (let i = newResults.length; i < index; i++)
        newResults[i] = initialResult;
      newResults[index] = result;
      return newResults;
    });
  };

  const onText = (e: MessageEvent<TextResult>) => {
    addResult(e.data.index, {status: 'done', params: e.data, richText: e.data.richText});
    if (e.data.error) {
      showModal({
        message: `statusModal.error`,
        buttons: [{message: 'statusModal.buttons.ok', autoFocus: true}],
      });
    }
  };

  const postText = (index: number, params: SearchTaskResultLines) => {
    if (textWorker.current === null) {
      console.log('Creating new TextWorker...');
      textWorker.current = new TextWorker();
      textWorker.current.addEventListener("message", onText);
    }
    textWorker.current.postMessage({...params, index, richText: richTextRef.current, corpusLiterals: loader.corpus.getCollection(params.collection).literals} satisfies TextTask);
  };

  const onMessage = (e: MessageEvent<SearchManagerResponse>) => {
    setStatus(e.data.status);
    setProgress(e.data.progress);
    setShowId(e.data.showId);
    if ('index' in e.data && 'result' in e.data) {
      const {index, result: params} = e.data;
      if (e.data.result.lines.length === 0) {
        addResult(index, {status: 'noLines', params});
      }
      else {
        responses.current.push({index, params});
        addResult(index, {status: 'worker', params});
        postText(index, params);
      }
    }
    if (e.data.complete && isStatusError(e.data.status)) {
      showModal({
        message: `statusModal.${e.data.status}`,
        buttons: [{message: 'statusModal.buttons.ok', autoFocus: true}],
      });
    }
  };

  const terminateWorker = useCallback(() => {
    console.log('Terminating workers!');
    if (searchWorkerManager.current !== null) {
      searchWorkerManager.current.removeEventListener("message", onMessage);
      searchWorkerManager.current.terminate();
      searchWorkerManager.current = null;
    }
    if (textWorker.current !== null) {
      textWorker.current.removeEventListener("message", onMessage);
      textWorker.current.terminate();
      textWorker.current = null;
    }
    setStatus('initial');
    setProgress(0.0);
    setResults([]);
    responses.current = [];
  }, []);

  const postToWorker = (params: SearchParams) => {
    setResults([]);
    responses.current = [];
    if (params.query.length > 0 && params.collections.length > 0 && params.languages.length > 0) {
      if (searchWorkerManager.current === null) {
        console.log('Creating new SearchWorkerManager...');
        searchWorkerManager.current = new SearchWorkerManager();
        searchWorkerManager.current.addEventListener("message", onMessage);
      }
      setStatus('waiting');
      setProgress(0.0);
      if (import.meta.env.DEV) {
        console.log(params);
      }
      searchWorkerManager.current.postMessage({...params, serializedCorpus: serializeCorpus(loader.corpus)} satisfies SearchManagerParams);
    }
  };

  const postToWorkerModal = useCallback((params: SearchParams) => {
    if (!showSearchModal.current) {
      postToWorker(params);
      return;
    }

    loader.getDownloadSizeTotal(params.collections, params.showAllLanguages ? undefined : params.languages).then((size) => {
      if (size <= searchModalThreshold) {
        postToWorker(params);
        return;
      }

      showModal({
        message: 'searchModal.message',
        messageOptions: formatBytes(size),
        checkbox: {
          message: t('searchModal.checkboxDoNotShowAgain'),
          checked: false,
        },
        buttons: [
          {
            message: 'searchModal.buttons.yes',
            callback: () => { postToWorker(params); },
            checkboxCallback: (checked) => {
              showSearchModal.current = !checked;
              localStorageSetItem(searchModalWarn, (!checked).toString());
            },
          },
          {
            message: 'searchModal.buttons.no',
            callback: () => { setStatus('initial'); },
            autoFocus: true,
          },
        ],
        cancelCallback: () => { setStatus('initial'); },
      });
    }).catch(logErrorToConsole);
  }, [loader.getDownloadSizeTotal]);

  const inProgress = isStatusInProgress(status);
  const waiting = status === 'waiting';
  const searchForm = useMemo(() => (
    <SearchForm corpus={loader.corpus} language={language} inProgress={inProgress} waiting={waiting} postToWorker={postToWorkerModal} terminateWorker={terminateWorker} />
  ), [loader.corpus, language, inProgress, waiting, postToWorkerModal, terminateWorker]);
  const searchResults = useMemo(() => (
    <Results corpus={loader.corpus} language={language} status={status} progress={progress} showId={showId} richText={richText} results={results} limit={limit} />
  ), [loader.corpus, language, status, progress, showId, richText, results, limit]);

  return (
    <div className="search">
      { searchForm }
      { searchResults }
    </div>
  );
}

export default Search;
