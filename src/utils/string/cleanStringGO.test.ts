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
  const preprocess = preprocessHindi(s, true);
  expect(/[\uE000-\uF8FF]/gu.test(preprocess)).toBe(false);
  expect(/\u094E/gu.test(preprocess)).toBe(false); // historical character, was used in malformed ṭya (Buizel)

  expect(/(^|\s)([\u0900\u0901\u0902\u0903\u093D]|\u093C|[\u093E-\u094C]|\u094D)/gum.test(preprocess)).toBe(false); // modifier/nukta/vowel mark/halant at start of word
  expect(/\u094D([\u0900\u0901\u0902\u0903\u093D]|\u093C|[\u0904-\u0914]|[\u093E-\u094C]|\u094D)/gum.test(preprocess)).toBe(false); // halant followed by modifier/nukta/vowel/vowel mark/halant
  expect(/(?<![\u0904-\u0914]|[\u0915-\u0939\u0958-\u095F]\u093C?|[\u093E-\u094C])([\u0900\u0901\u0902\u0903\u093D])/gum.test(preprocess)).toBe(false); // modifier without preceding letter
  expect(/(?<![\u0915-\u0939\u0958-\u095F])\u093C/gum.test(preprocess)).toBe(false); // nukta without preceding consonant
  expect(/(?<![\u0915-\u0939\u0958-\u095F]\u093C?)([\u093E-\u094C]|\u094D)/gum.test(preprocess)).toBe(false); // vowel mark/halant without preceding consonant
});

test('preprocessHindi, malformed', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  const preprocess = preprocessHindi(s, false);
  expect(/\u094E/gu.test(preprocess)).toBe(false); // historical character, was used in malformed ṭya (Buizel)

  expect(/(^|\s)([\u0900\u0901\u0902\u0903\u093D]|\u093C|[\u093E-\u094C]|\u094D)/gum.test(preprocess)).toBe(true); // modifier/nukta/vowel mark/halant at start of word
  expect(/\u094D([\u0900\u0901\u0902\u0903\u093D]|\u093C|[\u0904-\u0914]|[\u093E-\u094C]|\u094D)/gum.test(preprocess)).toBe(true); // halant followed by modifier/nukta/vowel/vowel mark/halant
  expect(/(?<![\u0904-\u0914]|[\u0915-\u0939\u0958-\u095F]\u093C?|[\u093E-\u094C])([\u0900\u0901\u0902\u0903\u093D])/gum.test(preprocess)).toBe(true); // modifier without preceding letter
  expect(/(?<![\u0915-\u0939\u0958-\u095F])\u093C/gum.test(preprocess)).toBe(true); // nukta without preceding consonant
  expect(/(?<![\u0915-\u0939\u0958-\u095F]\u093C?)([\u093E-\u094C]|\u094D)/gum.test(preprocess)).toBe(true); // vowel mark/halant without preceding consonant

  // Visually identical
  expect(preprocess).toContain('जाेगा'); // jā+e.gā -> jo.gā
  expect(preprocess).toContain('हैे'); // hai+e -> hai
  expect(preprocess).toContain('पोकेेमॉन'); // po.ke+e.mo.n -> po.ke.mo.n
  expect(preprocess).toContain('ज़रिेए'); // za.ri+e.e -> za.ri.e
  expect(preprocess).toContain('दिखाेएंगे'); // di.khā+e.en.ge -> di.khā.en.ge
  expect(preprocess).toContain(' े '); // stray e in privacy_policy_text

  // Transposed letters
  expect(preprocess).toContain('मौजदूा'); // mau.ja.dū+a -> mau.jū.da
  expect(preprocess).toContain('हाइलिाट'); // hā.i.li+a.ṭ -> ha.i.la.i.t
  expect(preprocess).toContain('जिॉन'); // ji+o.n -> jo.i.n
  expect(preprocess).toContain('डार्टि्रक्स'); // ḍa.rṭi*r.ks -> ḍa.rṭri.ks

  // Wrong vowel form
  expect(preprocess).toContain('लिे'); // li+e -> li.e
  expect(preprocess).toContain('कोी'); // ko+ī -> ko.ī

  // Misplaced halant
  expect(preprocess).toContain('हू्ं'); // hū*ṁ -> hūm̐
  expect(preprocess).toContain('शु्क्रिया'); // śu*kri.yā -> śu.kri.yā
  expect(preprocess).toContain('इ्स्तेमाल'); // i*ste.mā.l -> i.ste.mā.l
  expect(preprocess).toContain('अ्च्छा'); // a*cchā -> a.cchā

  // Extra nukta
  expect(preprocess).toContain('एडवेंचर मो़ड'); // "Adventure Mode" in fitness_enable_modal_success_title
  expect(preprocess).toContain('पोकेमॉ़न'); // "Pokémon" in mega_level_tutorial_page4_body
  expect(preprocess).toContain('को़ड'); // "code" in passcode_log_received_badge
  expect(preprocess).toContain('ताजे़'); // "tāze" in pokemon_desc_0042
  expect(preprocess).toContain('बॉ़डी'); // "tāze" in quest_special_dialogue_macht_1_4
});
