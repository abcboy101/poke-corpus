import { Dispatch, FormEventHandler, MutableRefObject, SetStateAction, useRef, useState } from 'react';
import './App.css';
import logo from './logo.svg';
import './i18n/config';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import supportedLngs from './i18n/supportedLngs.json'
import corpus from './i18n/corpus.json'
import { SearchResults } from './searchWorker';
import Spinner from './Spinner';
import ProgressBar from './ProgressBar';

const codeId = "qid-ZZ";
const langId = "en-JP";

function Results({status, progress, resultsLanguages, results}: {status: string, progress: number, resultsLanguages: string[][], results: [string, string, string[][]][]}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="App-results-status">
        <div>{t(`status.${status}`)}</div>
        {['initial', 'done', 'error'].includes(status) ? <div></div> : <Spinner />}
        <ProgressBar progress={progress} />
      </div>
      <div className="App-results">
        {resultsLanguages.map((collectionLangs, k) => {
          const [collectionKey, fileKey, fileResults] = results[k];
          if (fileResults.length === 0) {
            return null;
          }
          return (
            <div key={`table${k}`} className='App-results-table-container'>
              <h2>{t('tableHeader', {collection: t(`collections:${collectionKey}.name`), file: fileKey, interpolation: {escapeValue: false}})}</h2>
              <table className="App-results-table">
                <thead>
                  <tr>{collectionLangs.map((lang) => <th key={lang}>{t(`languages:${lang}.code`)}</th>)}</tr>
                </thead>
                <tbody>
                  {fileResults.map((row, i) =>
                  <tr key={`row${i}`}>
                    {row.map((s, j) => <td key={`row${i}-${collectionLangs[j]}`} lang={collectionLangs[j] === codeId ? langId : collectionLangs[j]} dangerouslySetInnerHTML={{__html: s}}></td>)}
                  </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </>
  );
};

function SearchCollections({collections, setCollections}: {collections: string[], setCollections: Dispatch<SetStateAction<string[]>>}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="App-search-collections">
        {
          Object.keys(corpus.collections).map((key) =>
            <div key={key} className="App-search-collection">
              <input type="checkbox" name={`collection-${key}`} id={`collection-${key}`} checked={collections.includes(key)} onChange={(e) => {
                if (e.target.checked && !collections.includes(key)) {
                  const newCollections: string[] = [];
                  newCollections.splice(0, 0, ...collections);
                  newCollections.push(key);
                  setCollections(newCollections);
                }
                else if (!e.target.checked && collections.includes(key)) {
                  setCollections(collections.filter((value) => value !== key));
                }
              }}/>
              <label htmlFor={`collection-${key}`} style={{transform: (((i18next.language.startsWith('ja') || i18next.language.startsWith('ko') || i18next.language.startsWith('zh')) && t(`collections:${key}.short`).length > 4) ? `scaleX(${4 / t(`collections:${key}.short`).length})` : 'none')}}>{t(`collections:${key}.short`)}</label>
            </div>
          )
        }
      </div>
      <div className="App-search-button-group">
        <button disabled={collections.length === Object.keys(corpus.collections).length} onClick={(e) => { e.preventDefault(); setCollections(Object.keys(corpus.collections)); }}>{t('selectAll')}</button>
        <button disabled={collections.length === 0} onClick={(e) => { e.preventDefault(); setCollections([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  )
}

function SearchLanguages({languages, setLanguages}: {languages: string[], setLanguages: Dispatch<SetStateAction<string[]>>}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="App-search-languages">
        {
          corpus.languages.map((key) =>
            <div key={key} className="App-search-language">
              <input type="checkbox" name={`language-${key}`} id={`language-${key}`} checked={languages.includes(key)} onChange={(e) => {
                if (e.target.checked && !languages.includes(key)) {
                  const newLanguages: string[] = [];
                  newLanguages.splice(0, 0, ...languages);
                  newLanguages.push(key);
                  setLanguages(newLanguages);
                }
                else if (!e.target.checked && languages.includes(key)) {
                  setLanguages(languages.filter((value) => value !== key));
                }
              }}/>
              <label htmlFor={`language-${key}`}>{t(`languages:${key}.name`)}</label>
            </div>
          )
        }
      </div>
      <div className="App-search-button-group">
        <button disabled={languages.length === Object.keys(corpus.languages).length} onClick={(e) => { e.preventDefault(); setLanguages(corpus.languages); }}>{t('selectAll')}</button>
        <button disabled={languages.length === 0} onClick={(e) => { e.preventDefault(); setLanguages([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  )
}

const defaultCollections = Object.keys(corpus.collections).filter((value) => corpus.collections[value as keyof typeof corpus.collections].structured).join(',');
const defaultLanguages = corpus.languages.filter((value) => value.startsWith(i18next.language.split('-')[0])).join(',');

function Search() {
  const { t } = useTranslation();
  const workerRef: MutableRefObject<Worker | null> = useRef(null);
  const params: URLSearchParams = new URLSearchParams(window.location.hash.substring(1));
  const [query, setQuery] = useState(params.get('query') ?? '');
  const [regex, setRegex] = useState(params.get('regex') === 'true');
  const [caseInsensitive, setCaseInsensitive] = useState(params.get('caseInsensitive') !== 'false');
  const [common, setCommon] = useState(params.get('common') !== 'false');
  const [script, setScript] = useState(params.get('script') !== 'false');
  const [collections, setCollections] = useState((params.get('collections') ?? defaultCollections).split(',').filter((value) => Object.keys(corpus.collections).includes(value)))
  const [languages, setLanguages] = useState((params.get('languages') ?? defaultLanguages).split(',').filter((value) => corpus.languages.includes(value)))

  const [status, setStatus] = useState("initial");
  const [progress, setProgress] = useState(0.0);
  const [results, setResults] = useState([] as [string, string, string[][]][]);
  const [resultsLanguages, setResultsLanguages] = useState([] as string[][]);

  window.addEventListener('hashchange', () => {
    const params: URLSearchParams = new URLSearchParams(window.location.hash.substring(1));
    setQuery(params.get('query') ?? '');
    setRegex(params.get('regex') === 'true');
    setCaseInsensitive(params.get('caseInsensitive') !== 'false');
    setCommon(params.get('common') !== 'false');
    setScript(params.get('script') !== 'false');
    setCollections((params.get('collections') ?? '').split(',').filter((value) => Object.keys(corpus.collections).includes(value)));
    setLanguages((params.get('languages') ?? '').split(',').filter((value) => corpus.languages.includes(value)));
  });

  const onMessage = (e: MessageEvent<SearchResults>) => {
    if (e.data.complete) {
      window.requestAnimationFrame(() => {
        // use requestAnimationFrame to ensure that the browser has displayed the 'rendering' status before the results start being rendered
        setStatus('rendering');
        window.requestAnimationFrame(() => {
          setStatus(e.data.status);
          setProgress(e.data.progress);
          setResultsLanguages(e.data.resultsLanguages);
          setResults(e.data.results);
        });
      });
    }
    else {
      setStatus(e.data.status);
      setProgress(e.data.progress);
    }
  };

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setResultsLanguages([]);
    setResults([]);

    window.location.hash = new URLSearchParams({
      query: query,
      regex: regex.toString(),
      caseInsensitive: caseInsensitive.toString(),
      common: common.toString(),
      script: script.toString(),
      collections: collections.join(','),
      languages: languages.join(','),
    }).toString();

    if (workerRef.current !== null && status !== 'initial' && status !== 'done') {
      console.log('Terminating worker!');
      workerRef.current.terminate();
      workerRef.current = null;
      setStatus('initial');
      setProgress(0.0);
    }
    else if (query.length > 0 && collections.length > 0 && languages.length > 0) {
      if (workerRef.current === null) {
        workerRef.current = new Worker(new URL("./searchWorker.ts", import.meta.url));
        workerRef.current.onmessage = onMessage;
      }
      setStatus('waiting');
      setProgress(0.0);
      const message = {
        query: query,
        regex: regex,
        caseInsensitive: caseInsensitive,
        common: common,
        script: script,
        collections: collections,
        languages: languages,
      };
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        console.log(message);
      }
      workerRef.current.postMessage(message);
    }
  };

  return (
    <>
      <form className="App-search" onSubmit={onSubmit}>
        <div className="App-search-bar">
          <div className="App-search-bar-group">
            <div>
              <label htmlFor="query">{t('query')} </label>
              <input type="text" name="query" id="query" value={query} onChange={e => setQuery(e.target.value)}/>
            </div>
            <div>
              <input type="submit" value={(status !== 'initial' && status !== 'done' && status !== 'rendering') ? t('cancel') : t('search')} disabled={!(status !== 'initial' && status !== 'done' && status !== 'rendering') && (collections.length === 0 || languages.length === 0)}/>
            </div>
          </div>
          <div className="App-search-bar-group">
            <div>
              <input type="checkbox" name="regex" id="regex" checked={regex} onChange={e => setRegex(e.target.checked)}/>
              <label htmlFor="regex">{t('regex')}</label>
            </div>
            <div>
              <input type="checkbox" name="caseInsensitive" id="caseInsensitive" checked={caseInsensitive} onChange={e => setCaseInsensitive(e.target.checked)}/>
              <label htmlFor="caseInsensitive">{t('caseInsensitive')}</label>
            </div>
            <div>
              <input type="checkbox" name="common" id="common" checked={common} onChange={e => setCommon(e.target.checked)}/>
              <label htmlFor="common">{t('common')}</label>
            </div>
            <div>
              <input type="checkbox" name="script" id="script" checked={script} onChange={e => setScript(e.target.checked)}/>
              <label htmlFor="script">{t('script')}</label>
            </div>
          </div>
          <div>
            <button onClick={(e) => {e.preventDefault(); caches.keys().then((keyList) => Promise.all(keyList.map((key) => caches.delete(key))));}}>{t('clearCache')}</button>
          </div>
        </div>
        <div className="App-search-filters">
          <SearchCollections collections={collections} setCollections={setCollections}/>
          <div className="App-search-filters-divider"></div>
          <SearchLanguages languages={languages} setLanguages={setLanguages}/>
        </div>
      </form>
      <Results status={status} progress={progress} resultsLanguages={resultsLanguages} results={results}/>
    </>
  );
}

function LanguageSelect() {
  const { t } = useTranslation();
  return (
    <>
      <label htmlFor="language">{t('language')}</label>
      <select name="language" id="language" onChange={(e) => i18next.changeLanguage(e.target.value)} defaultValue={i18next.language}>
        {supportedLngs.map((lang) => <option key={lang.code} value={lang.code} lang={lang.code}>{lang.name}</option>)}
      </select>
    </>
  );
}

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState(localStorage.getItem('mode') ?? 'system');

  return (
    <div className={`App App-mode-${mode}`} lang={i18next.language}>
      <div className="App-header">
        <h1>
          <img className="App-header-logo" src={logo} alt="" height="40" width="40" /> {t('title')}
        </h1>
        <div className="App-header-options">
          <LanguageSelect/>
          <label htmlFor="mode">{t('mode')}</label>
          <select name="mode" id="mode" onChange={(e) => { setMode(e.target.value); localStorage.setItem('mode', e.target.value); }} defaultValue={mode}>
            <option value='system'>{t('modeSystem')}</option>
            <option value='light'>{t('modeLight')}</option>
            <option value='dark'>{t('modeDark')}</option>
          </select>
        </div>
      </div>
      <Search/>
    </div>
  );
}

export default App;
