import { MouseEventHandler, useEffect, useMemo, useRef, useContext } from 'react';
import i18next from 'i18next';

import { codeId, Corpus, langId } from '../../utils/corpus';
import Share from './Share';
import ViewNearby from './ViewNearby';
import Copy from './Copy';

import './ResultsText.css';
import './ResultsTextColor.css';
import { expandSpeakers } from '../../utils/speaker';
import { SearchTaskResultLines } from '../../webWorker/searchWorker';
import { ParamsResult, Result, SectionHeader } from '../../utils/searchResults';
import { getSearchParamsFactory, SearchParamsFactory } from '../../utils/searchParams';
import LocalizationContext from "../LocalizationContext";

const addWordBreaksToID = (s: string, lang: string) => lang === codeId ? s.replaceAll(/([._/]|([a-z])(?=[A-Z])|([A-Za-z])(?=[0-9]))/gu, '$1<wbr>') : s;

function Rendering() {
  const t = useContext(LocalizationContext);
  return <div className="results-rendering">{t('status.rendering')}</div>;
}

function Actions({id}: {id: string}) {
  return (
    <td key="actions" className="results-table-actions-cell" translate="yes">
      <div className="results-table-actions">
        <Share hash={`#id=${id}`}/>
        <ViewNearby hash={`#file=${id.split('.').slice(0, -1).join('.')}`}/>
      </div>
    </td>
  );
}

interface ResultsTableParams extends Omit<SearchTaskResultLines, 'speakers' | 'literals'> {
  readonly corpus: Corpus,
  readonly index: number,
  readonly start: number,
  readonly end: number,
  readonly showId: boolean,
  readonly richText: boolean,
  readonly sectionOffset: number,
  readonly onShowSection: ShowSectionCallback,
  readonly searchParamsFactory: SearchParamsFactory,
}

