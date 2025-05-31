import { CSSProperties, Dispatch, SetStateAction, useEffect, useRef } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import corpus, { corpusKeys, CollectionKey, LanguageKey } from '../../utils/corpus';

import './SearchFilters.css';
import '../../i18n/config';

/**
 * Calculates the appropriate styles for a search filter collection label.
 *
 * Due to space constraints, strings longer than four fullwidth CJK characters do not fit.
 * We adjust the character scaling for these so that the whole string can be displayed.
 * To approximate the length, Latin-1 characters are treated as halfwidth, and all others as fullwidth.
 */
function collectionLabelStyle(text: string, maxWidth = 4): CSSProperties | undefined {
  let width = 0;
  for (let i = 0; i < text.length; i++)
    width += (text.charCodeAt(i) > 0xFF) ? 1 : 0.5;
  return width <= maxWidth ? undefined : {fontSize: `${(maxWidth * 100) / width}%`, scale: `1 ${width / maxWidth}`, whiteSpace: 'nowrap'};
}

function getValidCollections(languages: readonly string[]) {
  // If no languages are selected, no collection is invalid yet.
  if (languages.length === 0)
    return new Set(corpusKeys);

  // Otherwise, include all valid collections with at least one selected language.
  const validCollections = new Set<string>();
  const languageSet = new Set(languages);
  for (const collectionKey of corpusKeys)
    if (corpus.collections[collectionKey].languages.some((languageKey) => languageSet.has(languageKey)))
      validCollections.add(collectionKey);
  return validCollections;
}

function getValidLanguages(collections: readonly CollectionKey[]) {
  // If no collections are selected, no language is invalid yet.
  if (collections.length === 0)
    return new Set(corpus.languages);

  // Otherwise, include all valid languages for each selected collection.
  const validLanguages = new Set<string>();
  for (const collectionKey of collections)
    for (const languageKey of corpus.collections[collectionKey].languages)
      validLanguages.add(languageKey);
  return validLanguages;
}

function SearchCollections({collections, languages, setCollections}: {collections: readonly CollectionKey[], languages: readonly LanguageKey[], setCollections: Dispatch<SetStateAction<readonly CollectionKey[]>>}) {
  const { t } = useTranslation();
  const isFullwidth = ['ja', 'ko', 'zh'].some((lang) => i18next.language.startsWith(lang));
  const validCollections = getValidCollections(languages);
  return (
    <>
      <div className="search-collections">
        {
          corpusKeys.map((key) => [key, t(`collections:${key}.name`), t(`collections:${key}.short`)] as const).map(([key, name, short]) =>
            <div key={key} className={`search-collection search-${validCollections.has(key) ? 'valid' : 'invalid'}`}>
              <input type="checkbox" name={`collection-${key}`} id={`collection-${key}`} checked={collections.includes(key)} onChange={(e) => {
                if (e.target.checked && !collections.includes(key)) {
                  setCollections(collections.concat([key]));
                }
                else if (!e.target.checked && collections.includes(key)) {
                  setCollections(collections.filter((value) => value !== key));
                }
              }}/>
              <label htmlFor={`collection-${key}`} style={isFullwidth ? collectionLabelStyle(short) : undefined}>
                { (name === short) ? name : <abbr title={name}><span translate="no">{short}</span></abbr> }
              </label>
            </div>
          )
        }
      </div>
      <div className="item-group">
        <button disabled={collections.length === corpusKeys.length} onClick={() => { setCollections(corpusKeys); }}>{t('selectAll')}</button>
        <button disabled={collections.length === 0} onClick={() => { setCollections([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  );
}

function SearchLanguages({collections, languages, setLanguages}: {collections: readonly CollectionKey[], languages: readonly LanguageKey[], setLanguages: Dispatch<SetStateAction<readonly LanguageKey[]>>}) {
  const { t } = useTranslation();
  const isFullwidth = ['ja', 'ko', 'zh'].some((lang) => i18next.language.startsWith(lang));
  const validLanguages = getValidLanguages(collections);
  return (
    <>
      <div className="search-languages">
        {
          corpus.languages.map((key) => [key, t(`languages:${key}.name`), t(`languages:${key}.code`)] as const).map(([key, name, code]) =>
            <div key={key} className={`search-language search-${validLanguages.has(key) ? 'valid' : 'invalid'}`}>
              <input type="checkbox" name={`language-${key}`} id={`language-${key}`} checked={languages.includes(key)} onChange={(e) => {
                if (e.target.checked && !languages.includes(key)) {
                  setLanguages(languages.concat([key]));
                }
                else if (!e.target.checked && languages.includes(key)) {
                  setLanguages(languages.filter((value) => value !== key));
                }
              }}/>
              <label htmlFor={`language-${key}`}>
                <span className="search-language-code"><abbr title={name}><span translate="no">{code}</span></abbr></span>
                <span className="search-language-name" style={isFullwidth ? collectionLabelStyle(name, 12) : collectionLabelStyle(name, 15)}>{name}</span>
              </label>
            </div>
          )
        }
      </div>
      <div className="item-group">
        <button disabled={languages.length === corpus.languages.length} onClick={() => { setLanguages(corpus.languages); }}>{t('selectAll')}</button>
        <button disabled={languages.length === 0} onClick={() => { setLanguages([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  );
}

function SearchFilters({filtersVisible, collections, setCollections, languages, setLanguages}: {filtersVisible: boolean, collections: readonly CollectionKey[], setCollections: Dispatch<SetStateAction<readonly CollectionKey[]>>, languages: readonly LanguageKey[], setLanguages: Dispatch<SetStateAction<readonly LanguageKey[]>>}) {
  const filtersRef = useRef<HTMLDivElement>(null);
  const updateFiltersHeight = () => filtersRef.current?.style.setProperty('--search-filters-height', `${filtersRef.current.scrollHeight}px`);
  useEffect(() => {
    if (CSS.supports('interpolate-size', 'allow-keywords'))
      return;
    updateFiltersHeight();
    window.addEventListener('resize', updateFiltersHeight);
    return () => { window.removeEventListener('resize', updateFiltersHeight); };
  }, []);

  return (
    <div ref={filtersRef} className={`search-filters search-filters-${filtersVisible ? 'show' : 'hide'}`}>
      { !import.meta.env.SSR && (
        <>
          <SearchCollections collections={collections} languages={languages} setCollections={setCollections}/>
          <div className="search-filters-divider"></div>
          <SearchLanguages collections={collections} languages={languages} setLanguages={setLanguages}/>
        </>
      )}
    </div>
  );
}

export default SearchFilters;
