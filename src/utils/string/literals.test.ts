import { preprocessString } from './cleanStringPre';
import { codeId, CollectionKey } from '../corpus';
import { readFile, readCorpus } from '../corpusFs';
import { getLoader } from '../loader';
import { replaceLiteralsFactory } from './literals';
import { postprocessString } from './cleanStringPost';

const corpus = readCorpus();
const loader = getLoader(corpus);

async function getReplaceLiterals(collectionKey: CollectionKey): Promise<(...parameters: Parameters<ReturnType<typeof replaceLiteralsFactory>>) => string | null> {
  const { languages, files: fileKeys, literals } = corpus.getCollection(collectionKey);
  const messageIdIndex = languages.indexOf(codeId);
  const files = await Promise.all(languages.map((languageKey) => readFile(loader, collectionKey, languageKey, fileKeys[0])));
  const fileData = languages.map(((languageKey, i) => preprocessString(files[i], collectionKey, languageKey).split(/\r\n|\n/)));
  const literalsLine = literals ? Object.keys(literals).flatMap((id) => (literals[id].branch !== 'language') ? literals[id].line : Object.values(literals[id].line)) : undefined;
  const literalsData = literalsLine ? fileData.map((lines) => new Map(literalsLine.map((i) => [i, lines[i - 1]]))) : [];
  const replaceLiterals = replaceLiteralsFactory(literalsData, messageIdIndex, collectionKey, languages, literals);
  return (s, j) => {
    s = replaceLiterals(s, j);
    s = postprocessString(s, collectionKey, languages[j], true);
    return /<text-info [^>]+>(.*)<\/text-info>/.exec(s)?.[1] ?? null;
  };
}

function genderBranch(male: string, female: string) {
  return `<span class="branch male">${male}</span><span class="gender">/</span><span class="branch female">${female}</span>`;
}

function versionBranch(form1: string, form2: string) {
  return `<span class="branch version-ruby">${form1}</span><span class="version">/</span><span class="branch version-sapphire">${form2}</span>`;
}

test('replaceLiterals, RubySapphire', async () => {
  const collectionKey = 'RubySapphire';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja-Hrkt');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('[KUN]', ja)).toEqual(genderBranch('くん', 'ちゃん'));
  expect(replaceLiterals('[KUN]', en)).toEqual('');
  expect(replaceLiterals('[EVIL_TEAM]', ja)).toEqual(versionBranch('マグマ', 'アクア'));
  expect(replaceLiterals('[EVIL_TEAM]', en)).toEqual(versionBranch('MAGMA', 'AQUA'));
});

test('replaceLiterals, FireRedLeafGreen', async () => {
  const collectionKey = 'FireRedLeafGreen';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja-Hrkt');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('[KUN]', ja)).toEqual(genderBranch('くん', 'ちゃん'));
  expect(replaceLiterals('[KUN]', en)).toEqual('');
});

test('replaceLiterals, Emerald', async () => {
  const collectionKey = 'Emerald';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja-Hrkt');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('[KUN]', ja)).toEqual(genderBranch('くん', 'ちゃん'));
  expect(replaceLiterals('[KUN]', en)).toEqual('');
  expect(replaceLiterals('[EVIL_TEAM]', ja)).toEqual(`アクア`);
  expect(replaceLiterals('[EVIL_TEAM]', en)).toEqual(`AQUA`);
});

test('replaceLiterals, BattleRevolution', async () => {
  const collectionKey = 'BattleRevolution';
  const ja = corpus.getCollection(collectionKey).languages.indexOf('ja');
  const en = corpus.getCollection(collectionKey).languages.indexOf('en');
  const es = corpus.getCollection(collectionKey).languages.indexOf('es');
  const replaceLiterals = await getReplaceLiterals(collectionKey);
  expect(replaceLiterals('["Lv."]', ja)).toEqual('Lv');
  expect(replaceLiterals('["Lv."]', en)).toEqual('Lv.');
  expect(replaceLiterals('["Lv."]', es)).toEqual('Nv.');
});
