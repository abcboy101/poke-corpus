import { preprocessString } from './cleanStringPre';
import { codeId, CollectionKey } from '../corpus';
import { readFile, readCorpus } from '../corpusFs';
import { getLoader } from '../loader';
import { replaceLiteralsFactory } from './literals';

const corpus = readCorpus();
const loader = getLoader(corpus);

async function getReplaceLiterals(collectionKey: CollectionKey): Promise<ReturnType<typeof replaceLiteralsFactory>> {
  const { languages, files: fileKeys, literals } = corpus.getCollection(collectionKey);
  const messageIdIndex = languages.indexOf(codeId);
  const files = await Promise.all(languages.map((languageKey) => readFile(loader, collectionKey, languageKey, fileKeys[0])));
  const fileData = languages.map(((languageKey, i) => preprocessString(files[i], collectionKey, languageKey).split(/\r\n|\n/)));
  const literalsLine = literals ? Object.keys(literals).flatMap((id) => (literals[id].branch !== 'language') ? literals[id].line : Object.values(literals[id].line)) : undefined;
  const literalsData = literalsLine ? fileData.map((lines) => new Map(literalsLine.map((i) => [i, lines[i - 1]]))) : [];
  return replaceLiteralsFactory(literalsData, messageIdIndex, collectionKey, languages, literals);
}

test('replaceLiterals, RubySapphire', async () => {
  const collectionKey = 'RubySapphire';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja-Hrkt');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('[KUN]', ja)).toEqual(`\u{F1102}\u{F1200}くん\u{F1104}ちゃん\u{F1103}`);
  expect(replaceLiterals('[KUN]', en)).toEqual(`\u{F1102}\u{F1200}\u{F1104}\u{F1103}`);
  expect(replaceLiterals('[EVIL_TEAM]', ja)).toEqual(`\u{F1102}\u{F1207}マグマ\u{F1104}アクア\u{F1103}`);
  expect(replaceLiterals('[EVIL_TEAM]', en)).toEqual(`\u{F1102}\u{F1207}MAGMA\u{F1104}AQUA\u{F1103}`);
});

test('replaceLiterals, FireRedLeafGreen', async () => {
  const collectionKey = 'FireRedLeafGreen';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja-Hrkt');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('[KUN]', ja)).toEqual(`\u{F1102}\u{F1200}くん\u{F1104}ちゃん\u{F1103}`);
  expect(replaceLiterals('[KUN]', en)).toEqual(`\u{F1102}\u{F1200}\u{F1104}\u{F1103}`);
});

test('replaceLiterals, Emerald', async () => {
  const collectionKey = 'Emerald';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja-Hrkt');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('[KUN]', ja)).toEqual(`\u{F1102}\u{F1200}くん\u{F1104}ちゃん\u{F1103}`);
  expect(replaceLiterals('[KUN]', en)).toEqual(`\u{F1102}\u{F1200}\u{F1104}\u{F1103}`);
  expect(replaceLiterals('[EVIL_TEAM]', ja)).toEqual(`\u{F1102}アクア\u{F1103}`);
  expect(replaceLiterals('[EVIL_TEAM]', en)).toEqual(`\u{F1102}AQUA\u{F1103}`);
});

test('replaceLiterals, BattleRevolution', async () => {
  const collectionKey = 'BattleRevolution';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const es = corpus.getCollection(collectionKey).languages.indexOf('es');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('["Lv."]', ja)).toEqual(`\u{F1102}Lv\u{F1103}`);
  expect(replaceLiterals('["Lv."]', en)).toEqual(`\u{F1102}Lv.\u{F1103}`);
  expect(replaceLiterals('["Lv."]', es)).toEqual(`\u{F1102}Nv.\u{F1103}`);
});
