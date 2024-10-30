//#region Hindi
const REPH = '\u{10F306}';
const SHORT_I = '\u{10093F}';

const NUKTA = '\u093C';
const HALANT = '\u094D';
const ZWNJ = '\u200C';
const ZWJ = '\u200D';
const CONSONANT = '[\u0915-\u0939\u0958-\u095F]';
const VOWEL = '[\u0904-\u0914]';
const MATRA = '[\u093E-\u094C]';
const MODIFIER = '[\u0900\u0901\u0902\u0903\u093D]';

// See https://learn.microsoft.com/en-us/typography/script-development/devanagari
const HALF = `(?:${CONSONANT}${NUKTA}?(?:${HALANT}[${ZWNJ}${ZWJ}]?|[${ZWNJ}${ZWJ}]${HALANT}))`; // C+[N]+<H+[<ZWNJ|ZWJ>]|<ZWNJ|ZWJ>+H>
const MAIN_CONSONANT = `(?:${CONSONANT}${NUKTA}?)`; // C+[N]+[A]
const MAIN_VOWEL = `(?:${VOWEL}${NUKTA}?(?:[${ZWJ}${ZWNJ}]?${HALANT}${CONSONANT}|${ZWJ}${CONSONANT}))?`; // V+[N]+[<[<ZWJ|ZWNJ>]+H+C|ZWJ+C>]
const INITIAL = `(?:${HALF}*${MAIN_CONSONANT}|${MAIN_VOWEL})`;
const FINAL = `(?:${HALANT}[${ZWNJ}${ZWJ}]?|${MATRA}*${NUKTA}?${HALANT}?)?${MODIFIER}?`;

