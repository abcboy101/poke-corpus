import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SearchWorkerManager from '../../webWorker/searchWorkerManager.ts?worker';
import TextWorker from '../../webWorker/textWorker.ts?worker';
import { SearchParams } from '../../utils/searchParams';
import { SearchManagerResponse } from '../../webWorker/searchWorkerManager';
import { Status, statusError } from '../../utils/Status';
import SearchForm from './SearchForm';
import Results from './Results';
import { ShowModal } from '../Modal';

import '../../i18n/config';
import { formatBytesParams, localStorageGetItem, localStorageSetItem } from '../../utils/utils';
import { getDownloadSizeTotal } from '../../utils/files';
import { TextResult, TextTask } from '../../webWorker/textWorker';
import { Result, ParamsResult, initialResult } from '../../utils/searchResults';

const searchModalWarn = 'corpus-warn';
const searchModalThreshold = 20_000_000; // 20 MB
function Search({showModal, richText, limit}: {showModal: ShowModal, richText: boolean, limit?: number}) {
  const { t } = useTranslation();
  const searchWorkerManager = useRef<Worker>(null);
  const textWorker = useRef<Worker>(null);
  const [status, setStatus] = useState<Status>('initial');
  const [progress, setProgress] = useState(0.0);
  const [showId, setShowId] = useState(true);
  const [results, setResults] = useState<readonly Result[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(localStorageGetItem(searchModalWarn) !== 'false');

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
    if ('error' in e.data) {
      showModal({
        message: t(`statusModal.error`),
        buttons: [{message: t('statusModal.buttons.ok'), autoFocus: true}],
      });
    }
  };

  const onMessage = useCallback((e: MessageEvent<SearchManagerResponse>) => {
    setStatus(e.data.status);
    setProgress(e.data.progress);
    setShowId(e.data.showId);
    if ('index' in e.data && 'result' in e.data) {
      if (e.data.result.lines.length === 0) {
        addResult(e.data.index, {status: 'noLines', params: e.data.result, richText});
      }
      else {
        addResult(e.data.index, {status: 'worker', params: e.data.result, richText});
        if (textWorker.current === null) {
          console.log('Creating new TextWorker...');
          textWorker.current = new TextWorker();
          textWorker.current.addEventListener("message", onText);
        }
        const task: TextTask = {...e.data.result, index: e.data.index, richText};
        textWorker.current.postMessage(task);
      }
    }
    if (e.data.complete && statusError.includes(e.data.status)) {
      showModal({
        message: t(`statusModal.${e.data.status}`),
        buttons: [{message: t('statusModal.buttons.ok'), autoFocus: true}],
      });
    }
  }, []);

  const terminateWorker = () => {
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
  };

  const postToWorker = useCallback((params: SearchParams) => {
    setResults([]);
    if (params.query.length > 0 && params.collections.length > 0 && params.languages.length > 0) {
      if (searchWorkerManager.current === null) {
        console.log('Creating new SearchWorkerManager...');
        searchWorkerManager.current = new SearchWorkerManager();
        searchWorkerManager.current.addEventListener("message", onMessage);
      }
      setProgress(0.0);
      if (import.meta.env.DEV) {
        console.log(params);
      }
      searchWorkerManager.current.postMessage(params);
    }
  }, []);

  const postToWorkerModal = useCallback((params: SearchParams) => {
    setStatus('waiting');
    if (!showSearchModal) {
      postToWorker(params);
      return;
    }

    getDownloadSizeTotal(params.collections).then((size) => {
      if (size <= searchModalThreshold) {
        postToWorker(params);
        return;
      }

      showModal({
        message: t('searchModal.message', formatBytesParams(size)),
        checkbox: {
          message: t('searchModal.checkboxDoNotShowAgain'),
          checked: false,
        },
        buttons: [
          {
            message: t('searchModal.buttons.yes'),
            callback: () => { postToWorker(params); },
            checkboxCallback: (checked) => {
              setShowSearchModal(!checked);
              localStorageSetItem(searchModalWarn, (!checked).toString());
            },
          },
          {
            message: t('searchModal.buttons.no'),
            callback: () => { setStatus('initial'); },
            autoFocus: true,
          },
        ],
        cancelCallback: () => { setStatus('initial'); },
      });
    }).catch((err: unknown) => {
      console.error(err);
    });
  }, [showSearchModal]);

  return (
    <>
      <SearchForm status={status} postToWorker={postToWorkerModal} terminateWorker={terminateWorker} />
      <Results status={status} progress={progress} showId={showId} richText={richText} results={results} limit={limit} />
    </>
  );
}

export default Search;
