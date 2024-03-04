import { FormEventHandler, MouseEventHandler, useCallback, useEffect, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { SearchParams } from '../webWorker/searchWorker';
import { corpus, codeId } from '../webWorker/corpus';
import SearchFilters from './SearchFilters';
import { escapeRegex } from '../utils/utils';
import { Status, statusInProgress } from '../utils/Status';

import '../i18n/config';

const defaultParams: SearchParams = {
  query: '',
  regex: false,
  caseInsensitive: true,
  common: true,
  script: true,
  collections: Object.keys(corpus.collections).filter((value) => corpus.collections[value].structured),
  languages: corpus.languages.filter((value) => value.startsWith(i18next.language.split('-')[0])) || corpus.languages.filter((value) => value.startsWith('en'))
}

function SearchForm({status, postToWorker, terminateWorker}: {status: Status, postToWorker: (params: SearchParams) => void, terminateWorker: () => void}) {
  const { t } = useTranslation();
  const [id, setId] = useState('');
  const [file, setFile] = useState('');
  const [query, setQuery] = useState(defaultParams.query);
  const [regex, setRegex] = useState(defaultParams.regex);
  const [caseInsensitive, setCaseInsensitive] = useState(defaultParams.caseInsensitive);
  const [common, setCommon] = useState(defaultParams.common);
  const [script, setScript] = useState(defaultParams.script);
  const [collections, setCollections] = useState(defaultParams.collections);
  const [languages, setLanguages] = useState(defaultParams.languages);
  const [filtersVisible, setFiltersVisible] = useState((localStorage.getItem('corpus-filtersVisible') ?? (window.location.hash ? 'false' : 'true')) !== 'false');

  const onHashChange = useCallback(() => {
    const params: URLSearchParams = new URLSearchParams(window.location.hash.substring(1));

    const newId = params.get('id');
    if (newId !== null) {
      setId(newId);
    }

    const newFile = params.get('file');
    if (newFile !== null) {
      setFile(newFile);
    }

    const newQuery = params.get('query');
    if (newQuery !== null) {
      setQuery(newQuery);
    }

    const newRegex = params.get('regex');
    if (newRegex !== null) {
      setRegex(newRegex === 'true');
    }

    const newCaseInsensitive = params.get('caseInsensitive');
    if (newCaseInsensitive !== null) {
      setCaseInsensitive(newCaseInsensitive === 'true');
    }

    const newScript = params.get('script');
    if (newScript !== null) {
      setScript(newScript === 'true');
    }

    const newCollections = params.get('collections');
    if (newCollections !== null) {
      setCollections(newCollections.split(',').filter((value) => Object.keys(corpus.collections).includes(value)));
    }

    const newLanguages = params.get('languages');
    if (newLanguages !== null) {
      setLanguages(newLanguages.split(',').filter((value) => corpus.languages.includes(value)));
    }

    // If there's no saved preference, show filters if search can't be performed immediately
    if (localStorage.getItem('corpus-filtersVisible') === null) {
      setFiltersVisible(!newId && !newFile && (!newQuery || !newCollections || !newLanguages));
    }
  }, []);

  useEffect(() => {
    // Initial page load
    if (window.location.hash) {
      onHashChange();
    }

    // Changes while on page
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [onHashChange]);

  useEffect(() => {
    if (id !== '') {
      postToWorker({
        query: `^${escapeRegex(id)}$`,
        regex: true,
        caseInsensitive: false,
        common: true,
        script: true,
        collections: Object.keys(corpus.collections).filter((key) => corpus.collections[key]?.id === id.split('.')[0]),
        languages: [codeId]
      });
    }
  }, [id, postToWorker]);

  useEffect(() => {
    if (file !== '') {
      postToWorker({
        query: `^${escapeRegex(file)}\\..*$`,
        regex: true,
        caseInsensitive: false,
        common: true,
        script: true,
        collections: Object.keys(corpus.collections).filter((key) => corpus.collections[key]?.id === file.split('.')[0]),
        languages: [codeId]
      });
    }
  }, [file, postToWorker]);

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    // If there's no saved preference, save current filters status
    if (!localStorage.getItem('corpus-filtersVisible')) {
      localStorage.setItem('corpus-filtersVisible', filtersVisible.toString());
    }

    window.location.hash = new URLSearchParams({
      query: query,
      regex: regex.toString(),
      caseInsensitive: caseInsensitive.toString(),
      common: common.toString(),
      script: script.toString(),
      collections: collections.join(','),
      languages: languages.join(','),
    }).toString();
    setId('');

    postToWorker({
      query: query,
      regex: regex,
      caseInsensitive: caseInsensitive,
      common: common,
      script: script,
      collections: collections,
      languages: languages,
    });
  };

  const onCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    terminateWorker();
  };

  const clearCache: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if ('serviceWorker' in navigator) {
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
    if ('caches' in window) {
      window.caches.keys().then((keyList) => {
        Promise.all(keyList.map((key) => window.caches.delete(key)))
      });
    }
  };

  const toggleFiltersVisible: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    const newValue = !filtersVisible;
    setFiltersVisible(newValue);
    localStorage.setItem('corpus-filtersVisible', newValue.toString());
  };

  return <form className="App-search" onSubmit={onSubmit}>
    <div className="App-search-bar">
      <div className="App-search-bar-query">
        <label htmlFor="query">{t('query')} </label>
        <input type="text" name="query" id="query" value={query} onChange={e => setQuery(e.target.value)}/>
        {
          status !== 'rendering' && statusInProgress.includes(status)
          ? <button className="submit" onClick={onCancel}>{t('cancel')}</button>
          : <input className="submit" type="submit" value={t('search')} disabled={query.length === 0 || collections.length === 0 || languages.length === 0}/>
        }
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
        <div className="App-search-button-group">
          <button className={filtersVisible ? 'active' : undefined} onClick={toggleFiltersVisible}>{t('filters')}</button>
          <button onClick={clearCache}>{t('clearCache')}</button>
        </div>
      </div>
    </div>
    <SearchFilters filtersVisible={filtersVisible} collections={collections} setCollections={setCollections} languages={languages} setLanguages={setLanguages} />
  </form>
}

export default SearchForm;