const replaceHindi: Record<string, string> = {
  // Reph
  '\uF000': REPH, // r (reph in र्द, र्र; reordering)
  '\uF001': REPH, // r (reph in र्ट, र्ड; reordering)
  '\uF002': REPH, // r (reph in र्ल; reordering)
  '\uF003': REPH, // r (reph, unused; reordering)
  '\uF004': REPH, // r (reph, unused; reordering)
  '\uF005': REPH, // r (reph in र्क; reordering)
  '\uF006': REPH, // r (reph, unused; reordering)
  '\uF007': REPH, // r (reph, unused; reordering)

  // Vowel marks
  '\uF008': '\u0947', // long e (◌े in रे, टे, ट्रे)
  '\uF009': '\u0947', // long e (unused)
  '\uF00A': '\u0947', // long e (◌े in ले)
  '\uF00B': '\u0947', // long e (unused)
  '\uF00C': '\u0947', // long e (unused)
  '\uF00D': '\u0947', // long e (◌े in के, फ्रे)
  '\uF00E': '\u0947', // long e (unused)
  '\uF00F': '\u0947', // long e (unused)
  '\uF387': '\u0947', // long e (◌े in र्के; duplicate of F00E)
  '\uF010': '\u0948', // ai (unused)
  '\uF011': '\u0948', // ai (unused)
  '\uF012': '\u0948', // ai (unused)
  '\uF013': '\u0948', // ai (unused)
  '\uF014': '\u0948', // ai (unused)
  '\uF015': '\u0948', // ai (◌ै in कै)
  '\uF016': '\u0948', // ai (unused)
  '\uF017': '\u0948', // ai (unused)
  '\uF018': '\u0941', // short u (◌ु in कु)
  '\uF019': '\u0942', // long u (◌ू in कू)
  '\uF01B': '\u0902', // ṁ (anusvara; ◌ं in लं, कैं)

  // Syllable ligature
  '\uF01A': 'द्भु', // dbhu (द्भ + ◌ु)

  // Below-base forms
  '\uF1B0': '्र', // r (rakar, ◌्र)

  // Diacritics
  '\uF300': '\u0901', // chandrabindu (◌ँ in ◌ैँ)
  '\uF306': REPH, // r (reph; reordering)

  // Vowel marks
  '\uF30C': SHORT_I, // short i (◌ि in गि; reordering)
  '\uF30D': SHORT_I, // short i (◌ि in रि; reordering)
  '\uF30E': SHORT_I, // short i (unused; reordering)
  '\uF30F': SHORT_I, // short i (◌ि in दि, डि, ठि; reordering)
  '\uF310': SHORT_I, // short i (◌ि in टि; reordering)
  '\uF311': SHORT_I, // short i (◌ि in कि, वि, हि, फि, बि, ब्रि; reordering)
  '\uF312': SHORT_I, // short i (◌ि in ति, धि, नि; reordering)
  '\uF313': SHORT_I, // short i (unused; reordering)
  '\uF314': SHORT_I, // short i (◌ि in मि, लि, चि, भि; reordering)
  '\uF315': SHORT_I, // short i (unused; reordering)
  '\uF316': SHORT_I, // short i (unused; reordering)
  '\uF317': SHORT_I, // short i (◌ि in शि; reordering)
  '\uF318': SHORT_I, // short i (unused; reordering)
  '\uF319': SHORT_I, // short i (◌ि in सि, क्षि; reordering)
  '\uF31A': SHORT_I, // short i (unused; reordering)
  '\uF31B': SHORT_I, // short i (unused; reordering)
  '\uF31C': SHORT_I, // short i (unused; reordering)
  '\uF31D': SHORT_I, // short i (unused; reordering)
  '\uF31E': SHORT_I, // short i (unused; reordering)
  '\uF31F': SHORT_I, // short i (unused; reordering)
  '\uF320': SHORT_I, // short i (unused; reordering)
  '\uF321': '\u0940', // long i (unused)
  '\uF322': '\u0940', // long i (◌ी in री)
  '\uF323': '\u0940', // long i (◌ी in टी, री)
  '\uF324': '\u0940', // long i (unused)
  '\uF325': '\u0940', // long i (◌ी in ली)
  '\uF326': '\u0940', // long i (unused)
  '\uF327': '\u0940', // long i (unused)
  '\uF328': '\u0940', // long i (unused)
  '\uF329': '\u0940', // long i (unused)
  '\uF32A': '\u0940', // long i (◌ी in की, फी)
  '\uF32B': '\u0940', // long i (unused)
  '\uF32C': '\u0940', // long i (unused)

  // Conjuncts
  '\uF337': 'क्ष', // ksha
  '\uF339': 'ज्ञ', // gya
  '\uF363': 'क्र', // kra (alternate, left loop open)
  '\uF364': 'ख्र', // khra
  '\uF365': 'ग्र', // gra
  '\uF366': 'घ्र', // ghra
  '\uF367': 'च्र', // chra
  '\uF368': 'ज्र', // jra
  '\uF369': 'झ्र', // jhra
  '\uF36B': 'ञ्र', // ñra
  '\uF36C': 'ण्र', // ṇra
  '\uF36E': 'त्र', // tra
  '\uF36F': 'थ्र', // thra
  '\uF370': 'द्र', // dra
  '\uF371': 'ध्र', // dhra
  '\uF373': 'न्र', // nra
  '\uF374': 'प्र', // pra
  '\uF375': 'फ्र', // phra
  '\uF376': 'ब्र', // bra
  '\uF377': 'भ्र', // bhra
  '\uF379': 'म्र', // mra
  '\uF37A': 'य्र', // yra
  '\uF37B': 'ल्र', // lra
  '\uF37C': 'व्र', // vra
  '\uF37D': 'श्र', // śra
  '\uF37E': 'ष्र', // ṣra
  '\uF37F': 'स्र', // sra
  '\uF380': 'ह्र', // hra
  '\uF389': 'फ़्र', // fra
  '\uF3D1': 'क्र', // kra (standard, left loop closed)
  '\uF3E3': 'द्म', // dma
  '\uF3E4': 'द्य', // dya

  // Full forms
  '\uF334': 'छ', // cha (unused, GO uses the half form छ्‍ in all contexts)

  // Half forms (consonant + halant + ZWJ)
  '\uF33A': 'क्‍', // k
  '\uF33B': 'ख्‍', // kh
  '\uF33C': 'ग्‍', // g
  '\uF33D': 'घ्‍', // gh
  '\uF33E': 'च्‍', // c
  '\uF33F': 'ज्‍', // j
  '\uF340': 'झ्‍', // jh
  '\uF343': 'ञ्‍', // ñ
  '\uF344': 'ण्‍', // ṇ
  '\uF346': 'त्‍', // t
  '\uF347': 'थ्‍', // th
  '\uF348': 'ढ्‍', // ḍh
  '\uF34A': 'न्‍', // n
  '\uF34B': 'प्‍', // p
  '\uF34C': 'फ्‍', // ph
  '\uF34D': 'ब्‍', // b
  '\uF34E': 'भ्‍', // bh
  '\uF350': 'म्‍', // m
  '\uF351': 'य्‍', // y
  '\uF352': 'ऱ्‍', // r (eyelash)
  '\uF353': 'ल्‍', // l
  '\uF355': 'ळ्‍', // ḷ
  '\uF356': 'व्‍', // v
  '\uF357': 'श्‍', // ś
  '\uF35A': 'ष्‍', // ṣ
  '\uF35B': 'स्‍', // s
  '\uF35C': 'ह्‍', // h
  '\uF390': 'फ़्‍', // f

  // Conjuncts
  '\uF449': 'त्न', // tna
  '\uF45A': 'द्द', // dda
  '\uF46A': 'द्ध', // ddha
  '\uF493': 'द्व', // dva
  '\uF4F5': 'स्न', // sna

  // Syllable ligatures
  '\uF388': 'रु', // ru
  '\uF555': 'रू', // rū
  '\uF564': 'हु', // hu
  '\uF565': 'हू', // hū

  // Stacked forms
  '\uF5A2': 'ट्', // ṭ upper
  '\uF5A3': 'ठ्', // ṭh upper
  '\uF5A4': 'ड्', // ḍ upper
  '\uF5A5': 'ढ्', // ḍh upper
  '\uF61F': 'ट', // ṭ lower
  '\uF625': 'ठ', // ṭh lower
  '\uF62B': 'ड', // ḍ lower
  '\uF633': 'ढ', // ḍh lower
};

