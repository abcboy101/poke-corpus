import { Dispatch, MouseEventHandler, SetStateAction, useEffect, useMemo, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { SearchResultLines } from '../webWorker/searchWorkerManager';
import corpus, { codeId, langId } from '../utils/corpus';
import Share from './Share';
import Spinner from './Spinner';
import ProgressBar from './ProgressBar';
import ViewNearby from './ViewNearby';
import Copy from './Copy';
import { Status, statusInProgress } from '../utils/Status';

import './Results.css';
import './ResultsText.css';
import logo from '../res/logo.svg';
import '../i18n/config';

const jumpTo = (k: number) => {
  const results = document.getElementById("results");
  const section0 = document.getElementById(`results-section0`);
  const sectionk = document.getElementById(`results-section${k}`);
  if (results && section0 && sectionk) {
    results.scrollTop = sectionk.offsetTop - section0.offsetTop;
  }
};

function JumpToSelect({headers}: {headers: readonly string[]}) {
  const { t } = useTranslation();
  return <nav className="results-jump">
    <select name="jump" id="jump" onChange={(e) => jumpTo(parseInt(e.target.value, 10))} value="">
      <option value="" disabled>{t('jumpTo')}</option>
      {headers.map((header, k) => (k === 0 || headers[k - 1] !== header) && <option key={k} value={k}>{header}</option>)}
    </select>
  </nav>;
}

function ResultsTable({header, collection, languages, lines, displayHeader, k, count, start = 0, end, setOffset}: {header: string, collection: string, languages: readonly string[], lines: readonly string[][], displayHeader: boolean, k: number, count: number, start?: number, end?: number, setOffset: Dispatch<SetStateAction<number>>}) {
  const { t } = useTranslation();
  const idIndex = languages.indexOf(codeId);
  const displayLanguages = languages.map((lang) => lang === codeId ? langId : lang);
  const displayDirs = displayLanguages.map((lang) => i18next.dir(lang));
  const sameDir = displayDirs.every((dir) => dir === displayDirs[0]);
  const slicedLines = (start !== 0 || end !== undefined) ? lines.slice(start, end) : lines;
  const onClick = (count: number): MouseEventHandler<HTMLButtonElement> => () => {
    setOffset(count);
    jumpTo(k);
  };
  const copyOnClick = (tableId: string): MouseEventHandler<HTMLButtonElement> => async () => {
    const table = document.getElementById(tableId);
    const sel = window.getSelection();
    if (sel !== null && table !== null) {
      sel.removeAllRanges();
      sel.selectAllChildren(table);
      document.execCommand('copy');
      sel.removeAllRanges();
    }
  };

  useEffect(() => {
    const speakers = Array.from(document.getElementsByClassName('speaker'));
    const params = new URLSearchParams(window.location.hash.substring(1));
    speakers.forEach((element) => {
      if (element instanceof HTMLAnchorElement) {
        const query = element.getAttribute('data-var');
        const collection = element.closest('table')?.getAttribute('data-collection') ?? '';
        if (query !== null) {
          params.set('query', query);
          params.set('type', 'exact');
          params.set('collections', collection);
          element.setAttribute('href', `#${params}`);
          element.setAttribute('title', t('viewSpeaker'));
        }
      }
    });
  }, [t, slicedLines]);

  return (
    <section id={`results-section${k}`} className='results-table-container'>
      <h2 className={displayHeader ? undefined : 'd-none'}>{header}</h2>
      { start !== 0 ? <button className="results-notice" onClick={onClick(count)}>{t('tablePartial', {count: start})}</button> : null }
      { slicedLines.length > 0
        ? <table id={`results-section${k}-table`} className={`results-table collection-${corpus.collections[collection].id ?? collection.toLowerCase()}`} data-collection={collection}>
          <thead>
            <tr>
              {idIndex !== -1 ? <th className="results-table-actions-cell"><Copy callback={copyOnClick(`results-section${k}-table`)}/></th> : null}
              {languages.map((lang) => <th key={lang}><abbr title={t(`languages:${lang}.name`)}>{t(`languages:${lang}.code`)}</abbr></th>)}
            </tr>
          </thead>
          <tbody dir={sameDir && displayDirs[0] !== i18next.dir() ? displayDirs[0] : undefined}>
            {slicedLines.map((row, i) => {
              return <tr key={i}>
                {idIndex !== -1
                  ? <td key="actions" className="results-table-actions-cell">
                    <div className="results-table-actions">
                      <Share hash={`#id=${row[idIndex]}`}/>
                      <ViewNearby hash={`#file=${row[idIndex].split('.').slice(0, -1).join('.')}`}/>
                    </div>
                  </td> : null}
                {row.map((s, j) => <td key={j} lang={displayLanguages[j]} dir={sameDir ? undefined : displayDirs[j]} dangerouslySetInnerHTML={{__html: s}}></td>)}
              </tr>;
            })}
          </tbody>
        </table>
        : null
      }
      { end !== undefined && end < lines.length ? <button className="results-notice" onClick={onClick(count + end)}>{t('tablePartial', {count: lines.length - end})}</button> : null }
    </section>
  );
}

function Results({status, progress, results, limit = 1000}: {status: Status, progress: number, results: readonly SearchResultLines[], limit?: number}) {
  const { t } = useTranslation();
  const [showVariables, setShowVariables] = useState(true);
  const [showAllCharacters, setShowAllCharacters] = useState(false);
  const [showGender, setShowGender] = useState(2);
  const [showPlural, setShowPlural] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [results]);

  // Wrap in useMemo to prevent expensive recalculations.
  // Only changes to results, limit, offset, or language will affect the generated HTML.
  // All of the other toggles only change a CSS class.
  const [count, headers, resultTables] = useMemo(() => {
    let count = 0;
    const headers = results.map(({collection, file}) => t('tableHeader', {collection: t(`collections:${collection}.name`), file: t(`files:${file}`), interpolation: {escapeValue: false}}));
    const resultTables: JSX.Element[] = [];
    results.forEach(({collection, lines, languages, displayHeader}, k) => {
      const start = Math.max(0, Math.min(lines.length, offset - count));
      const end = Math.max(0, Math.min(lines.length, (offset + limit) - count));
      resultTables.push(
        <ResultsTable key={k} header={headers[k]} collection={collection} lines={lines} languages={languages} displayHeader={displayHeader} k={k} count={count} start={start} end={end} setOffset={setOffset} />
      );
      count += lines.length;
    });
    return [count, headers, resultTables] as const;
  }, [results, limit, offset, i18next.language]);

  return (
    <>
      <div className="search results-status">
        {
          headers.length > 1 ? <JumpToSelect headers={headers} />
            : <div className="results-status-text">{t(`status.${status.split('.', 1)[0]}`)}</div>
        }
        <Spinner src={logo} active={statusInProgress.includes(status)}/>
        {
          count > limit ? (
            <div className="results-nav">
              <div>
                <span className="results-nav-range-long">{t('displayedRange.long', {count: count, start: offset + 1, end: Math.min(count, offset + limit)})}</span>
                <span className="results-nav-range-short">{t('displayedRange.short', {count: count, start: offset + 1, end: Math.min(count, offset + limit)})}</span>
              </div>
              <button className='button-square' onClick={() => setOffset(Math.max(0, offset - limit))}>{t('loadPrev', {limit: limit})}</button>
              <button className='button-square' onClick={() => setOffset(Math.min(Math.floor(count / limit) * limit, offset + limit))}>{t('loadNext', {limit: limit})}</button>
            </div>
          ) : <ProgressBar progress={progress} />
        }
        <div className="results-toggle">
          <button className={showVariables ? 'button-square active' : 'button-square'} onClick={() => { setShowVariables(!showVariables); }} title={t('showVariables')}>{t('showVariablesIcon')}</button>
          <button className={showAllCharacters ? 'button-square active' : 'button-square'} onClick={() => { setShowAllCharacters(!showAllCharacters); }} title={t('showAllCharacters')}>{t('showAllCharactersIcon')}</button>
          <button className={showGender !== 2 ? 'button-square active' : 'button-square'} onClick={() => { setShowGender((showGender + 1) % 3); }} title={t('showGender')}>{t('showGenderIcon', {context: showGender})}</button>
          <button className={showPlural !== 0 ? 'button-square active' : 'button-square'} onClick={() => { setShowPlural((showPlural + 1) % 3); }} title={t('showPlural')}>{t('showPluralIcon', {context: showPlural})}</button>
          <button className={showFurigana ? 'button-square active' : 'button-square'} onClick={() => { setShowFurigana(!showFurigana); }} title={t('showFurigana')}><span className='results-toggle-furigana'>{t('showFuriganaIcon')}</span></button>
        </div>
      </div>
      <main id="results" className={`search results app-window variables-${showVariables ? 'show' : 'hide'} control-${showAllCharacters ? 'show' : 'hide'} gender-${showGender} number-${showPlural} furigana-${showFurigana ? 'show' : 'hide'}`}>
        { resultTables }
      </main>
    </>
  );
}

export default Results;
