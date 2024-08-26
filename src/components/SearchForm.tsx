import { FormEventHandler, MouseEventHandler, useCallback, useEffect, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { SearchParams, SearchType, searchTypes, isSearchType } from '../webWorker/searchWorker';
import { corpus, codeId } from '../utils/corpus';
import SearchFilters from './SearchFilters';
import { escapeRegex, localStorageGetItem, localStorageSetItem } from '../utils/utils';
import { Status, statusInProgress } from '../utils/Status';

import '../i18n/config';

const defaultParams: SearchParams = {
  query: '',
  type: 'exact',
  caseInsensitive: true,
  common: true,
  script: true,
  collections: Object.keys(corpus.collections).filter((value) => corpus.collections[value].structured),
  languages: corpus.languages.filter((value) => value.startsWith(i18next.language.split('-')[0])) || corpus.languages.filter((value) => value.startsWith('en')),
};

function SearchForm({status, postToWorker, terminateWorker}: {status: Status, postToWorker: (params: SearchParams) => void, terminateWorker: () => void}) {
  const { t } = useTranslation();
  const [id, setId] = useState('');
  const [file, setFile] = useState('');
  const [query, setQuery] = useState(defaultParams.query);
  const [type, setType] = useState(defaultParams.type);
  const [caseInsensitive, setCaseInsensitive] = useState(defaultParams.caseInsensitive);
  const [common, setCommon] = useState(defaultParams.common);
  const [script, setScript] = useState(defaultParams.script);
  const [collections, setCollections] = useState(defaultParams.collections);
  const [languages, setLanguages] = useState(defaultParams.languages);
  const [filtersVisible, setFiltersVisible] = useState((localStorageGetItem('corpus-filtersVisible') ?? (window.location.hash ? 'false' : 'true')) !== 'false');

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

    const newType = params.get('type');
    if (newType !== null && isSearchType(newType)) {
      setType(newType);
    }
    else {
      // Earlier versions used a boolean regex parameter rather than the search type enum
      const newRegex = params.get('regex');
      if (newRegex === 'true') {
        setType('regex');
      }
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
    if (localStorageGetItem('corpus-filtersVisible') === null) {
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
        type: 'regex',
        caseInsensitive: false,
        common: true,
        script: true,
        collections: Object.keys(corpus.collections).filter((key) => corpus.collections[key]?.id === id.split('.')[0]),
        languages: [codeId],
      });
    }
  }, [id, postToWorker]);

  useEffect(() => {
    if (file !== '') {
      postToWorker({
        query: `^${escapeRegex(file)}\\..*$`,
        type: 'regex',
        caseInsensitive: false,
        common: true,
        script: true,
        collections: Object.keys(corpus.collections).filter((key) => corpus.collections[key]?.id === file.split('.')[0]),
        languages: [codeId],
      });
    }
  }, [file, postToWorker]);

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    // If there's no saved preference, save current filters status
    if (!localStorageGetItem('corpus-filtersVisible')) {
      localStorageSetItem('corpus-filtersVisible', filtersVisible.toString());
    }

    window.location.hash = new URLSearchParams({
      query: query,
      type: type,
      caseInsensitive: caseInsensitive.toString(),
      common: common.toString(),
      script: script.toString(),
      collections: collections.join(','),
      languages: languages.join(','),
    }).toString();
    setId('');

    postToWorker({
      query: query,
      type: type,
      caseInsensitive: caseInsensitive,
      common: common,
      script: script,
      collections: collections,
      languages: languages,
    });
  };

  const onCancel: MouseEventHandler<HTMLButtonElement> = () => {
    terminateWorker();
  };

  const toggleFiltersVisible: MouseEventHandler<HTMLButtonElement> = () => {
    const newValue = !filtersVisible;
    setFiltersVisible(newValue);
    localStorageSetItem('corpus-filtersVisible', newValue.toString());
  };

  return <form className="search search-form" onSubmit={onSubmit}>
    <div className="search-bar">
      <div className="search-bar-query">
        <label htmlFor="query">{t('query')}</label>
        <input type="text" name="query" id="query" value={query} onChange={(e) => setQuery(e.target.value)}/>
        <div className="btn-alternate-container">
          <input type="submit" className={status === 'rendering' || !statusInProgress.includes(status) ? 'visible' : 'invisible'} value={t('search')} disabled={query.length === 0 || collections.length === 0 || languages.length === 0 || (status !== 'rendering' && statusInProgress.includes(status))}/>
          <button type="button" className={status === 'rendering' || !statusInProgress.includes(status) ? 'invisible' : 'visible'} onClick={onCancel} disabled={status === 'rendering' || !statusInProgress.includes(status)}>{t('cancel')}</button>
        </div>
        <button type="button" className={filtersVisible ? 'active' : undefined} onClick={toggleFiltersVisible}>{t('filters')}</button>
        <label htmlFor="type" className="d-none">{t('searchType.searchType')}</label>
        <select name="type" id="type" onChange={(e) => setType(e.target.value as SearchType)} value={type}>
          {searchTypes.map((type) => <option key={type} value={type}>{t(`searchType.${type}`)}</option>)}
        </select>
      </div>
      <div className="search-bar-group">
        <div className="search-option">
        </div>
        <div className="search-option">
          <input type="checkbox" name="caseInsensitive" id="caseInsensitive" checked={caseInsensitive} onChange={(e) => setCaseInsensitive(e.target.checked)}/>
          <label htmlFor="caseInsensitive">{t('caseInsensitive')}</label>
        </div>
        <div className="search-option">
          <input type="checkbox" name="common" id="common" checked={common} onChange={(e) => setCommon(e.target.checked)}/>
          <label htmlFor="common">{t('common')}</label>
        </div>
        <div className="search-option">
          <input type="checkbox" name="script" id="script" checked={script} onChange={(e) => setScript(e.target.checked)}/>
          <label htmlFor="script">{t('script')}</label>
        </div>
      </div>
    </div>
    <SearchFilters filtersVisible={filtersVisible} collections={collections} setCollections={setCollections} languages={languages} setLanguages={setLanguages} />
  </form>;
}

export default SearchForm;
