import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { SearchParams, searchTypes, isSearchType, searchParamsToHash, hashToSearchParams, defaultSearchParams } from '../../utils/searchParams';
import corpus, { codeId, corpusKeys, isCollectionKey, isLanguageKey } from '../../utils/corpus';
import SearchFilters from './SearchFilters';
import { escapeRegex, ReadonlyExhaustiveArray, localStorageGetItem, localStorageSetItem } from '../../utils/utils';

import './SearchForm.css';
import '../../i18n/config';

const userLanguage = corpus.languages.filter((value) => value.startsWith(i18next.language.split('-')[0]));
const defaultParamsPreferences: typeof defaultSearchParams = {
  ...defaultSearchParams,
  languages: userLanguage.length === 0 ? corpus.languages.filter((value) => value.startsWith('en')) : userLanguage,
};

const isStringArray = (arr: unknown): arr is readonly string[] => {
  return Array.isArray(arr) && arr.every((value) => typeof value === 'string');
};
const getSavedParamsPreferences = () => {
  const saved = localStorageGetItem('corpus-params');
  if (saved === null)
    return defaultParamsPreferences;

  const paramsDefault = {...defaultParamsPreferences};
  const params: unknown = JSON.parse(saved);
  if (typeof params === 'object' && params !== null) {
    if ('query' in params && typeof params.query === 'string')
      paramsDefault.query = params.query;
    if ('type' in params && isSearchType(params.type))
      paramsDefault.type = params.type;
    if ('caseInsensitive' in params && typeof params.caseInsensitive === 'boolean')
      paramsDefault.caseInsensitive = params.caseInsensitive;
    if ('common' in params && typeof params.common === 'boolean')
      paramsDefault.common = params.common;
    if ('script' in params && typeof params.script === 'boolean')
      paramsDefault.script = params.script;
    if ('showAllLanguages' in params && typeof params.showAllLanguages === 'boolean')
      paramsDefault.showAllLanguages = params.showAllLanguages;
    if ('collections' in params && isStringArray(params.collections) && params.collections.every((collectionKey) => isCollectionKey(collectionKey)))
      paramsDefault.collections = params.collections;
    if ('languages' in params && isStringArray(params.languages) && params.languages.every((languageKey) => isLanguageKey(languageKey)))
      paramsDefault.languages = params.languages;
  }
  return paramsDefault;
};

const searchTypesDropdown = [
  searchTypes[3], // all
  searchTypes[0], // exact
  searchTypes[1], // regex
  searchTypes[2], // boolean
] as const;
searchTypesDropdown satisfies ReadonlyExhaustiveArray<typeof searchTypesDropdown, typeof searchTypes[number]>;

