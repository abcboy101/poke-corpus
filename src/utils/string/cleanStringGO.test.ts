import fs from 'node:fs/promises';

import { getFilePath } from '../files';
import { preprocessStringGO } from './cleanStringGO';
import { CollectionKey, FileKey, LanguageKey } from '../corpus';

async function loadFile(collectionKey: CollectionKey, languageKey: LanguageKey, fileKey: FileKey): Promise<string> {
  const path = getFilePath(collectionKey, languageKey, fileKey);
  return fs.readFile(path.split('.gz')[0], {encoding: 'utf-8'});
}

test('preprocessStringGO, Thai', async () => {
  const collectionKey = 'GO';
  const languageKey = 'th';
  const s = await loadFile(collectionKey, languageKey, 'text');
  const preprocess = preprocessStringGO(s, languageKey);
  expect(/[\uE000-\uF8FF]/gu.test(preprocess)).toBe(false);
});

test('preprocessStringGO, Hindi', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await loadFile(collectionKey, languageKey, 'text');
  const preprocess = preprocessStringGO(s, languageKey);
  expect(/[\uE000-\uF8FF]/gu.test(preprocess)).toBe(false);
  expect(/(^|\s)\u093F/gum.test(preprocess)).toBe(false);
});
