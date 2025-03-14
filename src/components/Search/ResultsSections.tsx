import { MouseEventHandler, ReactElement, useEffect, useRef, useState, useTransition } from 'react';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';

import { SearchResultLines } from '../../webWorker/searchWorkerManager';
import corpus, { codeId, langId } from '../../utils/corpus';
import Share from './Share';
import ViewNearby from './ViewNearby';
import Copy from './Copy';
import NoScript from './NoScript';

import { expandSpeakers, replaceSpeaker } from '../../utils/speaker';
import { SearchTaskResultLines } from '../../webWorker/searchWorker';
import { postprocessString } from '../../utils/string/cleanStringPost';
import { replaceLiteralsFactory } from '../../utils/string/literals';

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

function ResultsTable({collection, file, languages, lines, speakers, literals, richText, showId}: SearchTaskResultLines & {richText: boolean, showId: boolean}) {
  const { t } = useTranslation();
  const idIndex = languages.indexOf(codeId);
  const displayLanguages = languages.map((lang) => lang === codeId ? langId : lang);
  const viewSpeaker = t('viewSpeaker');
  const hasSpeakers = corpus.collections[collection].speaker !== undefined;
  const replaceLiterals = replaceLiteralsFactory(literals, languages.indexOf(codeId), collection, languages, corpus.collections[collection].literals);

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

  const classes = ['results-table', `collection-${corpus.collections[collection].id ?? collection.toLowerCase()}`, `file-${file}`];
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
          {lines.map((row, i) =>
            <tr key={i} data-id={idIndex !== -1 ? row[idIndex] : undefined}>
              {idIndex !== -1 && <Actions id={row[idIndex]}/> }
              {row.map((s, j) => {
                if (showId || languages[j] !== codeId) {
                  if (richText) {
                    if (hasSpeakers)
                      s = replaceSpeaker(s, speakers[j], languages[j]);
                    s = replaceLiterals(s, j);
                  }
                  s = postprocessString(s, collection, languages[j], richText);
                  return <td key={j} lang={displayLanguages[j]} dir={sameDir ? undefined : displayDirs[j]}
                    dangerouslySetInnerHTML={{__html: addWordBreaksToID(hasSpeakers ? expandSpeakers(s, collection, languages[j], viewSpeaker) : s, languages[j])}}></td>;
                }
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface ResultsSectionsParams {
  offset: number,
  limit: number,
  richText: boolean,
  showId: boolean,
  onShowSection: ShowSectionCallback,
}

interface ResultsSectionContentParams extends SearchTaskResultLines, ResultsSectionsParams {
  index: number,
  sectionOffset: number,
}

export type ShowSectionCallback = (offset: number, index: number) => () => void;

/** Content of a results section, including warnings when only part of a table is shown. */
function ResultsSectionContent({lines, index, sectionOffset, offset, limit, onShowSection, ...params}: ResultsSectionContentParams) {
  const { t } = useTranslation();
  const start = Math.max(0, Math.min(lines.length, offset - sectionOffset));
  const end = Math.max(0, Math.min(lines.length, (offset + limit) - sectionOffset));
  const slicedLines = (start !== 0 || end !== undefined) ? lines.slice(start, end) : lines;

  return <>
    { start !== 0 && <button className="results-notice" onClick={onShowSection(sectionOffset, index)}>{t('tablePartial', {count: start})}</button> }
    { start !== end && <ResultsTable key={index} {...params} lines={slicedLines} /> }
    { end !== undefined && end < lines.length && <button className="results-notice" onClick={onShowSection(sectionOffset + end, index)}>{t('tablePartial', {count: lines.length - end})}</button> }
  </>;
}

/** Results section, including its header. */
export function ResultsSections({className, results, headers, richText, showId, offset, limit, onShowSection, jumpTo}: {className: string, results: readonly SearchResultLines[], headers: readonly string[], jumpTo: (n: number) => void} & ResultsSectionsParams) {
  const [resultTables, setResultTables] = useState<readonly ReactElement[]>([]);
  const [isPending, startTransition] = useTransition();

  // Wrap in useEffect to prevent expensive recalculations.
  // Wrap in startTransition to allow it to be rendered in the background.
  // Only changes to results, limit, offset, or language will affect the generated HTML.
  useEffect(() => {
    startTransition(async () => {
      let count = 0;
      const resultTables: ReactElement[] = [];
      for (const [index, params] of results.entries()) {
        resultTables.push(
          <ResultsSectionContent {...params} index={index} sectionOffset={count} offset={offset} limit={limit} richText={richText} showId={showId} onShowSection={onShowSection} />
        );
        count += params.lines.length;
      }
      setResultTables(resultTables);
    });
  }, [results, richText, limit, offset]);

  // On prev/next navigation, scroll to first section displayed.
  useEffect(() => {
    let count = 0;
    for (const [index, {lines}] of results.entries()) {
      if (offset >= count && offset < (count + lines.length)) {
        jumpTo(index);
        break;
      }
      count += lines.length;
    }
  }, [offset]);

  return (
    <main id="results" className={className}>
      { import.meta.env.SSR && <NoScript /> }
      {
        results.map(({displayHeader}, index) => (
          <section key={headers[index]} id={`results-section${index}`} className='results-section'>
            <h2 className={displayHeader ? undefined : 'd-none'}>{headers[index]}</h2>
            { isPending ? <Rendering /> : (resultTables[index] ?? <Rendering />) }
          </section>
        ))
      }
    </main>
  );
}
