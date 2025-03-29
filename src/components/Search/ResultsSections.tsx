import { MouseEventHandler, ReactNode, startTransition, useEffect, useRef, useState } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import corpus, { codeId, langId } from '../../utils/corpus';
import Share from './Share';
import ViewNearby from './ViewNearby';
import Copy from './Copy';
import NoScript from './NoScript';

import './ResultsText.css';
import './ResultsTextColor.css';
import { expandSpeakers } from '../../utils/speaker';
import { SearchTaskResultLines } from '../../webWorker/searchWorker';
import { Result, SectionHeader } from '../../utils/searchResults';

const addWordBreaksToID = (s: string, lang: string) => lang === codeId ? s.replaceAll(/([._/]|([a-z])(?=[A-Z])|([A-Za-z])(?=[0-9]))/gu, '$1<wbr>') : s;

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

function ResultsTable({collection, file, languages, lines, start, end, showId, richText}: SearchTaskResultLines & {start: number, end: number, showId: boolean, richText: boolean}) {
  const { t } = useTranslation();
  const idIndex = languages.indexOf(codeId);
  const displayLanguages = languages.map((lang) => lang === codeId ? langId : lang);
  const viewSpeaker = t('viewSpeaker');
  const hasSpeakers = corpus.collections[collection].speaker !== undefined;

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

  const classes = ['results-table', `collection-${corpus.collections[collection].id ?? collection.toLowerCase()}`, `file-${file}`, `rich-text-${richText ? 'enabled' : 'disabled'}`];
  if (corpus.collections[collection].softWrap === true)
    classes.push('soft');

  return (
    <div className="results-table-container">
      <table ref={tableRef} className={classes.join(' ')}>
        <thead>
          <tr>
            {idIndex !== -1 && <th className="results-table-actions-cell"><Copy callback={copyOnClick}/></th> }
            {languages.filter((lang) => showId || lang !== codeId).map((lang) => <th key={lang}><abbr title={t(`languages:${lang}.name`)}>{t(`languages:${lang}.code`)}</abbr></th>)}
          </tr>
        </thead>
        <tbody dir={sameDir && displayDirs[0] !== i18next.dir() ? displayDirs[0] : undefined}>
          {lines.map((row, i) => (start <= i && i < end) && (
            <tr key={i} data-id={idIndex !== -1 ? row[idIndex] : undefined}>
              {idIndex !== -1 && <Actions id={row[idIndex]}/> }
              {row.map((s, j) => {
                if (showId || languages[j] !== codeId) {
                  return <td key={j} lang={displayLanguages[j]} dir={sameDir ? undefined : displayDirs[j]}
                    dangerouslySetInnerHTML={{__html: addWordBreaksToID(hasSpeakers ? expandSpeakers(s, collection, languages[j], viewSpeaker) : s, languages[j])}}></td>;
                }
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ResultsSectionsParams {
  offset: number,
  limit: number,
  showId: boolean,
  onShowSection: ShowSectionCallback,
}

interface ResultsSectionContentParams extends SearchTaskResultLines, ResultsSectionsParams {
  index: number,
  richText: boolean,
  sectionOffset: number,
}

export type ShowSectionCallback = (offset: number, index: number) => () => void;

/** Content of a results section, including warnings when only part of a table is shown. */
function ResultsSectionContent({lines, index, sectionOffset, offset, limit, onShowSection, ...params}: ResultsSectionContentParams) {
  const { t } = useTranslation();
  const start = Math.max(0, Math.min(lines.length, offset - sectionOffset));
  const end = Math.max(0, Math.min(lines.length, (offset + limit) - sectionOffset));

  return <>
    { start !== 0 && <button className="results-notice" onClick={onShowSection(sectionOffset, index)}>{t('tablePartial', {count: start})}</button> }
    { start !== end && <ResultsTable key={index} {...params} lines={lines} start={start} end={end} /> }
    { end < lines.length && <button className="results-notice" onClick={onShowSection(sectionOffset + end, index)}>{t('tablePartial', {count: lines.length - end})}</button> }
  </>;
}

/** Results section, including its header. */
export function ResultsSections({className, results, headers, showId, offset, limit, onShowSection, jumpTo}: {className: string, results: readonly Result[], headers: readonly SectionHeader[], jumpTo: (n: number) => void} & ResultsSectionsParams) {
  const [resultTables, setResultTables] = useState<readonly ReactNode[]>([]);

  // Wrap in useEffect to prevent expensive recalculations.
  // Wrap in startTransition to allow it to be rendered in the background.
  // Only changes to results, limit, offset, or language will affect the generated HTML.
  useEffect(() => {
    startTransition(() => {
      let count = 0;
      const resultTables: ReactNode[] = [];
      for (const [index, result] of results.entries()) {
        if (result.status === 'initial')
          break;
        let table: ReactNode | undefined = undefined;
        switch (result.status) {
          case 'noLines':
            table = undefined;
            break;
          case 'worker':
            table = <Rendering />;
            break;
          case 'done':
            table = <ResultsSectionContent {...result.params} index={index} richText={result.richText} sectionOffset={count} offset={offset} limit={limit} showId={showId} onShowSection={onShowSection} />;
            break;
          default:
            result satisfies never;
        }
        resultTables.push(table);
        count += result.params.lines.length;
      }
      setResultTables(resultTables);
    });
  }, [results, limit, offset]);

  // On prev/next navigation, scroll to first section displayed.
  useEffect(() => {
    let count = 0;
    for (const [index, result] of results.entries()) {
      if (result.status === 'initial')
        continue;
      if (offset >= count && offset < (count + result.params.lines.length)) {
        jumpTo(index);
        break;
      }
      count += result.params.lines.length;
    }
  }, [offset]);

  return (
    <main id="results" className={className}>
      { import.meta.env.SSR && <NoScript /> }
      {
        resultTables.map((resultTable, index) => resultTable === undefined ? undefined : (
          <section key={index} id={`results-section${index}`} className='results-section'>
            { headers[index] && <h2>{headers[index]}</h2> }
            { resultTable }
          </section>
        ))
      }
    </main>
  );
}
