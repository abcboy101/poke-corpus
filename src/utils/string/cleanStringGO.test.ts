import { readCorpus, readFile } from '../corpusFs';
import { preprocessHindi } from './cleanStringGO';
import { getLoader } from '../loader';

const corpus = readCorpus();
const loader = getLoader(corpus);

test('preprocessThai', async () => {
  const collectionKey = 'GO';
  const languageKey = 'th';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  expect(s).not.toMatch(/[\uE000-\uF8FF]/g); // no private-use characters
  expect(s).not.toMatch(/[\u200C\u200D]/g); // no ZWJ/ZWNJ
});

test('preprocessHindi', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  expect(s).not.toMatch(/[\uE000-\uF8FF]/g); // no private-use characters
  expect(s).not.toMatch(/[\u200C\u200D]/g); // no ZWJ/ZWNJ

  const preprocess = preprocessHindi(s);
  expect(preprocess).not.toMatch(/[\uE000-\uF8FF]/g);
  expect(preprocess).not.toMatch(/\u094E/g); // historical character, was used in malformed ṭya (Buizel)

  expect(preprocess).not.toMatch(/(^|\s)([\u0900\u0901\u0902\u0903\u093D\u093C\u093E-\u094C\u094D])/gm); // modifier/nukta/vowel mark/halant at start of word
  expect(preprocess).not.toMatch(/\u094D([\u0900\u0901\u0902\u0903\u093D\u093C\u0904-\u0914\u093E-\u094C\u094D])/g); // halant followed by modifier/nukta/vowel/vowel mark/halant
  expect(preprocess).not.toMatch(/(?<![\u0904-\u0914\u093E-\u094C]|[\u0915-\u0939\u0958-\u095F]\u093C?)([\u0900\u0901\u0902\u0903\u093D])/g); // modifier without preceding letter
  expect(preprocess).not.toMatch(/(?<![\u0915-\u0939\u0958-\u095F])\u093C/g); // nukta without preceding consonant
  expect(preprocess).not.toMatch(/(?<![\u0915-\u0939\u0958-\u095F]\u093C?)([\u093E-\u094C\u094D])/g); // vowel mark/halant without preceding consonant

  // De-duplicate
  expect(preprocess).not.toMatch(/[\u0901\u0902]{2,}/g); // chandrabindu overstrike
  expect(preprocess).not.toMatch(/\u093C{2,}/g); // consecutive nukta
  expect(preprocess).not.toMatch(/([\u093E\u0940-\u094C]){2}/g); // duplicate vowel marks (except short i)
});

test('preprocessHindi, malformed', async () => {
  const collectionKey = 'GO';
  const languageKey = 'hi';
  const s = await readFile(loader, collectionKey, languageKey, 'text');
  expect(s).not.toMatch(/\u094E/g); // historical character, was used in malformed ṭya (Buizel)

  expect(s).toMatch(/(^|\s)([\u0900\u0901\u0902\u0903\u093D\u093C\u093E-\u094C\u094D])/gm); // modifier/nukta/vowel mark/halant at start of word
  expect(s).toMatch(/\u094D([\u0900\u0901\u0902\u0903\u093D\u093C\u0904-\u0914\u093E-\u094C\u094D])/g); // halant followed by modifier/nukta/vowel/vowel mark/halant
  expect(s).toMatch(/(?<![\u0904-\u0914\u093E-\u094C]|[\u0915-\u0939\u0958-\u095F]\u093C?)([\u0900\u0901\u0902\u0903\u093D])/g); // modifier without preceding letter
  expect(s).toMatch(/(?<![\u0915-\u0939\u0958-\u095F])\u093C/g); // nukta without preceding consonant
  expect(s).toMatch(/(?<![\u0915-\u0939\u0958-\u095F]\u093C?)([\u093E-\u094C\u094D])/g); // vowel mark/halant without preceding consonant

  // De-duplicate
  expect(s).toMatch(/[\u0901\u0902]{2,}/g); // chandrabindu overstrike
  expect(s).toMatch(/\u093C{2,}/g); // consecutive nukta
  expect(s).toMatch(/([\u093E\u0940-\u094C]){2}/g); // duplicate vowel marks (except short i)

  // Visually identical
  expect(s).toContain('जाेगा'); // jā+e.gā -> jo.gā
  expect(s).toContain('हैे'); // hai+e -> hai
  expect(s).toContain('पोकेेमॉन'); // po.ke+e.mo.n -> po.ke.mo.n
  expect(s).toContain('ज़रिेए'); // za.ri+e.e -> za.ri.e
  expect(s).toContain('दिखाेएंगे'); // di.khā+e.en.ge -> di.khā.en.ge
  expect(s).toContain(' े '); // stray e in privacy_policy_text

  // Transposed letters
  expect(s).toContain('मौजदूा'); // mau.ja.dū+a -> mau.jū.da
  expect(s).toContain('हाइलािट'); // hā.i.la+i.ṭ -> ha.i.la.i.t
  expect(s).toContain('जॉिन'); // jo+i.n -> jo.i.n

  // Wrong vowel form
  expect(s).toContain('लिे'); // li+e -> li.e
  expect(s).toContain('कोी'); // ko+ī -> ko.ī
  expect(s).toMatch(/(^|\s)िस/g); // +is -> i.s

  // Misplaced halant
  expect(s).toContain('हू्ं'); // hū*ṁ -> hūm̐
  expect(s).toContain('शु्क्रिया'); // śu*kri.yā -> śu.kri.yā
  expect(s).toContain('इ्स्तेमाल'); // i*ste.mā.l -> i.ste.mā.l
  expect(s).toContain('अ्च्छा'); // a*cchā -> a.cchā

  // Extra nukta
  expect(s).toMatch(/[\u0904-\u0914\u093E-\u094C]\u093C/g); // extra nukta on preceding vowel
  expect(s).toContain('एडवेंचर मो़ड'); // "Adventure Mode" in fitness_enable_modal_success_title
  expect(s).toContain('पोकेमॉ़न'); // "Pokémon" in mega_level_tutorial_page4_body
  expect(s).toContain('को़ड'); // "code" in passcode_log_received_badge
  expect(s).toContain('ताजे़'); // "tāze" in pokemon_desc_0042
  expect(s).toContain('बॉ़डी'); // "body" in quest_special_dialogue_macht_1_4
});
