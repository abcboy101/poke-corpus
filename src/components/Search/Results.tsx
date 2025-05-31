import { Dispatch, ReactNode, SetStateAction, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import Spinner from './Spinner';
import ProgressBar from '../ProgressBar';
import NoScript from './NoScript';
import { isStatusInProgress, Status } from '../../utils/Status';

import './Results.css';
import '../../i18n/config';
import { defaultLimit, localStorageGetItem, localStorageSetItem, parseJSONNullable } from '../../utils/utils';
import { ResultsSections, ShowSectionCallback } from './ResultsSections';
import { Result, SectionHeader } from '../../utils/searchResults';

/**
 * Scrolls the results window to the specified section.
 * @param n Section index
 */
function jumpTo(n: number) {
  const results = document.getElementById("results");
  const target = document.getElementById(`results-section${n}`);
  const first = results?.firstElementChild;
  if (results && target && first instanceof HTMLElement) {
    results.scrollTop = target.offsetTop - first.offsetTop;
  }
}

function JumpToSelect({headers}: {headers: readonly SectionHeader[]}) {
  const { t } = useTranslation();
  return <nav className="results-jump">
    <select name="jump" id="jump" onChange={(e) => { jumpTo(Number(e.target.value)); }} value="">
      <option value="" disabled>{t('jumpTo')}</option>
      {headers.map((header, k) => header !== undefined && (k === 0 || headers[k - 1] !== header) && <option key={k} value={k}>{header}</option>)}
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
      <button className='button-square' disabled={offset === 0} onClick={() => { setOffset(Math.max(0, offset - limit)); }} title={t('loadPrev')}>{t('icons:loadPrev', {limit: limit})}</button>
      <button className='button-square' disabled={offset + limit >= count} onClick={() => { setOffset(Math.min(Math.floor(count / limit) * limit, offset + limit)); }} title={t('loadNext')}>{t('icons:loadNext', {limit: limit})}</button>
    </div>
  );
}

interface ResultsPreferences {
  readonly showVariables: number,
  readonly showAllCharacters: boolean,
  readonly showGender: number,
  readonly showPlural: number,
  readonly showGrammar: boolean,
  readonly showFurigana: boolean,
}

const defaultResultsPreferences: ResultsPreferences = {
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
  const toggle = parseJSONNullable(saved);
  if (typeof toggle === 'object' && toggle !== null) {
    if ('showVariables' in toggle && typeof toggle.showVariables === 'number' && [0, 1, 2].includes(toggle.showVariables))
      toggleDefault.showVariables = toggle.showVariables;
    if ('showAllCharacters' in toggle && typeof toggle.showAllCharacters === 'boolean')
      toggleDefault.showAllCharacters = toggle.showAllCharacters;
    if ('showGender' in toggle && typeof toggle.showGender === 'number' && [0, 1, 2].includes(toggle.showGender))
      toggleDefault.showGender = toggle.showGender;
    if ('showPlural' in toggle && typeof toggle.showPlural === 'number' && [0, 1, 2].includes(toggle.showPlural))
      toggleDefault.showPlural = toggle.showPlural;
    if ('showGrammar' in toggle && typeof toggle.showGrammar === 'boolean')
      toggleDefault.showGrammar = toggle.showGrammar;
    if ('showFurigana' in toggle && typeof toggle.showFurigana === 'boolean')
      toggleDefault.showFurigana = toggle.showFurigana;
  }
  return toggleDefault;
};