function ResultsTable({corpus, index, collection, file, languages, lines, start, end, showId, richText, sectionOffset, onShowSection, searchParamsFactory}: ResultsTableParams) {
  const t = useContext(LocalizationContext);
  const idIndex = languages.indexOf(codeId);
  const displayLanguages = languages.map((lang) => lang === codeId ? langId : lang);
  const viewSpeaker = t('viewSpeaker');
  const hasSpeakers = corpus.getCollection(collection).speaker !== undefined;

  // RTL support: if the interface language uses a different direction, make sure to tag each cell with its direction
  const displayDirs = displayLanguages.map((lang) => i18next.dir(lang));
  const sameDir = displayDirs.every((dir) => dir === displayDirs[0]);

  const tableRef = useRef<HTMLTableElement>(null);
  const copyOnClick: MouseEventHandler<HTMLButtonElement> = () => {
    const table = tableRef.current;
    const sel = window.getSelection();
    if (sel !== null && table !== null) {
      sel.removeAllRanges();
      sel.selectAllChildren(table);
      document.execCommand('copy'); // eslint-disable-line @typescript-eslint/no-deprecated -- for native-like behavior
      sel.removeAllRanges();
    }
  };

  const classes = ['results-table', `collection-${corpus.getCollection(collection).id ?? collection.toLowerCase()}`, `file-${file}`, `rich-text-${richText ? 'enabled' : 'disabled'}`];
  if (corpus.getCollection(collection).softWrap === true)
    classes.push('soft');

  const table = (
    <div className="results-table-container">
      <table ref={tableRef} className={classes.join(' ')}>
        <thead>
          <tr>
            {idIndex !== -1 && <th className="results-table-actions-cell"><Copy callback={copyOnClick}/></th> }
            {languages.filter((lang) => showId || lang !== codeId).map((lang) => <th key={lang}><abbr title={t(`languages:${lang}.name`)}><span translate="no">{t(`languages:${lang}.code`)}</span></abbr></th>)}
          </tr>
        </thead>
        <tbody dir={sameDir && displayDirs[0] !== i18next.dir() ? displayDirs[0] : undefined} translate="no">
          {lines.map((row, i) => (start <= i && i < end) && (
            <tr key={i} data-id={idIndex !== -1 ? row[idIndex] : undefined}>
              {idIndex !== -1 && <Actions id={row[idIndex]}/> }
              {row.map((s, j) => {
                if (showId || languages[j] !== codeId) {
                  return <td key={j} lang={displayLanguages[j]} dir={sameDir ? undefined : displayDirs[j]}
                    dangerouslySetInnerHTML={{__html: addWordBreaksToID(hasSpeakers ? expandSpeakers(s, searchParamsFactory, collection, languages[j], viewSpeaker) : s, languages[j])}}></td>;
                }
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return <>
    { start !== 0 && <button className="results-notice" onClick={onShowSection(sectionOffset, index)}>{t('tablePartial', {count: start})}</button> }
    { start !== end && table }
    { end < lines.length && <button className="results-notice" onClick={onShowSection(sectionOffset + end, index)}>{t('tablePartial', {count: lines.length - end})}</button> }
  </>;
}

export type ShowSectionCallback = (offset: number, index: number) => () => void;

interface ResultsSectionParams extends Omit<ResultsTableParams, 'start' | 'end'>, Pick<ParamsResult, 'status'> {
  readonly header: SectionHeader,
  readonly offset: number,
  readonly limit: number,
}

function ResultsSection(params: ResultsSectionParams) {
  const {index, status, header, offset, limit, lines, sectionOffset, richText} = params;
  const start = Math.max(0, Math.min(lines.length, offset - sectionOffset));
  const end = Math.max(0, Math.min(lines.length, (offset + limit) - sectionOffset));
  const table = useMemo(() => {
    switch (status) {
      case 'noLines': return undefined;
      case 'worker':  return <Rendering />;
      case 'done':    return <ResultsTable {...params} start={start} end={end} />;
      default:        status satisfies never;
    }
  }, [status, start, end, richText]);
  return table && (
    <section id={`results-section${index}`} className='results-section'>
      { header && <h2>{header}</h2> }
      { table }
    </section>
  );
}

type ResultsSectionsParamsPassed = (
  Pick<ResultsTableParams, 'corpus' | 'showId' | 'richText' | 'onShowSection' | 'searchParamsFactory'>
  & Pick<ResultsSectionParams, 'offset' | 'limit'>
);

interface ResultsSectionsParams extends Omit<ResultsSectionsParamsPassed, 'richText' | 'searchParamsFactory'> {
  readonly results: readonly Result[],
  readonly headers: readonly SectionHeader[],
  readonly jumpTo: (n: number) => void,
}

/** Results section, including its header. */
export function ResultsSections({results, headers, jumpTo, ...passed}: ResultsSectionsParams) {
  // Wrap in useMemo to prevent expensive recalculations.
  const searchParamsFactory = useMemo(() => getSearchParamsFactory(passed.corpus), [passed.corpus]);
  const sectionParams = useMemo(() => {
    let sectionOffset = 0;
    const newSectionParams: (Parameters<typeof ResultsSection>[0])[] = [];
    for (const [index, result] of results.entries()) {
      if (result.status === 'initial')
        break;
      const richText = result.status === 'done' && result.richText;
      newSectionParams.push({
        ...passed,
        ...result.params,
        index, sectionOffset, richText,
        status: result.status,
        header: headers[index],
        searchParamsFactory,
      });
      sectionOffset += result.params.lines.length;
    }
    return newSectionParams;
  }, [results, passed]);

  // On prev/next navigation, scroll to first section displayed.
  useEffect(() => {
    let count = 0;
    for (const [index, result] of results.entries()) {
      if (result.status === 'initial')
        continue;
      if (passed.offset >= count && passed.offset < (count + result.params.lines.length)) {
        jumpTo(index);
        break;
      }
      count += result.params.lines.length;
    }
  }, [passed.offset]);

  return <div className="app-window-inner">
    { sectionParams.map((params) => <ResultsSection key={params.index} {...params} />) }
  </div>;
}