function preprocessHindi(value: string) {
  // Perform all simple mappings
  value = value.replace(/\u094D/g, '\u094D\u200C'); // explicit halant
  value = value.replace(/\u093F/g, SHORT_I); // short i
  value = value.replace(/[\uF000-\uF633]/g, (c) => replaceHindi[c] ?? c); // Private Use

  // short i + consonant cluster + reph (visual)
  // reph + consonant cluster + short i (logical)
  // Example: ि + क + र् = र्कि (i + k + r = rki)
  value = value.replace(new RegExp(`${SHORT_I}(${INITIAL})(${FINAL})${REPH}`, 'gu'), 'र्$1\u093F$2');

  // short i + consonant cluster (visual)
  // consonant cluster + short i (logical)
  // Example: ि + क = कि (i + k = ki)
  value = value.replace(new RegExp(`${SHORT_I}(${INITIAL})(${FINAL})`, 'gu'), '$1\u093F$2');

  // consonant cluster + reph (visual)
  // reph + consonant cluster (logical)
  // Example: क + र् = र्क (k + r = rk)
  value = value.replace(new RegExp(`(${INITIAL})(${FINAL})${REPH}`, 'gu'), 'र्$1$2');

  value = value.replaceAll(SHORT_I, 'ि');
  value = value.replaceAll(REPH, 'र्');
  value = value.replaceAll(ZWNJ, '');
  value = value.replaceAll(ZWJ, '');

  value = value.replace(/\u094D\u093C/g, '\u093C\u094D'); // halant + nukta -> nukta + halant
  value = value.replace(/टय्ॎ/gu, 'ट्य'); // malformed ṭya (Buizel)
  return value;
}
//#endregion