function Results({status, progress, results, showId = true, richText = true, limit = defaultLimit}: {status: Status, progress: number, showId: boolean, richText: boolean, results: readonly Result[], limit?: number}) {
  const { t } = useTranslation();
  const initial = useMemo(getSavedResultsPreferences, []);
  const [showVariables, setShowVariables] = useState(initial.showVariables);
  const [showAllCharacters, setShowAllCharacters] = useState(initial.showAllCharacters);
  const [showGender, setShowGender] = useState(initial.showGender);
  const [showPlural, setShowPlural] = useState(initial.showPlural);
  const [showGrammar, setShowGrammar] = useState(initial.showGrammar);
  const [showFurigana, setShowFurigana] = useState(initial.showFurigana);
  const [sections, setSections] = useState<ReactNode>(null);
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

  const onShowSection: ShowSectionCallback = useCallback((offset, index) => () => {
    setOffset(offset);
    jumpTo(index);
  }, []);

  const headers = useMemo(() => {
    const headers: SectionHeader[] = [];
    let lastHeader = '';
    for (const result of results) {
      if (result.status === 'initial' || result.status === 'noLines') {
        headers.push(undefined);
        continue;
      }
      const {collection, file} = result.params;
      const header = t('tableHeader', {collection: t(`collections:${collection}.name`), file: t(`files:${file}`), interpolation: {escapeValue: false}});
      headers.push(header === lastHeader ? undefined : header);
      lastHeader = header;
    }
    return headers;
  }, [results, i18next.language]);

  const count = useMemo(() => (
    results.reduce((acc, result) => acc + (result.status === 'initial' ? 0 : result.params.lines.length), 0)
  ), [results]);
  if (count < offset)
    setOffset((prev) => Math.min(prev, count));

  const resultsToggle = (
    <div className="results-toggle">
      <button className={showVariables !== 2 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowVariables((showVariables + 1) % 3); }} title={t('showVariables')}>
        <span translate='no'>{t('icons:showVariables', {context: showVariables})}</span>
      </button>
      <button className={showAllCharacters ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowAllCharacters(!showAllCharacters); }} title={t('showAllCharacters')}>
        <span translate='no'>{t('icons:showAllCharacters')}</span>
      </button>
      <button className={showGender !== 2 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowGender((showGender + 1) % 3); }} title={t('showGender')}>
        <span translate='no'>{t('icons:showGender', {context: showGender})}</span>
      </button>
      <button className={showPlural !== 0 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowPlural((showPlural + 1) % 3); }} title={t('showPlural')}>
        <span translate='no'>{t('icons:showPlural', {context: showPlural})}</span>
      </button>
      <button className={showGrammar ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowGrammar(!showGrammar); }} title={t('showGrammar')}>
        <span translate='no'>{t('icons:showGrammar')}</span>
      </button>
      <button className={showFurigana ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowFurigana(!showFurigana); }} title={t('showFurigana')}>
        <span className='results-toggle-furigana' translate='no'>{t('icons:showFurigana')}</span>
      </button>
    </div>
  );

  useEffect(() => {
    // Wrap in startTransition to allow it to be rendered in the background.
    startTransition(() => {
      setSections(<ResultsSections results={results} headers={headers} showId={showId} offset={offset} limit={limit} onShowSection={onShowSection} jumpTo={jumpTo} />);
    });
  }, [results, headers, showId, offset, limit, onShowSection, jumpTo]);

  const inProgress = isStatusInProgress(status);
  const resultsStatusText = t(import.meta.env.SSR ? 'status.loading' : `status.${status.split('.', 1)[0]}`);
  const statusBarLeft = useMemo(() => (
    !inProgress && headers.filter((header) => header !== undefined).length > 1 ? <JumpToSelect headers={headers} /> : <div className="results-status-text">{resultsStatusText}</div>
  ), [inProgress, headers]);

  const classes = `app-window variables-${['short', 'show', 'hide'][showVariables]} control-${showAllCharacters ? 'show' : 'hide'} gender-${showGender} number-${showPlural} grammar-${showGrammar ? 'show' : 'hide'} furigana-${showFurigana ? 'show' : 'hide'}`;
  return (
    <>
      <div className="results-status">
        { statusBarLeft }
        <Spinner src="logo.svg" active={inProgress}/>
        { !inProgress && count > limit ? <ResultsNav count={count} offset={offset} limit={limit} setOffset={setOffset} /> : <ProgressBar progress={progress} /> }
        { resultsToggle }
      </div>
      <main id="results" className={classes}>
        { import.meta.env.SSR ? <NoScript /> : sections }
      </main>
    </>
  );
}

export default Results;
