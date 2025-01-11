import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { SearchResultLines } from '../../webWorker/searchWorkerManager';
import Spinner from './Spinner';
import ProgressBar from '../ProgressBar';
import { Status, statusInProgress } from '../../utils/Status';

import './Results.css';
import './ResultsText.css';
import './ResultsTextColor.css';
import '../../i18n/config';
import { localStorageGetItem, localStorageSetItem } from '../../utils/utils';
import { defaultLimit } from '../../utils/utils';
import { ResultsSections, ShowSectionCallback } from './ResultsSections';

/**
 * Scrolls the results window to the specified section.
 * @param n Section index
 */
function jumpTo(n: number) {
  const results = document.getElementById("results");
  const section0 = document.getElementById(`results-section0`);
  const sectionN = document.getElementById(`results-section${n}`);
  if (results && section0 && sectionN) {
    results.scrollTop = sectionN.offsetTop - section0.offsetTop;
  }
}

function JumpToSelect({headers}: {headers: readonly string[]}) {
  const { t } = useTranslation();
  return <nav className="results-jump">
    <select name="jump" id="jump" onChange={(e) => jumpTo(Number(e.target.value))} value="">
      <option value="" disabled>{t('jumpTo')}</option>
      {headers.map((header, k) => (k === 0 || headers[k - 1] !== header) && <option key={k} value={k}>{header}</option>)}
    </select>
  </nav>;
}

function ResultsNav({count, offset, limit, setOffset}: {count: number, offset: number, limit: number, setOffset: Dispatch<SetStateAction<number>>}) {
  const { t } = useTranslation();
  return (
    <div className="results-nav">
      <div>
        <span className="results-nav-range-long">{t('displayedRange.long', {count: count, start: offset + 1, end: Math.min(count, offset + limit)})}</span>
        <span className="results-nav-range-short">{t('displayedRange.short', {count: count, start: offset + 1, end: Math.min(count, offset + limit)})}</span>
      </div>
      <button className='button-square' disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} title={t('loadPrev')}>{t('icons:loadPrev', {limit: limit})}</button>
      <button className='button-square' disabled={offset + limit >= count} onClick={() => setOffset(Math.min(Math.floor(count / limit) * limit, offset + limit))} title={t('loadNext')}>{t('icons:loadNext', {limit: limit})}</button>
    </div>
  );
}

interface ResultsPreferences {
  showVariables: number,
  showAllCharacters: boolean,
  showGender: number,
  showPlural: number,
  showGrammar: boolean,
  showFurigana: boolean,
}

const defaultResultsPreferences: Readonly<ResultsPreferences> = {
  showVariables: 0, // short
  showAllCharacters: false,
  showGender: 2, // all forms
  showPlural: 0, // all forms
  showGrammar: true,
  showFurigana: true,
};

const getSavedResultsPreferences = () => {
  const saved = localStorageGetItem('corpus-toggle');
  if (saved === null)
    return defaultResultsPreferences;

  const toggleDefault = {...defaultResultsPreferences};
  try {
    const toggle: Partial<ResultsPreferences> = JSON.parse(saved);
    if (toggle.showVariables !== undefined && [0, 1, 2].includes(toggle.showVariables))
      toggleDefault.showVariables = toggle.showVariables;
    if (toggle.showAllCharacters !== undefined && typeof toggle.showAllCharacters === 'boolean')
      toggleDefault.showAllCharacters = toggle.showAllCharacters;
    if (toggle.showGender !== undefined && [0, 1, 2].includes(toggle.showGender))
      toggleDefault.showGender = toggle.showGender;
    if (toggle.showPlural !== undefined && [0, 1, 2].includes(toggle.showPlural))
      toggleDefault.showPlural = toggle.showPlural;
    if (toggle.showGrammar !== undefined && typeof toggle.showGrammar === 'boolean')
      toggleDefault.showGrammar = toggle.showGrammar;
    if (toggle.showFurigana !== undefined && typeof toggle.showFurigana === 'boolean')
      toggleDefault.showFurigana = toggle.showFurigana;
  }
  catch {
    console.log('Failed to parse saved toggle preferences!');
  }
  return toggleDefault;
};

