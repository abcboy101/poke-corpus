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

  expect(/(^|\s)\u093F/gum.test(preprocess)).toBe(false); // short i at start of word
  expect(/[\u093E-\u094C]{2,}/gum.test(preprocess)).toBe(false); // consecutive vowel marks
  expect(/[\u094D][\u093E-\u094C]/gum.test(preprocess)).toBe(false); // halant + vowel mark
});

test('preprocessHindi, malformed', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  const preprocess = preprocessHindi(s, false);

  expect(/(^|\s)\u093F/gum.test(preprocess)).toBe(true); // short i at start of word
  expect(/[\u093E-\u094C]{2,}/gum.test(preprocess)).toBe(true); // consecutive vowel marks
  expect(/[\u094D][\u093E-\u094C]/gum.test(preprocess)).toBe(true); // halant + vowel mark

  // Visually identical
  // expect(preprocess).toContain('टय्ॎ'); // malformed ṭya (Buizel)
  expect(preprocess).toContain('जाेगा'); // jā+e.gā -> jo.gā

  // Transposed letters
  expect(preprocess).toContain('मौजदूा'); // mau.ja.dū+a -> mau.jū.da
  expect(preprocess).toContain('हाइलिाट'); // hā.i.li+a.ṭ -> ha.i.la.i.t
  expect(preprocess).toContain('जिॉन'); // ji+o.n -> jo.i.n

  // Extra e
  expect(preprocess).toContain('हैे'); // hai+e -> hai
  expect(preprocess).toContain('पोकेेमॉन'); // po.ke+e.mo.n -> po.ke.mo.n
  expect(preprocess).toContain('ज़रिेए'); // za.ri+e.e -> za.ri.e
  expect(preprocess).toContain('दिखाेएंगे'); // di.khā+e.en.ge -> di.khā.en.ge

  // Wrong vowel form
  expect(preprocess).toContain('लिे'); // li+e -> li.e
  expect(preprocess).toContain('कोी'); // ko+ī -> ko.ī
});
