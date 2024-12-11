import { CSSProperties, Dispatch, SetStateAction } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { corpus } from '../../utils/corpus';

import '../../i18n/config';

/**
 * Calculates the appropriate styles for a search filter collection label.
 *
 * Due to space constraints, strings longer than four fullwidth CJK characters do not fit.
 * We adjust the character scaling for these so that the whole string can be displayed.
 * To approximate the length, Latin-1 characters are treated as halfwidth, and all others as fullwidth.
 */
function collectionLabelStyle(text: string, maxWidth: number = 4): CSSProperties | undefined {
  const width = [...text].map((c) => (c.codePointAt(0)! > 0xFF) ? 1 : 0.5).reduce((a, b) => a + b, 0);
  if (width <= maxWidth)
    return undefined;
  return {fontSize: `${(maxWidth * 100) / width}%`, scale: `1 ${width / maxWidth}`, whiteSpace: 'nowrap'};
}

function getValidCollections(languages: readonly string[]) {
  // If no languages are selected, no collection is invalid yet.
  if (languages.length === 0)
    return new Set(Object.keys(corpus.collections));

  // Otherwise, include all valid collections with at least one selected language.
  const validCollections = new Set<string>();
  const languageSet = new Set(languages);
  for (const collectionKey of Object.keys(corpus.collections))
    if (corpus.collections[collectionKey].languages.some((languageKey) => languageSet.has(languageKey)))
      validCollections.add(collectionKey);
  return validCollections;
}

function getValidLanguages(collections: readonly string[]) {
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

function SearchCollections({collections, languages, setCollections}: {collections: readonly string[], languages: readonly string[], setCollections: Dispatch<SetStateAction<readonly string[]>>}) {
  const { t } = useTranslation();
  const isFullwidth = ['ja', 'ko', 'zh'].some((lang) => i18next.language.startsWith(lang));
  const validCollections = getValidCollections(languages);
  return (
    <>
      <div className="search-collections">
        {
          Object.keys(corpus.collections).map((key) => [key, t(`collections:${key}.name`), t(`collections:${key}.short`)] as const).map(([key, name, short]) =>
            <div key={key} className={`search-collection search-${validCollections.has(key) ? 'valid' : 'invalid'}`}>
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
              <label htmlFor={`collection-${key}`} style={isFullwidth ? collectionLabelStyle(short) : undefined}>
                <abbr title={name}>{short}</abbr>
              </label>
            </div>
          )
        }
      </div>
      <div className="item-group">
        <button disabled={collections.length === Object.keys(corpus.collections).length} onClick={() => { setCollections(Object.keys(corpus.collections)); }}>{t('selectAll')}</button>
        <button disabled={collections.length === 0} onClick={() => { setCollections([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  );
}

function SearchLanguages({collections, languages, setLanguages}: {collections: readonly string[], languages: readonly string[], setLanguages: Dispatch<SetStateAction<readonly string[]>>}) {
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
                <span className="search-language-code"><abbr title={name}>{code}</abbr></span>
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

function SearchFilters({filtersVisible, collections, setCollections, languages, setLanguages}: {filtersVisible: boolean, collections: readonly string[], setCollections: Dispatch<SetStateAction<readonly string[]>>, languages: readonly string[], setLanguages: Dispatch<SetStateAction<readonly string[]>>}) {
  return (
    <div className={`search-filters search-filters-${filtersVisible ? 'show' : 'hide'}`}>
      <SearchCollections collections={collections} languages={languages} setCollections={setCollections}/>
      <div className="search-filters-divider"></div>
      <SearchLanguages collections={collections} languages={languages} setLanguages={setLanguages}/>
    </div>
  );
}

export default SearchFilters;
