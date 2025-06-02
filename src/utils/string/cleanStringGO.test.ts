import { readCorpus, readFile } from '../corpusFs';
import { preprocessHindi, preprocessThai } from './cleanStringGO';
import { getLoader } from '../loader';

const corpus = readCorpus();
const loader = getLoader(corpus);

test('preprocessThai', async () => {
  const collectionKey = 'GO';
  const languageKey = 'th';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  const preprocess = preprocessThai(s);
  expect(/[\uE000-\uF8FF]/gu.test(preprocess)).toBe(false);
});

test('preprocessHindi', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  const preprocess = preprocessHindi(s);
  expect(/[\uE000-\uF8FF]/gu.test(preprocess)).toBe(false);
  expect(/(^|\s)\u093F/gum.test(preprocess)).toBe(false);
});

test('preprocessHindi, malformed', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  const preprocess = preprocessHindi(s, false);
  expect(/(^|\s)\u093F/gum.test(preprocess)).toBe(true);
  expect(preprocess).toContain('टय्ॎ');
});