function SearchForm({waiting, inProgress, postToWorker, terminateWorker}: {waiting: boolean, inProgress: boolean, postToWorker: (params: SearchParams) => void, terminateWorker: () => void}) {
  const { t } = useTranslation();
  const initial = useMemo(getSavedParamsPreferences, []);
  const [query, setQuery] = useState(initial.query);
  const [type, setType] = useState(initial.type);
  const [caseInsensitive, setCaseInsensitive] = useState(initial.caseInsensitive);
  const [common, setCommon] = useState(initial.common);
  const [script, setScript] = useState(initial.script);
  const [showAllLanguages, setShowAllLanguages] = useState(initial.showAllLanguages);
  const [collections, setCollections] = useState(initial.collections);
  const [languages, setLanguages] = useState(initial.languages);
  const [filtersVisible, setFiltersVisible] = useState(import.meta.env.SSR ? false : ((localStorageGetItem('corpus-filtersVisible') ?? (window.location.hash ? 'false' : 'true')) !== 'false'));

  const onHashChange = useCallback(() => {
    if (import.meta.env.SSR)
      return;

    const params = hashToSearchParams(window.location.hash.substring(1));
    if (params.query !== undefined)
      setQuery(params.query);
    if (params.type !== undefined)
      setType(params.type);
    if (params.caseInsensitive !== undefined)
      setCaseInsensitive(params.caseInsensitive);
    if (params.common !== undefined)
      setCommon(params.common);
    if (params.script !== undefined)
      setScript(params.script);
    if (params.showAllLanguages !== undefined)
      setShowAllLanguages(params.showAllLanguages);
    if (params.collections !== undefined)
      setCollections(params.collections);
    if (params.languages !== undefined)
      setLanguages(params.languages);

    if (params.id !== undefined && params.id !== '') {
      const collectionId = params.id.split('.')[0];
      postToWorker({
        query: `^${escapeRegex(params.id)}$`,
        type: 'regex',
        caseInsensitive: false,
        common: true,
        script: true,
        showAllLanguages: true,
        collections: corpusKeys.filter((key) => corpus.collections[key].id === collectionId),
        languages: [codeId],
      });
      return;
    }
    if (params.file !== undefined && params.file !== '') {
      const collectionId = params.file.split('.')[0];
      postToWorker({
        query: `^${escapeRegex(params.file)}\\..*$`,
        type: 'regex',
        caseInsensitive: false,
        common: true,
        script: true,
        showAllLanguages: true,
        collections: corpusKeys.filter((key) => corpus.collections[key].id === collectionId),
        languages: [codeId],
      });
      return;
    }
    if (params.run !== undefined && params.run) {
      const searchParams = {
        query: params.query ?? initial.query,
        type: params.type ?? initial.type,
        caseInsensitive: params.caseInsensitive ?? initial.caseInsensitive,
        common: params.common ?? initial.common,
        script: params.script ?? initial.script,
        showAllLanguages: params.showAllLanguages ?? initial.showAllLanguages,
        collections: params.collections ?? initial.collections,
        languages: params.languages ?? initial.languages,
      };
      window.location.hash = searchParamsToHash(searchParams);
      postToWorker(searchParams);
      return;
    }

    // If there's no saved preference, show filters if search can't be performed immediately
    if (localStorageGetItem('corpus-filtersVisible') === null) {
      setFiltersVisible(!params.query || !params.collections || !params.languages);
    }
  }, [postToWorker, initial]);

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

  // Save preferences on change
  useEffect(() => {
    const params: SearchParams = {query, type, caseInsensitive, common, script, showAllLanguages, collections, languages};
    localStorageSetItem('corpus-params', JSON.stringify(params));
  }, [query, type, caseInsensitive, common, script, showAllLanguages, collections, languages]);

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    // If there's no saved preference, save current filters status
    if (!localStorageGetItem('corpus-filtersVisible')) {
      localStorageSetItem('corpus-filtersVisible', filtersVisible.toString());
    }

    // If the Search view is taller than the viewport, automatically hide the filters on submit.
    const viewSearch = document.getElementsByClassName('view-search').item(0);
    if (viewSearch && viewSearch.scrollHeight > document.body.clientHeight) {
      setFiltersVisible(false);
    }

    const params: SearchParams = {query, type, caseInsensitive, common, script, showAllLanguages, collections, languages};
    window.location.hash = searchParamsToHash(params);
    postToWorker(params);
  };

  const onCancel: MouseEventHandler<HTMLButtonElement> = () => {
    terminateWorker();
  };

  const toggleFiltersVisible: MouseEventHandler<HTMLButtonElement> = () => {
    const newValue = !filtersVisible;
    setFiltersVisible(newValue);
    localStorageSetItem('corpus-filtersVisible', newValue.toString());
  };

  const onTypeChange: ChangeEventHandler<HTMLSelectElement> = (e) => {
    const newType = e.target.value;
    if (isSearchType(newType))
      setType(newType);
  };

  // initial: submit enabled (unless form is incomplete)
  // waiting: submit disabled (to prevent double-clicking)
  // in progress: cancel enabled
  // done or error: submit enabled
  const submitDisabled = waiting || inProgress || query.length === 0 || collections.length === 0 || languages.length === 0;
  const filters = useMemo(() => (
    <SearchFilters filtersVisible={filtersVisible} collections={collections} setCollections={setCollections} languages={languages} setLanguages={setLanguages} />
  ), [filtersVisible, collections, languages]);
  return <form className="search-form" role="search" onSubmit={onSubmit}>
    <div className="search-bar">
      <div className="item-group">
        <label htmlFor="query">{t('query')}</label>
        <input type="search" name="query" id="query" value={query} onChange={(e) => { setQuery(e.target.value); }}/>
        <div className="btn-alternate-container">
          <input id="submit" type="submit" className={inProgress ? 'invisible' : 'visible'} value={t('search')} disabled={submitDisabled}/>
          <button type="button" className={inProgress ? 'visible' : 'invisible'} onClick={onCancel} disabled={!inProgress}>{t('cancel')}</button>
        </div>
        <button type="button" className={filtersVisible ? 'active' : undefined} onClick={toggleFiltersVisible}>{t('filters')}</button>
        <select name="type" id="type" onChange={onTypeChange} value={type} title={t('searchType.searchType')} aria-label={t('searchType.searchType')}>
          {searchTypesDropdown.map((type) => <option key={type} value={type}>{t(`searchType.${type}`)}</option>)}
        </select>
      </div>
      <div className="item-group search-option-group">
        <div className="search-option">
          <input type="checkbox" name="caseInsensitive" id="caseInsensitive" checked={caseInsensitive} onChange={(e) => { setCaseInsensitive(e.target.checked); }}/>
          <label htmlFor="caseInsensitive">{t('caseInsensitive')}</label>
        </div>
        <div className="search-option">
          <input type="checkbox" name="common" id="common" checked={common} onChange={(e) => { setCommon(e.target.checked); }}/>
          <label htmlFor="common">{t('common')}</label>
        </div>
        <div className="search-option">
          <input type="checkbox" name="script" id="script" checked={script} onChange={(e) => { setScript(e.target.checked); }}/>
          <label htmlFor="script">{t('script')}</label>
        </div>
        <div className="search-option">
          <input type="checkbox" name="showAllLanguages" id="showAllLanguages" checked={showAllLanguages} onChange={(e) => { setShowAllLanguages(e.target.checked); }}/>
          <label htmlFor="showAllLanguages">{t('showAllLanguages')}</label>
        </div>
      </div>
    </div>
    { filters }
  </form>;
}

export default SearchForm;