function Results({status, progress, results, showId = true, richText = true, limit = defaultLimit}: {status: Status, progress: number, showId: boolean, richText: boolean, results: readonly SearchResultLines[], limit?: number}) {
  const { t } = useTranslation();
  const initial = useMemo(getSavedResultsPreferences, []);
  const [showVariables, setShowVariables] = useState(initial.showVariables);
  const [showAllCharacters, setShowAllCharacters] = useState(initial.showAllCharacters);
  const [showGender, setShowGender] = useState(initial.showGender);
  const [showPlural, setShowPlural] = useState(initial.showPlural);
  const [showGrammar, setShowGrammar] = useState(initial.showGrammar);
  const [showFurigana, setShowFurigana] = useState(initial.showFurigana);
  const [offset, setOffset] = useState(0);

  // Save preferences on change
  useEffect(() => {
    localStorageSetItem('corpus-toggle', JSON.stringify({
      showVariables: showVariables,
      showAllCharacters: showAllCharacters,
      showGender: showGender,
      showPlural: showPlural,
      showGrammar: showGrammar,
      showFurigana: showFurigana,
    }));
  }, [showVariables, showAllCharacters, showGender, showPlural, showGrammar, showFurigana]);

  const onShowSection: ShowSectionCallback = (offset, index) => () => {
    setOffset(offset);
    jumpTo(index);
  };

  useEffect(() => {
    setOffset(0);
  }, [results]);

  const headers = useMemo(() => (
    results.map(({collection, file}) => t('tableHeader', {collection: t(`collections:${collection}.name`), file: t(`files:${file}`), interpolation: {escapeValue: false}}))
  ), [results, i18next.language]);

  const count = useMemo(() => (
    results.map((params) => params.lines.length).reduce((a, b) => a + b, 0)
  ), [results]);

  const resultsStatusText = t(import.meta.env.SSR ? t('status.loading') : `status.${status.split('.', 1)[0]}`);

  const resultsToggle = (
    <div className="results-toggle">
      <button className={showVariables !== 2 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowVariables((showVariables + 1) % 3); }} title={t('showVariables')}>{t('icons:showVariables', {context: showVariables})}</button>
      <button className={showAllCharacters ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowAllCharacters(!showAllCharacters); }} title={t('showAllCharacters')}>{t('icons:showAllCharacters')}</button>
      <button className={showGender !== 2 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowGender((showGender + 1) % 3); }} title={t('showGender')}>{t('icons:showGender', {context: showGender})}</button>
      <button className={showPlural !== 0 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowPlural((showPlural + 1) % 3); }} title={t('showPlural')}>{t('icons:showPlural', {context: showPlural})}</button>
      <button className={showGrammar ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowGrammar(!showGrammar); }} title={t('showGrammar')}>{t('icons:showGrammar')}</button>
      <button className={showFurigana ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowFurigana(!showFurigana); }} title={t('showFurigana')}><span className='results-toggle-furigana'>{t('icons:showFurigana')}</span></button>
    </div>
  );

  return (
    <>
      <div className="search results-status">
        { headers.length > 1 ? <JumpToSelect headers={headers} /> : <div className="results-status-text">{resultsStatusText}</div> }
        <Spinner src="logo.svg" active={statusInProgress.includes(status)}/>
        { count > limit ? <ResultsNav count={count} offset={offset} limit={limit} setOffset={setOffset} /> : <ProgressBar progress={progress} /> }
        { resultsToggle }
      </div>
      <ResultsSections className={`search results app-window variables-${['short', 'show', 'hide'][showVariables]} control-${showAllCharacters ? 'show' : 'hide'} gender-${showGender} number-${showPlural} grammar-${showGrammar ? 'show' : 'hide'} furigana-${showFurigana ? 'show' : 'hide'} rich-text-${richText ? 'enabled' : 'disabled'}`}
        results={results} headers={headers} showId={showId} offset={offset} limit={limit} onShowSection={onShowSection} jumpTo={jumpTo} />
    </>
  );
}

export default Results;
