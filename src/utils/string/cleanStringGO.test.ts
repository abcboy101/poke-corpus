import fs from 'node:fs/promises';

import { getFilePath } from '../files';
import { preprocessHindi, preprocessThai } from './cleanStringGO';
import { CollectionKey, FileKey, LanguageKey } from '../corpus';

async function loadFile(collectionKey: CollectionKey, languageKey: LanguageKey, fileKey: FileKey): Promise<string> {
  const path = getFilePath(collectionKey, languageKey, fileKey);
  return fs.readFile(path.split('.gz')[0], {encoding: 'utf-8'});
}

test('preprocessThai', async () => {
  const collectionKey = 'GO';
  const languageKey = 'th';
  const s = await loadFile(collectionKey, languageKey, 'text');
  const preprocess = preprocessThai(s);
  expect(/[\uE000-\uF8FF]/gu.test(preprocess)).toBe(false);
});

test('preprocessHindi', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await loadFile(collectionKey, languageKey, 'text');
  const preprocess = preprocessHindi(s);
  expect(/[\uE000-\uF8FF]/gu.test(preprocess)).toBe(false);
  expect(/(^|\s)\u093F/gum.test(preprocess)).toBe(false);
});

test('preprocessHindi, malformed', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await loadFile(collectionKey, languageKey, 'text');
  const preprocess = preprocessHindi(s, false);
  expect(/(^|\s)\u093F/gum.test(preprocess)).toBe(true);
  expect(preprocess).toContain('टय्ॎ');
});
