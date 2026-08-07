import { CSSProperties, Dispatch, SetStateAction, useEffect, useRef, useContext } from 'react';

import { CollectionKey, commonKeys, Corpus, FileKey, LanguageKey, scriptKeys } from '../../utils/corpus';
import LocalizationContext from "../LocalizationContext";

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

function hasValidFile(files: readonly FileKey[], common: boolean, script: boolean) {
  if (common && script)
    return true;

  const validFiles = new Set(files);
  if (!common) commonKeys.forEach((fileKey) => validFiles.delete(fileKey));
  if (!script) scriptKeys.forEach((fileKey) => validFiles.delete(fileKey));
  return validFiles.size > 0;
}

function getValidCollections(corpus: Corpus, languages: readonly string[], common: boolean, script: boolean) {
  // If no languages are selected, no collection is invalid yet.
  const validCollections = new Set<string>();
  if (languages.length === 0) {
    for (const [collectionKey, collection] of corpus.entries)
      if (hasValidFile(collection.files, common, script))
        validCollections.add(collectionKey);
    return validCollections;
  }

  // Otherwise, include all valid collections with at least one selected language.
  const languageSet = new Set(languages);
  for (const [collectionKey, collection] of corpus.entries)
    if (collection.languages.some((languageKey) => languageSet.has(languageKey)) && hasValidFile(collection.files, common, script))
      validCollections.add(collectionKey);
  return validCollections;
}

function getValidLanguages(corpus: Corpus, collections: readonly CollectionKey[]) {
  // If no collections are selected, no language is invalid yet.
  if (collections.length === 0)
    return new Set(corpus.languages);

  // Otherwise, include all valid languages for each selected collection.
  const validLanguages = new Set<string>();
  for (const collectionKey of collections)
    for (const languageKey of corpus.getCollection(collectionKey).languages)
      validLanguages.add(languageKey);
  return validLanguages;
}

function SearchCollections({corpus, language, collections, languages, setCollections, common, script}: {corpus: Corpus, language: string, collections: readonly CollectionKey[], languages: readonly LanguageKey[], setCollections: Dispatch<SetStateAction<readonly CollectionKey[]>>, common: boolean, script: boolean}) {
  const t = useContext(LocalizationContext);
  const isFullwidth = ['ja', 'ko', 'zh'].some((lang) => language.startsWith(lang));
  const validCollections = getValidCollections(corpus, languages, common, script);
  return (
    <>
      <div className="search-collections">
        {
          corpus.collections.map((key) => [key, t(`collections:${key}.name`), t(`collections:${key}.short`)] as const).map(([key, name, short]) =>
            <div key={key} className={`search-collection search-${validCollections.has(key) ? 'valid' : 'invalid'}`}>
              <input type="checkbox" name={`collection-${key}`} id={`collection-${key}`} checked={collections.includes(key)} onChange={(e) => {
                setCollections((prev) => e.target.checked ? prev.concat([key]) : prev.filter((value) => value !== key));
              }}/>
              <label htmlFor={`collection-${key}`} style={isFullwidth ? collectionLabelStyle(short) : undefined}>
                { (name === short) ? name : <abbr title={name}><span translate="no">{short}</span></abbr> }
              </label>
            </div>
          )
        }
      </div>
      <div className="item-group">
        <button disabled={collections.length === corpus.collections.length} onClick={() => { setCollections(corpus.collections); }}>{t('selectAll')}</button>
        <button disabled={collections.length === 0} onClick={() => { setCollections([]); }}>{t('deselectAll')}</button>
      </div>
    </>
  );
}

function SearchLanguages({corpus, language, collections, languages, setLanguages}: {corpus: Corpus, language: string, collections: readonly CollectionKey[], languages: readonly LanguageKey[], setLanguages: Dispatch<SetStateAction<readonly LanguageKey[]>>}) {
  const t = useContext(LocalizationContext);
  const isFullwidth = ['ja', 'ko', 'zh'].some((lang) => language.startsWith(lang));
  const validLanguages = getValidLanguages(corpus, collections);
  return (
    <>
      <div className="search-languages">
        {
          corpus.languages.filter((key) => key !== 'en-AU').map((key) => {
            let displayKey: LanguageKey | 'en-ZZ' = key;
            let keyArr: readonly LanguageKey[] = [key];
            if (key === 'en-GB') {
              displayKey = 'en-ZZ';
              keyArr = ['en-GB', 'en-AU'];
            }
            return [displayKey, keyArr, t(`languages:${displayKey}.name`), t(`languages:${displayKey}.code`)] as const;
          }).map(([key, keyArr, name, code]) =>
            <div key={key} className={`search-language search-${keyArr.some((key) => validLanguages.has(key)) ? 'valid' : 'invalid'}`}>
              <input type="checkbox" name={`language-${key}`} id={`language-${key}`} checked={keyArr.some((key) => languages.includes(key))} onChange={(e) => {
                setLanguages((prev) => e.target.checked ? prev.concat(keyArr) : prev.filter((value) => !keyArr.includes(value)));
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

function SearchFilters({corpus, language, filtersVisible, collections, setCollections, languages, setLanguages, common, script}: {corpus: Corpus, language: string, filtersVisible: boolean, collections: readonly CollectionKey[], setCollections: Dispatch<SetStateAction<readonly CollectionKey[]>>, languages: readonly LanguageKey[], setLanguages: Dispatch<SetStateAction<readonly LanguageKey[]>>, common: boolean, script: boolean}) {
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
          <SearchCollections corpus={corpus} language={language} collections={collections} languages={languages} setCollections={setCollections} common={common} script={script}/>
          <div className="search-filters-divider"></div>
          <SearchLanguages corpus={corpus} language={language} collections={collections} languages={languages} setLanguages={setLanguages}/>
        </>
      )}
    </div>
  );
}

export default SearchFilters;