//#region Thai
const replaceThai: Record<string, string> = {
  // CONSONANTS
  // Without lower curves to allow a vowel (◌ุ◌ู◌ฺ) to be written below them
  '\uF700': 'ฐ',
  '\uF70F': 'ญ',

  // VOWELS
  // Shifted left to compensate for ascenders (ปฝฟฬ)
  '\uF701': '\u0E34', // short i
  '\uF702': '\u0E35', // long i
  '\uF703': '\u0E36', // short ue
  '\uF704': '\u0E37', // long ue
  '\uF710': '\u0E31', // mai han akat
  '\uF711': '\u0E4D', // nikkhahit
  '\uF712': '\u0E47', // mai tai khu

  // Shifted down to compensate for descenders (ฎฏ, currently unused)
  '\uF718': '\u0E38', // short u
  '\uF719': '\u0E39', // long u
  '\uF71A': '\u0E3A', // phinthu

  // TONE MARKS
  // Shifted down and left to compensate for ascenders (ปฝฟฬ + no vowel + ◌ุ◌ู)
  '\uF705': '\u0E48', // mai ek
  '\uF706': '\u0E49', // mai tho
  '\uF707': '\u0E4A', // mai tri
  '\uF708': '\u0E4B', // mai chattawa
  '\uF709': '\u0E4C', // thanthakhat (silent letter)

  // Shifted down to compensate for shorter letters
  // (กขคฆงจฉชซญฐฑณดตถทธนบผพมยรลวศษสหอฮ + no vowel + ◌ุ◌ู)
  '\uF70A': '\u0E48', // mai ek
  '\uF70B': '\u0E49', // mai tho
  '\uF70C': '\u0E4A', // mai tri
  '\uF70D': '\u0E4B', // mai chattawa
  '\uF70E': '\u0E4C', // thanthakhat (silent letter)

  // Compensates for ascenders (unused due to being the same as regular codepoint)
  '\uF713': '\u0E48', // mai ek
  '\uF714': '\u0E49', // mai tho
  '\uF715': '\u0E4A', // mai tri
  '\uF716': '\u0E4B', // mai chattawa
  '\uF717': '\u0E4C', // thanthakhat (silent letter)
};

function preprocessThai(s: string) {
  Object.entries(replaceThai).forEach(([v1, v2]) => {
    s = s.replaceAll(v1, v2);
  });
  return s;
}
//#endregion

export function preprocessStringGO(s: string, language: string) {
  switch (language) {
    case 'hi':
      return preprocessHindi(s);
    case 'th':
      return preprocessThai(s);
    default:
      return s;
  }
}

export function postprocessStringGO(s: string) {
  return (s
    // Unity rich text tags
    .replaceAll(/\u{F0106}(\/?[bi]) *\u{F0107}/gu, '<$1>') // b, i
    .replaceAll(/\u{F0106}size=(\d+)\u{F0107}/gu, '<span style="font-size: calc($1 / 32 * 100%)">') // size
    .replaceAll(/\u{F0106}color=(.*?)\u{F0107}/gu, '<span class="color" style="color: $1">') // color
    .replaceAll(/\u{F0106}\/(size|color)\u{F0107}/gu, '</span>') // size, color (closing tag)

    // Links
    .replaceAll(/\u{F0106}a href="\{(\d+)\}"\u{F0107}(.+?)\u{F0106}\/a\u{F0107}/gu, '<span class="link" title="\u{F0104}$1}">$2</span>')
    .replaceAll(/\u{F0106}a href="([0-9A-Za-z_]+)"\u{F0107}/gu, '<a class="link" href="#id=go.$1" title="$1">')
    .replaceAll(/\u{F0106}a href=["“]((?:pokemongolive.com)\/[^"]+?)["”]\u{F0107}/gu, '<a class="link" href="http://$1" title="$1" target="_blank" rel="noopener noreferrer nofollow">')
    .replaceAll(/\u{F0106}a href="+(https?:\/\/[^"]+?)"+\u{F0107}/gu, '<a class="link" href="$1" title="$1" target="_blank" rel="noopener noreferrer nofollow">')
    .replaceAll(/\u{F0106}\/a\u{F0107}/gu, '</a>')

    // Other tags
    .replaceAll(/\u{F0106}br\u{F0107}/gu, '<br>')
    .replaceAll(/\u{F0106}(taunt|intimidate)\u{F0107}/gu, '<span class="var">\u{F0106}$1\u{F0107}</span>')

    // Substitutions
    .replaceAll(/(%BREAK%)/gu, '<span class="c">$1</span><br>')
    .replaceAll(/(%PLAYERNAME%)/gu, '<span class="var">$1</span>')
    .replaceAll(/(%(\d+\$)?s)/gu, '<span class="var">$1</span>')
    .replaceAll(/(\{\d+(?::[^\]]+?)?\})/gu, '<span class="var">$1</span>')
  );
}
