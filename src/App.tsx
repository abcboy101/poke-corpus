import { Dispatch, FormEventHandler, SetStateAction, useEffect, useMemo, useState } from 'react';
import './App.css';
import logo from './logo.svg';
import './i18n/config';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import supportedLngs from './i18n/supportedLngs.json'
import corpus from './i18n/corpus.json'
import { SearchResults } from './searchWorker';

function Results({status, filename, resultsLanguages, results}: {status: string, filename: string, resultsLanguages: string[][], results: [string, string, string[][]][]}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="App-results-status">{t(`status.${status}`, {filename: filename})}</div>
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
                    {row.map((s, j) => <td key={`row${i}-${collectionLangs[j]}`} lang={collectionLangs[j]} dangerouslySetInnerHTML={{__html: s}}></td>)}
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
        <button onClick={(e) => { e.preventDefault(); setCollections(Object.keys(corpus.collections)); }}>{t('selectAll')}</button>
        <button onClick={(e) => { e.preventDefault(); setCollections([]); }}>{t('deselectAll')}</button>
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
        <button onClick={(e) => { e.preventDefault(); setLanguages(corpus.languages); }}>{t('selectAll')}</button>
        <button onClick={(e) => { e.preventDefault(); setLanguages([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  )
}

function Search() {
  const { t } = useTranslation();
  const params: URLSearchParams = new URLSearchParams(window.location.hash.substring(1));
  const [query, setQuery] = useState(params.get('query') ?? '');
  const [regex, setRegex] = useState(params.get('regex') === 'true');
  const [caseInsensitive, setCaseInsensitive] = useState(params.get('caseInsensitive') !== 'false');
  const [common, setCommon] = useState(params.get('common') !== 'false');
  const [script, setScript] = useState(params.get('script') !== 'false');
  const [collections, setCollections] = useState((params.get('collections') ?? Object.keys(corpus.collections).filter((value) => corpus.collections[value as keyof typeof corpus.collections].structured).join('|')).split('|'))
  const [languages, setLanguages] = useState((params.get('languages') ?? corpus.languages.filter((value) => value.startsWith(i18next.language.split('-')[0])).join('|')).split('|'))

  const worker: Worker = useMemo(
    () => new Worker(new URL("./searchWorker.ts", import.meta.url)),
    []
  );
  const [status, setStatus] = useState("initial");
  const [filename, setFilename] = useState('');
  const [results, setResults] = useState([] as [string, string, string[][]][]);
  const [resultsLanguages, setResultsLanguages] = useState([] as string[][]);

  window.addEventListener('hashchange', () => {
    const params: URLSearchParams = new URLSearchParams(window.location.hash.substring(1));
    setQuery(params.get('query') ?? '');
    setRegex(params.get('regex') === 'true');
    setCaseInsensitive(params.get('caseInsensitive') !== 'false');
    setCommon(params.get('common') !== 'false');
    setScript(params.get('script') !== 'false');
    setCollections((params.get('collections') ?? '').split('|'));
    setLanguages((params.get('languages') ?? '').split('|'));
  });

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
      collections: collections.filter((value) => value !== '').join('|'),
      languages: languages.filter((value) => value !== '').join('|'),
    }).toString();

    if (query.length > 0 && collections.length > 0 && languages.length > 0 && window.Worker) {
      setStatus('waiting');
      worker.postMessage({
        query: query,
        regex: regex,
        caseInsensitive: caseInsensitive,
        common: common,
        script: script,
        collections: collections,
        languages: languages,
      });
    }
  };

  useEffect(() => {
    if (window.Worker) {
      worker.onmessage = (e: MessageEvent<SearchResults>) => {
        setStatus(e.data.status);
        setFilename(e.data.filename);
        if (e.data.complete) {
          setResultsLanguages(e.data.resultsLanguages);
          setResults(e.data.results);
        }
      };
    }
  });

  return (
    <>
      <form className="App-search" onSubmit={onSubmit}>
        <div className="App-search-bar">
          <div>
            <label htmlFor="query">{t('query')} </label>
            <input type="text" name="query" id="query" value={query} onChange={e => setQuery(e.target.value)}/>
            <input type="submit" value={t('search')}/>
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
        </div>
        <div className="App-search-filters">
          <SearchCollections collections={collections} setCollections={setCollections}/>
          <div className="App-search-filters-divider"></div>
          <SearchLanguages languages={languages} setLanguages={setLanguages}/>
        </div>
      </form>
      <Results status={status} filename={filename} resultsLanguages={resultsLanguages} results={results}/>
    </>
  );
}

function LanguageSelect() {
  const { t } = useTranslation();
  return (
    <>
      <label htmlFor="language">{t('language')} </label>
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
          <label htmlFor="mode">{t('mode')} </label>
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
