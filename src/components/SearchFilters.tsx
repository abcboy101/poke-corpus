import { Dispatch, SetStateAction } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { corpus } from '../webWorker/corpus';

import '../i18n/config';

function SearchCollections({collections, setCollections}: {collections: readonly string[], setCollections: Dispatch<SetStateAction<readonly string[]>>}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="search-collections">
        {
          Object.keys(corpus.collections).map((key) =>
            <div key={key} className="search-collection">
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
      <div className="search-button-group">
        <button disabled={collections.length === Object.keys(corpus.collections).length} onClick={(e) => { setCollections(Object.keys(corpus.collections)); }}>{t('selectAll')}</button>
        <button disabled={collections.length === 0} onClick={(e) => { setCollections([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  )
}

function SearchLanguages({languages, setLanguages}: {languages: readonly string[], setLanguages: Dispatch<SetStateAction<readonly string[]>>}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="search-languages">
        {
          corpus.languages.map((key) =>
            <div key={key} className="search-language">
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
                <span className="search-language-code"><abbr title={t(`languages:${key}.name`)}>{t(`languages:${key}.code`)}</abbr></span>
                <span className="search-language-name">{t(`languages:${key}.name`)}</span>
              </label>
            </div>
          )
        }
      </div>
      <div className="search-button-group">
        <button disabled={languages.length === Object.keys(corpus.languages).length} onClick={(e) => { setLanguages(corpus.languages); }}>{t('selectAll')}</button>
        <button disabled={languages.length === 0} onClick={(e) => { setLanguages([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  )
}

function SearchFilters({filtersVisible, collections, setCollections, languages, setLanguages}: {filtersVisible: boolean, collections: readonly string[], setCollections: Dispatch<SetStateAction<readonly string[]>>, languages: readonly string[], setLanguages: Dispatch<SetStateAction<readonly string[]>>}) {
  return (
    <div className={`search-filters search-filters-${filtersVisible ? 'show' : 'hide'}`}>
      <SearchCollections collections={collections} setCollections={setCollections}/>
      <div className="search-filters-divider"></div>
      <SearchLanguages languages={languages} setLanguages={setLanguages}/>
    </div>
  );
}

export default SearchFilters;
