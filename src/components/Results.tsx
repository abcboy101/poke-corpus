import { MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react';
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
import './ResultsTextColor.css';
import logo from '../res/logo.svg';
import '../i18n/config';
import { expandSpeakers } from '../utils/speaker';
import { SearchTaskResultLines } from '../webWorker/searchWorker';
import { defaultLimit } from '../utils/utils';

/**
 * Scrolls the results window to the specified section.
 * @param n Section index
 */
const jumpTo = (n: number) => {
  const results = document.getElementById("results");
  const section0 = document.getElementById(`results-section0`);
  const sectionN = document.getElementById(`results-section${n}`);
  if (results && section0 && sectionN) {
    results.scrollTop = sectionN.offsetTop - section0.offsetTop;
  }
};

function JumpToSelect({headers}: {headers: readonly string[]}) {
  const { t } = useTranslation();
  return <nav className="results-jump">
    <select name="jump" id="jump" onChange={(e) => jumpTo(Number(e.target.value))} value="">
      <option value="" disabled>{t('jumpTo')}</option>
      {headers.map((header, k) => (k === 0 || headers[k - 1] !== header) && <option key={k} value={k}>{header}</option>)}
    </select>
  </nav>;
}

function Rendering() {
  const { t } = useTranslation();
  return <div className="results-rendering">{t('status.rendering')}</div>;
}

function Actions({id}: {id: string}) {
  return (
    <td key="actions" className="results-table-actions-cell">
      <div className="results-table-actions">
        <Share hash={`#id=${id}`}/>
        <ViewNearby hash={`#file=${id.split('.').slice(0, -1).join('.')}`}/>
      </div>
    </td>
  );
}

function ResultsTable({collection, file, languages, lines, showId}: SearchTaskResultLines & {showId: boolean}) {
  const { t } = useTranslation();
  const idIndex = languages.indexOf(codeId);
  const displayLanguages = languages.map((lang) => lang === codeId ? langId : lang);
  const viewSpeaker = t('viewSpeaker');
  const hasSpeakers = corpus.collections[collection].speaker !== undefined;

  // RTL support: if the interface language uses a different direction, make sure to tag each cell with its direction
  const displayDirs = displayLanguages.map((lang) => i18next.dir(lang));
  const sameDir = displayDirs.every((dir) => dir === displayDirs[0]);

  const tableRef = useRef(null);
  const copyOnClick: MouseEventHandler<HTMLButtonElement> = () => {
    const table = tableRef.current;
    const sel = window.getSelection();
    if (sel !== null && table !== null) {
      sel.removeAllRanges();
      sel.selectAllChildren(table);
      document.execCommand('copy');
      sel.removeAllRanges();
    }
  };

  return (
    <div className="results-table-container">
      <table ref={tableRef} className={`results-table collection-${corpus.collections[collection].id ?? collection.toLowerCase()} file-${file}`}>
        <thead>
          <tr>
            {idIndex !== -1 ? <th className="results-table-actions-cell"><Copy callback={copyOnClick}/></th> : null}
            {languages.filter((lang) => showId || lang !== codeId).map((lang) => <th key={lang}><abbr title={t(`languages:${lang}.name`)}>{t(`languages:${lang}.code`)}</abbr></th>)}
          </tr>
        </thead>
        <tbody dir={sameDir && displayDirs[0] !== i18next.dir() ? displayDirs[0] : undefined}>
          {lines.map((row, i) =>
            <tr key={i} data-id={idIndex !== -1 ? row[idIndex] : undefined}>
              {idIndex !== -1 ? <Actions id={row[idIndex]}/> : null}
              {row.map((s, j) => (showId || languages[j] !== codeId)
                ? <td key={j} lang={displayLanguages[j]} dir={sameDir ? undefined : displayDirs[j]}
                  dangerouslySetInnerHTML={{__html: hasSpeakers ? expandSpeakers(s, collection, languages[j], viewSpeaker) : s}}></td>
                : undefined)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface ResultsSectionContentParams extends SearchTaskResultLines {
  sectionOffset: number,
  offset: number,
  limit: number,
  index: number,
  showId: boolean,
  onShowSection: ShowSectionCallback,
}

type ShowSectionCallback = (offset: number, index: number) => () => void;

/** Content of a results section, including warnings when only part of a table is shown. */
function ResultsSectionContent({lines, index, sectionOffset, offset, limit, onShowSection, ...params}: ResultsSectionContentParams) {
  const { t } = useTranslation();
  const start = Math.max(0, Math.min(lines.length, offset - sectionOffset));
  const end = Math.max(0, Math.min(lines.length, (offset + limit) - sectionOffset));
  const slicedLines = (start !== 0 || end !== undefined) ? lines.slice(start, end) : lines;

  return <>
    { start !== 0 ? <button className="results-notice" onClick={onShowSection(sectionOffset, index)}>{t('tablePartial', {count: start})}</button> : null }
    { start !== end && <ResultsTable key={index} {...params} lines={slicedLines} /> }
    { end !== undefined && end < lines.length ? <button className="results-notice" onClick={onShowSection(sectionOffset + end, index)}>{t('tablePartial', {count: lines.length - end})}</button> : null }
  </>;
}

/** Results section, including its header. */
function ResultsSection({header, displayHeader, ...params}: {header: string, displayHeader: boolean} & ResultsSectionContentParams) {
  const [content, setContent] = useState<JSX.Element>(<Rendering/>);

  // On prev/next navigation, scroll to first section displayed.
  useEffect(() => {
    const jumpToThis = params.offset >= params.sectionOffset && params.offset < (params.sectionOffset + params.lines.length);
    if (jumpToThis)
      jumpTo(params.index);
  }, [params.offset]);

  // Load content in useEffect so that it doesn't block immediately.
  useEffect(() => {
    setContent(<ResultsSectionContent {...params}/>);
  }, Object.values(params));

  return (
    <section id={`results-section${params.index}`} className='results-section'>
      <h2 className={displayHeader ? undefined : 'd-none'}>{header}</h2>
      { content }
    </section>
  );
}

function Results({status, progress, results, showId = true, richText = true, limit = defaultLimit}: {status: Status, progress: number, showId: boolean, richText: boolean, results: readonly SearchResultLines[], limit?: number}) {
  const { t } = useTranslation();
  const [showVariables, setShowVariables] = useState(true);
  const [showAllCharacters, setShowAllCharacters] = useState(false);
  const [showGender, setShowGender] = useState(2);
  const [showPlural, setShowPlural] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [offset, setOffset] = useState(0);

  const onShowSection: ShowSectionCallback = (offset, index) => () => {
    setOffset(offset);
    jumpTo(index);
  };

  useEffect(() => {
    setOffset(0);
  }, [results]);

  // Wrap in useMemo to prevent expensive recalculations.
  // Only changes to results, limit, offset, or language will affect the generated HTML.
  // All of the other toggles only change a CSS class.
  const [count, headers, resultTables] = useMemo(() => {
    let count = 0;
    const headers = results.map(({collection, file}) => t('tableHeader', {collection: t(`collections:${collection}.name`), file: t(`files:${file}`), interpolation: {escapeValue: false}}));
    const resultTables: JSX.Element[] = [];
    results.forEach((params, index) => {
      resultTables.push(
        // Reset the state by passing a different key when offset changes.
        <ResultsSection key={[offset, index].join(',')} header={headers[index]} {...params} index={index} showId={showId} sectionOffset={count} offset={offset} limit={limit} onShowSection={onShowSection} />
      );
      count += params.lines.length;
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
              <button className='button-square' disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} title={t('loadPrev')}>{t('loadPrevIcon', {limit: limit})}</button>
              <button className='button-square' disabled={offset + limit >= count} onClick={() => setOffset(Math.min(Math.floor(count / limit) * limit, offset + limit))} title={t('loadNext')}>{t('loadNextIcon', {limit: limit})}</button>
            </div>
          ) : <ProgressBar progress={progress} />
        }
        <div className="results-toggle">
          <button className={showVariables ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowVariables(!showVariables); }} title={t('showVariables')}>{t('showVariablesIcon')}</button>
          <button className={showAllCharacters ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowAllCharacters(!showAllCharacters); }} title={t('showAllCharacters')}>{t('showAllCharactersIcon')}</button>
          <button className={showGender !== 2 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowGender((showGender + 1) % 3); }} title={t('showGender')}>{t('showGenderIcon', {context: showGender})}</button>
          <button className={showPlural !== 0 ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowPlural((showPlural + 1) % 3); }} title={t('showPlural')}>{t('showPluralIcon', {context: showPlural})}</button>
          <button className={showFurigana ? 'button-square active' : 'button-square'} disabled={!richText} onClick={() => { setShowFurigana(!showFurigana); }} title={t('showFurigana')}><span className='results-toggle-furigana'>{t('showFuriganaIcon')}</span></button>
        </div>
      </div>
      <main id="results" className={`search results app-window variables-${showVariables ? 'show' : 'hide'} control-${showAllCharacters ? 'show' : 'hide'} gender-${showGender} number-${showPlural} furigana-${showFurigana ? 'show' : 'hide'} rich-text-${richText ? 'enabled' : 'disabled'}`}>
        { resultTables }
      </main>
    </>
  );
}

export default Results;
