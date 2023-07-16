import { Dispatch, FormEventHandler, MouseEventHandler, MutableRefObject, SetStateAction, useEffect, useRef, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { SearchParams } from './searchWorker';
import { SearchResults, SearchResultsInProgress, SearchResultsComplete, SearchResultLines } from './searchWorkerManager';
import Spinner from './Spinner';
import ProgressBar from './ProgressBar';

import './App.css';
import logo from './logo.svg';
import supportedLngs from './i18n/supportedLngs.json'
import corpus from './i18n/corpus.json'
import './i18n/config';

type StatusInProgress = 'waiting' | SearchResultsInProgress | 'rendering';
type StatusComplete = 'initial' | SearchResultsComplete;
type Status = StatusInProgress | StatusComplete;
const statusInProgress: StatusInProgress[] = ['waiting', 'loading', 'processing', 'collecting', 'rendering'];

const codeId = "qid-ZZ";
const langId = "en-JP";

function JumpTo({headers}: {headers: string[]}) {
  const { t } = useTranslation();
  const jumpTo = (k: number) => {
    const results = document.getElementById("App-results");
    const section0 = document.getElementById(`App-results-section0`);
    const sectionk = document.getElementById(`App-results-section${k}`);
    if (results && section0 && sectionk) {
      results.scrollTop = sectionk.offsetTop - section0.offsetTop;
    }
  };
  return <nav className="App-results-jump">
    <select name="mode" id="mode" onChange={(e) => jumpTo(parseInt(e.target.value, 10))} value="" disabled={headers.length === 0}>
      <option value="" disabled>{t('jumpTo')}</option>
      {headers.map((header, k) => <option key={k} value={k}>{header}</option>)}
    </select>
  </nav>
}

function Results({status, progress, results}: {status: Status, progress: number, results: SearchResultLines[]}) {
  const { t } = useTranslation();
  results = results.filter(({lines}) => lines.length > 0);
  const headers = results.map(({collection, file}) => t('tableHeader', {collection: t(`collections:${collection}.name`), file: file, interpolation: {escapeValue: false}}));
  return (
    <>
      <div className="App-results-status">
        {
          status === 'done' ? <JumpTo headers={headers} /> :
          <div className="App-results-status-text">{t(`status.${status}`)}</div>
        }
        <Spinner src={logo} active={(statusInProgress as Status[]).includes(status)}/>
        <ProgressBar progress={progress} />
      </div>
      <main id="App-results" className="App-results">
        {results.map(({languages, lines, displayHeader}, k) => {
          if (lines.length === 0) {
            return null;
          }
          const displayLanguages = languages.map((lang) => lang === codeId ? langId : lang);
          const displayDirs = displayLanguages.map((lang) => i18next.dir(lang));
          const sameDir = displayDirs.every((dir) => dir === displayDirs[0]);
          return (
            <section id={`App-results-section${k}`} key={k} className='App-results-table-container'>
              <h2 className={displayHeader ? undefined : 'd-none'}>{headers[k]}</h2>
              <table className="App-results-table">
                <thead>
                  <tr>{languages.map((lang) => <th key={lang}>{t(`languages:${lang}.code`)}</th>)}</tr>
                </thead>
                <tbody dir={sameDir && displayDirs[0] !== i18next.dir() ? displayDirs[0] : undefined}>
                  {lines.map((row, i) =>
                  <tr key={i}>
                    {row.map((s, j) => <td key={j} lang={displayLanguages[j]} dir={sameDir ? undefined : displayDirs[j]} dangerouslySetInnerHTML={{__html: s}}></td>)}
                  </tr>
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
      </main>
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
              <label htmlFor={`collection-${key}`} style={
                    ((i18next.language.startsWith('ja') || i18next.language.startsWith('ko') || i18next.language.startsWith('zh')) && t(`collections:${key}.short`).length > 4)
                    ? {fontSize: `${400 / t(`collections:${key}.short`).length}%`, scale: `1 ${t(`collections:${key}.short`).length / 4}`, whiteSpace: 'nowrap'}
                    : undefined
                  }>
                <abbr title={t(`collections:${key}.name`)}>{t(`collections:${key}.short`)}</abbr>
              </label>
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
              <label htmlFor={`language-${key}`}>
                <span className="App-search-language-code"><abbr title={t(`languages:${key}.name`)}>{t(`languages:${key}.code`)}</abbr></span>
                <span className="App-search-language-name">{t(`languages:${key}.name`)}</span>
              </label>
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
const defaultLanguages = corpus.languages.filter((value) => value.startsWith(i18next.language.split('-')[0])).join(',') || corpus.languages.filter((value) => value.startsWith('en')).join(',');

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

  const [status, setStatus]: [Status, Dispatch<SetStateAction<Status>>] = useState("initial" as Status);
  const [progress, setProgress] = useState(0.0);
  const [results, setResults] = useState([] as SearchResultLines[]);

  useEffect(() => {
    const onHashChange = () => {
      const params: URLSearchParams = new URLSearchParams(window.location.hash.substring(1));
      setQuery(params.get('query') ?? '');
      setRegex(params.get('regex') === 'true');
      setCaseInsensitive(params.get('caseInsensitive') !== 'false');
      setScript(params.get('script') !== 'false');

      const newCollections = (params.get('collections') ?? '').split(',').filter((value) => Object.keys(corpus.collections).includes(value));
      if (collections.length !== newCollections.length || collections.some((value, i) => value !== newCollections[i])) {
        setCollections(newCollections);
      }

      const newLanguages = (params.get('languages') ?? '').split(',').filter((value) => corpus.languages.includes(value));
      if (languages.length !== newLanguages.length || languages.some((value, i) => value !== newLanguages[i])) {
        setLanguages(newLanguages);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [collections, languages]);

  useEffect(() => {
    const onBlur = () => {
      if (workerRef.current !== null && ['done', 'error'].includes(status)) {
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

  const onMessage = (e: MessageEvent<SearchResults>) => {
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
  };

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
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

    if ((workerRef.current !== null && !['initial', 'done'].includes(status))) {
      console.log('Terminating worker!');
      workerRef.current.terminate();
      workerRef.current = null;
      setStatus('initial');
      setProgress(0.0);
    }
    else if (query.length > 0 && collections.length > 0 && languages.length > 0) {
      if (workerRef.current === null) {
        console.log('Creating new worker...');
        workerRef.current = new Worker(new URL("./searchWorkerManager.ts", import.meta.url));
        workerRef.current.addEventListener("message", onMessage);
      }
      setStatus('waiting');
      setProgress(0.0);
      const message: SearchParams = {
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

  const clearCache: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(registration => registration.unregister());
    }
    if (indexedDB){
      try {
        indexedDB.databases().then(databases => databases.filter((db) => db.name !== undefined).forEach((db) => indexedDB.deleteDatabase(db.name as string)));
      }
      catch (err) {
        indexedDB.deleteDatabase('workbox-expiration');
      }
    }
    if (caches) {
      caches.keys().then((keyList) => {
        Promise.all(keyList.map((key) => caches.delete(key)))
      });
    }
  };

  return (
    <>
      <form className="App-search" onSubmit={onSubmit}>
        <div className="App-search-bar">
          <div className="App-search-bar-query">
            <label htmlFor="query">{t('query')} </label>
            <input type="text" name="query" id="query" value={query} onChange={e => setQuery(e.target.value)}/>
            <input type="submit" value={['initial', 'rendering', 'done'].includes(status) ? t('search') : t('cancel')} disabled={['initial', 'rendering', 'done'].includes(status) && (query.length === 0 || collections.length === 0 || languages.length === 0)}/>
          </div>
          <div className="App-search-bar-group">
            <div className="App-search-options">
              <div className="App-search-option">
                <input type="checkbox" name="regex" id="regex" checked={regex} onChange={e => setRegex(e.target.checked)}/>
                <label htmlFor="regex">{t('regex')}</label>
              </div>
              <div className="App-search-option">
                <input type="checkbox" name="caseInsensitive" id="caseInsensitive" checked={caseInsensitive} onChange={e => setCaseInsensitive(e.target.checked)}/>
                <label htmlFor="caseInsensitive">{t('caseInsensitive')}</label>
              </div>
              <div className="App-search-option">
                <input type="checkbox" name="common" id="common" checked={common} onChange={e => setCommon(e.target.checked)}/>
                <label htmlFor="common">{t('common')}</label>
              </div>
              <div className="App-search-option">
                <input type="checkbox" name="script" id="script" checked={script} onChange={e => setScript(e.target.checked)}/>
                <label htmlFor="script">{t('script')}</label>
              </div>
            </div>
            <div>
              <button onClick={clearCache}>{t('clearCache')}</button>
            </div>
          </div>
        </div>
        <div className="App-search-filters">
          <SearchCollections collections={collections} setCollections={setCollections}/>
          <div className="App-search-filters-divider"></div>
          <SearchLanguages languages={languages} setLanguages={setLanguages}/>
        </div>
      </form>
      <Results status={status} progress={progress} results={results}/>
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

function ModeSelect({mode, setMode}: {mode: string, setMode: Dispatch<SetStateAction<string>>}) {
  const { t } = useTranslation();
  return (
    <>
      <label htmlFor="mode">{t('mode')}</label>
      <select name="mode" id="mode" onChange={(e) => { setMode(e.target.value); localStorage.setItem('mode', e.target.value); }} defaultValue={mode}>
        <option value='system'>{t('modeSystem')}</option>
        <option value='light'>{t('modeLight')}</option>
        <option value='dark'>{t('modeDark')}</option>
      </select>
    </>
  );
}

function App() {
  const { t } = useTranslation();
  const [mode, setMode] = useState(localStorage.getItem('mode') ?? 'system');

  return (
    <div className={`App App-mode-${mode}`} lang={i18next.language} dir={i18next.dir()}>
      <header className="App-header">
        <h1>
          <a href="/poke-corpus">
            <img className="App-header-logo" src={logo} alt="" height="40" width="40" /> {t('title')}
          </a>
        </h1>
        <div className="App-header-options">
          <LanguageSelect/>
          <ModeSelect mode={mode} setMode={setMode}/>
        </div>
      </header>
      <Search/>
      <footer>
        {t('tagline')} | {t('footerText')} | <a href="https://github.com/abcboy101/poke-corpus">{t('github')}</a>
      </footer>
    </div>
  );
}

export default App;
