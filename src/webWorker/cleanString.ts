/**
 * Various string handling functions.
 *
 * Note that the following codepoints are used internally, and may produce unexpected output if present in input text:
 * - U+F0000: delimiter for copy of string with ruby text converted to kanji
 * - U+F0001: delimiter for copy of string with ruby text converted to kana
 *
 * - U+F0100: placeholder for literal backslash `\\`
 * - U+F0102: placeholder for literal left square bracket `\[`
 * - U+F0104: placeholder for literal left curly bracket `\{`
 * - U+F0106: placeholder for less-than sign `<`
 * - U+F0107: placeholder for greater-than sign `>`
 *
 * - U+F0200: placeholder for new line `\n`
 * - U+F0201: placeholder for scroll `\r`
 * - U+F0202: placeholder for clear `\c`
 * - U+F0203: placeholder for tab `\t`
 * - U+F0207: placeholder for `[VAR 0207]`
 * - U+F0208: placeholder for `[VAR 0208]`
 * - U+F02FF: placeholder for end of text `\e`
 *
 * The following codepoints can be used in source documents for multivalued strings:
 * - U+F1000: delimiter between multivalued strings
 * - U+F1001: delimiter between the discriminator and the string itself
 *
 * - U+F1100: delimiter between speaker ID and speaker name
 * - U+F1101: delimiter between speaker name and dialogue
 *
 * - U+F1102: start of replaced literal
 * - U+F1103: end of replaced literal
 * - U+F1104: delimiter between branches in a literal
 *
 * - U+F1200: mark a gender branch in a literal
 * - U+F1207: mark a version branch in a literal
 */

import chineseChars from './chineseChars.json';
import * as g3 from './expandVariablesG3';

//#region Pre-processing
// SMUSUM Chinese Pokémon names
function remapChineseChars(s: string) {
  return s.search(/[\uE800-\uEE26]/u) === -1 ? s : (
    Array.from(s).map((c) => {
      const codePoint = c.codePointAt(0);
      return (codePoint !== undefined && codePoint >= 0xE800 && codePoint <= 0xEE26) ? chineseChars[codePoint - 0xE800] : c;
    }).join('')
  );
}

// ORAS Korean Braille
function remapKoreanBraille(s: string) {
  return s.search(/[\u1100-\u11FF\uE0C0-\uE0C7]/u) === -1 ? s : (s
    .replaceAll('\uE0C0', '그래서') // geuraeseo
    .replaceAll('\uE0C1', '그러나') // geureona
    .replaceAll('\uE0C2', '그러면') // geureomyeon
    .replaceAll('\uE0C3', '그러므로') // geureomeuro
    .replaceAll('\uE0C4', '그런데') // geureonde
    .replaceAll('\uE0C5', '그') // UNUSED go
    .replaceAll('\uE0C6', '그리하여') // geurihayeo
    .replaceAll('ᆨᅩ', '그리고') // geurigeo
    .replaceAll('\uE0C7ᄉ', 'ᄊ') // ss
    .replaceAll('\uE0C7ᄀ', 'ᄁ') // kk
    .replaceAll('\uE0C7ᄃ', 'ᄄ') // tt
    .replaceAll('\uE0C7ᄇ', 'ᄈ') // pp
    .replaceAll('\uE0C7ᄌ', 'ᄍ') // jj
    .replaceAll('\uE0C7', 'ᄉ') // unmatched double consonant
    .replaceAll(/([\u1100-\u115F])([억옹울옥연운온언얼열인영을은])/gu, (_, initial: string, syllable: string) => initial + syllable.normalize("NFD").substring(1)) // combine initial with abbreviations
    .replaceAll(/([가나다마바사자카타파하])([\u11A8-\u11FF])/gu, (_, syllable: string, final: string) => syllable.normalize("NFD") + final) // combine abbreviations with final
    .replaceAll(/^[\u1160-\u1175]+$/gum, (match) => '\u115F' + match.split('').join('\u115F')) // filler for unmatched vowels in strings of unmatched vowels
    .replaceAll(/(?<![\u1100-\u115F])([\u1160-\u1175])/gu, 'ᄋ$1') // add null initial to all other unmatched vowels
    .replaceAll(/([\u1100-\u115F])(?![\u1160-\u1175]|$)/gum, '$1\u1160') // filler for unmatched initials
    .replaceAll(/(?<![\u1160-\u1175])([\u11A8-\u11FF])/gum, '\u115F\u1160$1') // filler for unmatched finals
    .normalize()
  );
}

// GBA special characters
function remapGBASpecialCharacters(s: string, language: string = '') {
  const isFullwidth = language == 'ja-Hrkt-JP';
  return (s
    .replaceAll('[PK]', '⒆') // Gen 3 PK
    .replaceAll('[PKMN]', '⒆⒇') // Gen 3 PKMN

    .replaceAll('[UP_ARROW]', '↑')
    .replaceAll('[DOWN_ARROW]', '↓')
    .replaceAll('[LEFT_ARROW]', '←')
    .replaceAll('[RIGHT_ARROW]', '→')
    .replaceAll('[SUPER_ER]', 'ᵉʳ')
    .replaceAll('[SUPER_E]', 'ᵉ')
    .replaceAll('[SUPER_RE]', 'ʳᵉ')

    .replaceAll('[UP_ARROW_2]', '↑')
    .replaceAll('[DOWN_ARROW_2]', '↓')
    .replaceAll('[LEFT_ARROW_2]', '←')
    .replaceAll('[RIGHT_ARROW_2]', '→')
    .replaceAll('[PLUS]', isFullwidth ? '＋' : '+')
    // LV, PP, ID, NO are handled in postprocess
    .replaceAll('[UNDERSCORE]', '＿') // also fullwidth in EFIGS, wider than EMOJI_UNDERSCORE
    .replaceAll('[CIRCLE_1]', '①')
    .replaceAll('[CIRCLE_2]', '②')
    .replaceAll('[CIRCLE_3]', '③')
    .replaceAll('[CIRCLE_4]', '④')
    .replaceAll('[CIRCLE_5]', '⑤')
    .replaceAll('[CIRCLE_6]', '⑥')
    .replaceAll('[CIRCLE_7]', '⑦')
    .replaceAll('[CIRCLE_8]', '⑧')
    .replaceAll('[CIRCLE_9]', '⑨')
    .replaceAll('[ROUND_LEFT_PAREN]', '（') // also fullwidth in EFIGS
    .replaceAll('[ROUND_RIGHT_PAREN]', '）') // also fullwidth in EFIGS
    .replaceAll('[CIRCLE_DOT]', '◎')
    .replaceAll('[TRIANGLE]', '△')
    .replaceAll('[BIG_MULT_X]', '✕') // EFIGS, larger than regular '×'

    .replaceAll('[KANJI_BIG]', '大')
    .replaceAll('[KANJI_SMALL]', '小')
    .replaceAll('[DAKUTEN]', '゛')
    .replaceAll('[HANDAKUTEN]', '゜')
  );
}

// GCN special characters
function remapGCNSpecialCharacters(s: string) {
  return (s
    .replaceAll('[..]', '‥')
    .replaceAll('[゛]', '゛')
    .replaceAll('[゜]', '゜')
    .replaceAll('[^er]', 'ᵉʳ')
  );
}

// NDS special characters
function remapNDSSpecialCharacters(s: string) {
  return s.search(/[\u2460-\u2487]/u) === -1 ? s : (s
    .replaceAll('\u2469', 'ᵉʳ') // Gen 5 superscript er [also used privately for Gen 4]
    .replaceAll('\u246A', 'ʳᵉ') // Gen 5 superscript re [also used privately for Gen 4]
    .replaceAll('\u246B', 'ʳ') // Gen 5 superscript r [also used privately for Gen 4]
    .replaceAll('\u2485', 'ᵉ') // Gen 5 superscript e [also used privately for Gen 4]
  );
}

// Wii special characters
function remapWiiSpecialCharacters(s: string) {
  return (s
    .replaceAll('\uE041', '✜') // Wii Remote Control Pad
    .replaceAll('\uE042', 'Ⓐ') // Wii Remote A Button
    .replaceAll('\uE043', 'Ⓑ') // Wii Remote B Button
    .replaceAll('\uE045', '⊕') // Wii Remote + Button
    .replaceAll('\uE046', '⊖') // Wii Remote - Button
    .replaceAll('\uE047', '①') // Wii Remote 1 Button
    .replaceAll('\uE048', '②') // Wii Remote 2 Button
    .replaceAll('\uE049', '◎') // Nunchuk Control Stick
    .replaceAll('\uE04A', 'Ⓒ') // Nunchuk C Button
    .replaceAll('\uE04B', 'Ⓩ') // Nunchuk Z Button
    .replaceAll('\uE058', '👆︎') // Player pointer

    // PBR
    .replaceAll('▽', '\\r')
    .replaceAll('▼', '\\c')
    .replaceAll('㌨', '♂') // halfwidth
    .replaceAll('㌩', '♀') // halfwidth
    .replaceAll('㌕', '◎') // halfwidth
    .replaceAll('㌀', '①') // fullwidth neutral face
    .replaceAll('㌁', '②') // fullwidth happy face
    .replaceAll('¼', 'ᵉʳ') // superscript er
    .replaceAll('½', 'ʳᵉ') // superscript re
    .replaceAll('¾', 'ᵉ') // Gen 5 superscript e

    // Ranch
    .replaceAll('\\f', '\\c')
    .replaceAll('%quot;', '"')
  );
}

// 3DS special characters
function remap3DSSpecialCharacters (s: string) {
  return remapChineseChars(remapKoreanBraille(
    s.search(/[\uE000-\uE0A8]/u) === -1 ? s : (s
      // System
      .replaceAll('\uE000', 'Ⓐ') // A Button
      .replaceAll('\uE001', 'Ⓑ') // B Button
      .replaceAll('\uE002', 'Ⓧ') // X Button
      .replaceAll('\uE003', 'Ⓨ') // Y Button
      .replaceAll('\uE004', 'Ⓛ') // L Button
      .replaceAll('\uE005', 'Ⓡ') // R Button
      .replaceAll('\uE006', '✜') // Control Pad
      .replaceAll('\uE073', '🏠︎') // Home Button

      // Pokémon private use
      .replaceAll('\uE08A', 'ᵉʳ') // Superscript er
      .replaceAll('\uE08B', 'ʳᵉ') // Superscript re
      .replaceAll('\uE08C', 'ʳ') // Superscript r
      .replaceAll('\uE092', '♥') // Halfwidth black heart suit
      .replaceAll('\uE09A', '♪') // Halfwidth eighth note
      .replaceAll('\uE0A6', 'ᵉ') // Superscript e

      // ORAS Braille
      .replaceAll('\uE081', '.') // French period (dots-256) [UNUSED]
      .replaceAll('\uE082', ',') // French comma (dots-2) [UNUSED]
      .replaceAll('\uE083', '.') // Italian period (dots-256) [UNUSED]
      .replaceAll('\uE084', ',') // Italian comma (dots-2) [UNUSED]
      .replaceAll('\uE085', '.') // German period (dots-3)
      .replaceAll('\uE086', ',') // German comma (dots-2) [UNUSED]
      .replaceAll('\uE087', '.') // Spanish period (dots-3)
      .replaceAll('\uE088', ',') // Spanish comma (dots-2) [UNUSED]
    )
  ));
}

// Switch special characters
function remapSwitchSpecialCharacters(s: string) {
  return s.search(/[\uE104\uE300-\uE31C]/u) === -1 ? s : (s
    .replaceAll('\uE104', '✨︎') // BDSP sparkles
    .replaceAll('\uE300', '$') // Pokémon Dollar
    .replaceAll('\uE301', 'A') // Unown A
    .replaceAll('\uE302', 'B') // Unown B
    .replaceAll('\uE303', 'C') // Unown C
    .replaceAll('\uE304', 'D') // Unown D
    .replaceAll('\uE305', 'E') // Unown E
    .replaceAll('\uE306', 'F') // Unown F
    .replaceAll('\uE307', 'G') // Unown G
    .replaceAll('\uE308', 'H') // Unown H
    .replaceAll('\uE309', 'I') // Unown I
    .replaceAll('\uE30A', 'J') // Unown J
    .replaceAll('\uE30B', 'K') // Unown K
    .replaceAll('\uE30C', 'L') // Unown L
    .replaceAll('\uE30D', 'M') // Unown M
    .replaceAll('\uE30E', 'N') // Unown N
    .replaceAll('\uE30F', 'O') // Unown O
    .replaceAll('\uE310', 'P') // Unown P
    .replaceAll('\uE311', 'Q') // Unown Q
    .replaceAll('\uE312', 'R') // Unown R
    .replaceAll('\uE313', 'S') // Unown S
    .replaceAll('\uE314', 'T') // Unown T
    .replaceAll('\uE315', 'U') // Unown U
    .replaceAll('\uE316', 'V') // Unown V
    .replaceAll('\uE317', 'W') // Unown W
    .replaceAll('\uE318', 'X') // Unown X
    .replaceAll('\uE319', 'Y') // Unown Y
    .replaceAll('\uE31A', 'Z') // Unown Z
    .replaceAll('\uE31B', '!') // Unown !
    .replaceAll('\uE31C', '?') // Unown ?
  );
}

/**
 * Appends additional metadata to each string:
 * - For strings with ruby, appends copies of the strings with the ruby text converted to kana/kanji so that they can be searched.
 *   These copies are separated by `U+F0000` and `U+F0001` so that they can be stripped before display.
 *
 * Returns the resulting string.
 */
function preprocessMetadata(s: string) {
  return s.search(/\{[^|}]+\|[^|}]+\}/u) === -1 ? s : (
    s.replaceAll(/^.*\{[^|}]+\|[^|}]+\}.*$/gum, (line) => {
      const lineKanji = line.replaceAll(/\{([^|}]+)\|[^|}]+\}/gu, '$1');
      const lineKana = line.replaceAll(/\{[^|}]+\|([^|}]+)\}/gu, '$1');
      return [line, '\u{F0000}', lineKanji, '\u{F0001}', lineKana].join('');
    })
  );
}
//#endregion

/**
 * Converts private use characters to the corresponding Unicode characters,
 * and adds additional searchable metadata.
 *
 * Returns the resulting string.
 */
function preprocessString(s: string, collectionKey: string, language: string = '') {
  switch (collectionKey) {
    case "FireRedLeafGreen":
    case "Emerald":
      s = remapGBASpecialCharacters(s, language);
      break;

    case "DiamondPearl":
    case "Platinum":
    case "HeartGoldSoulSilver":
    case "BlackWhite":
    case "Black2White2":
      s = remapNDSSpecialCharacters(s);
      break;

    case "XY":
    case "OmegaRubyAlphaSapphire":
    case "SunMoon":
    case "UltraSunUltraMoon":
    case "Bank":
      s = remap3DSSpecialCharacters(s);
      break;

    case "LetsGoPikachuLetsGoEevee":
    case "SwordShield":
    case "BrilliantDiamondShiningPearl":
    case "LegendsArceus":
    case "ScarletViolet":
    case "HOME":
      s = remapSwitchSpecialCharacters(s);
      break;

    case "Colosseum":
    case "XD":
      s = remapGCNSpecialCharacters(s);
      break;

    case "BattleRevolution":
    case "Ranch":
      s = remapWiiSpecialCharacters(s);
      break;
  }
  return preprocessMetadata(s);
}

/**
 * Converts escaped whitespace characters to literal whitespace characters, so that they are matched by `\s` when using a regex search.
 *
 * Returns the resulting string.
 */
function convertWhitespace(s: string) {
  return (s
    .replaceAll('\\\\', '\u{F0100}')
    .replaceAll('\\n', '\n')
    .replaceAll('\\r', '\r')
    .replaceAll('\\c', '\f')
    .replaceAll('\u{F0100}', '\\\\')
  );
}

//#region Post-processing
/**
 * Strips additional metadata from each string:
 * - Converted ruby text marked with `U+F0000` and `U+F0001`
 *
 * Returns the resulting string.
 */
function postprocessMetadata(s: string) {
  return s.split('\u{F0000}')[0];
}

function multiLine(s: string) {
  if (s.search(/[\u{F1000}\u{F1001}]/u) === -1) {
    return s;
  }
  return ['<dl>', ...s.split('\u{F1000}').map((line) => line.split('\u{F1001}')).map(([location, str]) => `<dt>${location}</dt><dd>${str}</dd>`), '</dl>'].join('');
}

/**
 * Converts the male and female forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
function genderBranch(male: string, female: string, neuter: string = '') {
  const results = [];
  if (male.length > 0) results.push(`<span class="branch male">${male}</span>`);
  if (female.length > 0) results.push(`<span class="branch female">${female}</span>`);
  if (neuter.length > 0) results.push(`<span class="branch neuter">${neuter}</span>`);
  return results.join('<span class="gender">/</span>');
}

/**
 * Converts the singular and plural forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
function numberBranch(singular: string, plural: string, zero: string = '') {
  const results = [];
  if (singular.length > 0) results.push(`<span class="branch singular">${singular}</span>`);
  if (plural.length > 0) results.push(`<span class="branch plural">${plural}</span>`);
  if (zero.length > 0) results.push(`<span class="branch zero">${zero}</span>`);
  return results.join('<span class="number">/</span>');
}

/**
 * Converts the male singular, female singular, male plural, and female plural forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
function genderNumberBranch(maleSingular: string, femaleSingular: string, malePlural: string, femalePlural: string) {
  const singularResults = [];
  if (maleSingular.length > 0) singularResults.push(`<span class="branch male singular">${maleSingular}</span>`);
  if (femaleSingular.length > 0) singularResults.push(`<span class="branch female singular">${femaleSingular}</span>`);
  const singular = singularResults.join('<span class="gender singular">/</span>');

  const pluralResults = [];
  if (malePlural.length > 0) pluralResults.push(`<span class="branch male plural">${malePlural}</span>`);
  if (femalePlural.length > 0) pluralResults.push(`<span class="branch female plural">${femalePlural}</span>`);
  const plural = pluralResults.join('<span class="gender plural">/</span>');

  const classResults = ['number'];
  if (maleSingular.length > 0 && malePlural.length > 0) classResults.push('male');
  if (femaleSingular.length > 0 && femalePlural.length > 0) classResults.push('female');
  const className = classResults.join(' ');
  return [singular, plural].join(`<span class="${className}">/</span>`);
}

/**
 * Converts the apocope forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
function apocopeBranch(form1: string, form2: string) {
  const results = [];
  if (form1.length > 0) results.push(`<span class="branch apocope1">${form1}</span>`);
  if (form2.length > 0) results.push(`<span class="branch apocope2">${form2}</span>`);
  return results.join('<span class="apocope">/</span>');
}

/**
 * Converts the version-specific forms of a string to HTML, separated by a slash.
 *
 * Returns the resulting string.
 */
function versionBranch(form1: string, form2: string, version1: string, version2: string) {
  const results = [];
  if (form1.length > 0) results.push(`<span class="branch version-${version1}">${form1}</span>`);
  if (form2.length > 0) results.push(`<span class="branch version-${version2}">${form2}</span>`);
  return results.join('<span class="version">/</span>');
}

const versionBranchRS = (form1: string, form2: string) => versionBranch(form1, form2, 'ruby', 'sapphire');
const versionBranchSV = (form1: string, form2: string) => versionBranch(form1, form2, 'scarlet', 'violet');
//#endregion

/**
 * Converts the provided string to HTML by escaping `<` and `>`,
 * replacing line break control characters such as `\n` with `<br>`,
 * and converting the ruby syntax `{base|ruby}` to the corresponding HTML tags.
 *
 * Returns the resulting HTML string.
 */
function postprocessString(s: string, collectionKey: string, language: string = '') {
  const isGen3 = ["FireRedLeafGreen", "Emerald"].includes(collectionKey);
  const isGen4 = ["DiamondPearl", "Platinum", "HeartGoldSoulSilver"].includes(collectionKey);
  const isGen5 = ["BlackWhite", "Black2White2"].includes(collectionKey);
  const isBDSP = collectionKey == "BrilliantDiamondShiningPearl";
  const isPBR = collectionKey == "BattleRevolution";
  const isRanch = collectionKey == "Ranch";

  const isNDS = isGen4 || isGen5;
  const is3DS = ["XY", "OmegaRubyAlphaSapphire", "SunMoon", "UltraSunUltraMoon", "Bank"].includes(collectionKey);
  const isSwitch = ["LetsGoPikachuLetsGoEevee", "SwordShield", "BrilliantDiamondShiningPearl", "LegendsArceus", "ScarletViolet", "HOME"].includes(collectionKey);
  const isSoftLineBreak = ["LegendsArceus", "ScarletViolet"].includes(collectionKey);
  const isGCN = ["Colosseum", "XD"].includes(collectionKey);
  const isModern = isGen5 || is3DS || isSwitch;

  s = postprocessMetadata(s);

  // Replace literal special characters with a placeholder so they don't match other rules
  s = (s
    .replaceAll('\\\\', '\u{F0100}')
    .replaceAll('\\[', '\u{F0102}')
    .replaceAll('\\{', '\u{F0104}')
    .replaceAll('<', '\u{F0106}')
    .replaceAll('>', '\u{F0107}')
  );

  // Whitespace
  s = (s
    .replaceAll('\\n', '\u{F0200}')
    .replaceAll('\\r', '\u{F0201}')
    .replaceAll('\\c', '\u{F0202}')
    .replaceAll('\t', '\u{F0203}')
  );
  s = isGen4 ? (s
    .replaceAll('[VAR 0207]', '\u{F0207}')
    .replaceAll('[VAR 0208]', '\u{F0208}')
  ): s;
  s = isGen3 ? (s
    .replaceAll('\\e', '\u{F02FF}')
  ): s;

  // PKMN
  s = (isGen3 || isNDS) ? (s
    .replaceAll('\u2486', '<sup>P</sup><sub>K</sub>') // Gen 5 PK [also used privately for Gen 4 and earlier]
    .replaceAll('\u2487', '<sup>M</sup><sub>N</sub>') // Gen 5 MN [also used privately for Gen 4 and earlier]
  ): s;
  s = is3DS ? (s
    .replaceAll('\uE0A7', '<sup>P</sup><sub>K</sub>') // 3DS PK (unused)
    .replaceAll('\uE0A8', '<sup>M</sup><sub>N</sub>') // 3DS MN (unused)
  ): s;

  // Literals
  s = isGen3 ? (s
    // POKé, POKéBLOCK
    .replaceAll('[POKE]', '<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>')
    .replaceAll('[POKEBLOCK]', `<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>\u{F1102}${g3.expandBlock(language)}\u{F1103}`)
    .replaceAll('[BLOCK]', `\u{F1102}${g3.expandBlock(language)}\u{F1103}`)
    .replaceAll('[POKEMELLA]', '\u{F1102}<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>MELLA\u{F1103}')
    .replaceAll('[MELLA]', '\u{F1102}MELLA\u{F1103}')
    .replaceAll('[POKEMELLE]', '\u{F1102}<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>MELLE\u{F1103}')
    .replaceAll('[MELLE]', '\u{F1102}MELLE\u{F1103}')

    // Gender unknown symbol (blank space with the same width as ♂/♀)
    // Also used as a figure space when printing variables, but this doesn't occur in regular text
    .replaceAll('[UNK_SPACER]', '\u2002')

    // Special characters (Lv, PP, ID, No)
    .replaceAll('[LV]', `\u{F1102}<span class="literal-small">${g3.expandLv(language)}</span>\u{F1103}`)
    .replaceAll('[LV_2]', `\u{F1102}<span class="literal-small">${g3.expandLv2(language)}</span>\u{F1103}`)
    .replaceAll('[LV_3]', `\u{F1102}<span class="literal-small">${g3.expandLv3(language)}</span>\u{F1103}`)
    .replaceAll('[PP]', `\u{F1102}<span class="literal-small">${g3.expandPP(language)}</span>\u{F1103}`)
    .replaceAll('[ID]', `\u{F1102}<span class="literal-small">${g3.expandID()}</span>\u{F1103}`)
    .replaceAll('[NO]', `\u{F1102}<span class="literal-small">${g3.expandNo(language)}</span>\u{F1103}`)
    .replaceAll('[Pco]', `\u{F1102}<span class="literal-small">${g3.expandPco()}</span>\u{F1103}`)
  ): s;

  // Text formatting
  s = isBDSP ? (s
    .replaceAll(/\u{F0106}color=(.*?)\u{F0107}(.*?)\u{F0106}\/color\u{F0107}/gu, '<span style="color: $1">$2</span>') // BDSP color
    .replaceAll(/\u{F0106}size=(.*?)\u{F0107}(.*?)\u{F0106}\/size\u{F0107}/gu, '<span style="font-size: $1">$2</span>') // BDSP size
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\u{F0106}pos=(.*?)\u{F0107}(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span style="tab-size: $2">$1\t$3</span>') // BDSP pos
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\u{F0106}line-indent=(.*?)\u{F0107}(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span style="tab-size: $2">$1\t$3</span>') // BDSP line-indent
  ): s;
  s = isGen4 ? (s
    .replaceAll(/\[VAR FF01\(FF43\)\]\[VAR FF01\(30B3\)\]/gu, '') // Gen 4 font size (empty string at 200%)
    .replaceAll(/\[VAR FF01\(FF43\)\](.+?)(?:\[VAR FF01\(30B3\)\]|[\u{F0201}\u{F0202}\u{F0200}]|$)/gu, '<span class="line-font-size-200"><span class="text-font-size-200">$1</span></span>') // Gen 4 font size (text at 200%)
    .replaceAll('[VAR FF01(30B3)]', '') // Gen 4 font size (set to 100%)

    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\[VAR 0203\(..([0-9A-F]{2})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before, size, after) => `<span style="tab-size: ${parseInt(size, 16)}pt">${before}\t${after}</span>`) // Gen 4 X coords
    .replaceAll(/\[VAR 0203\(..([0-9A-F]{2})\)\]/gu, '\t') // can't really have multiple tab sizes, so approximate the rest as tabs
    .replaceAll(/\[VAR 0204\(..([0-9A-F]{2})\)\]/gu, (_, pad) => `<div style="height: ${parseInt(pad, 16)}pt"></div>`) // Gen 4 Y coords
    .replaceAll(/\[VAR 0205\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span class="line-align-center">$1</span>') // HGSS
    .replaceAll(/\[VAR 0206\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span class="line-align-right">$1</span>') // HGSS
  ): s;
  s = isModern ? (s
    .replaceAll(/\[VAR BD02\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span class="line-align-center">$1</span>') // Gen 5+
    .replaceAll(/\[VAR BD03\(([0-9A-F]{4})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, pad, text) => `<span class="line-align-right" style="padding-right: ${parseInt(pad, 16)}pt">${text}</span>`) // Gen 5+
    .replaceAll(/\[VAR BD04\(([0-9A-F]{4})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, pad, text) => `<span class="line-align-left" style="padding-left: ${parseInt(pad, 16)}pt">${text}</span>`) // Gen 5+
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\[VAR BD05\(..([0-9A-F]{2})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before, size, after) => `<span style="tab-size: ${parseInt(size, 16)}pt">${before}\t${after}</span>`) // Gen 5 X coords
    .replaceAll(/\[VAR BD05\(..([0-9A-F]{2})\)\]/gu, '\t') // can't really have multiple tab sizes, so approximate the rest as tabs
  ): s;
  s = isPBR ? (s
    .replaceAll(/\[ALIGN 1\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, '<span class="line-align-left">$1</span>') // PBR
    .replaceAll(/\[ALIGN 2\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, '<span class="line-align-center">$1</span>') // PBR
    .replaceAll(/\[ALIGN 3\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, '<span class="line-align-right">$1</span>') // PBR
  ): s;

  // Line breaks
  s = isGen4 ? (s
    .replaceAll('\u{F0207}\u{F0200}', '<span class="c">[VAR 0207]</span><span class="n">\\n</span><br>') // [VAR 0207]\n
    .replaceAll('\u{F0208}\u{F0200}', '<span class="r">[VAR 0208]</span><span class="n">\\n</span><br>') // [VAR 0208]\n
  ): s;
  s = isSoftLineBreak ? (s
    .replaceAll('\u{F0201}\u{F0200}', '<span class="soft"> </span><span class="r">\\r</span><span class="n">\\n</span><wbr class="soft">') // \r\n
  ): s;
  s = (s
    .replaceAll('\u{F0201}\u{F0200}', '<span class="r">\\r</span><span class="n">\\n</span><br>') // \r\n
    .replaceAll('\u{F0202}\u{F0200}', '<span class="c">\\c</span><span class="n">\\n</span><br>') // \c\n
    .replaceAll('\u{F0200}\u{F0202}', '<span class="n">\\n</span><span class="c">\\c</span><br>') // \n\c (Ranch)
    .replaceAll('\u{F02FF}\u{F0200}', '<span class="e">\\e</span><span class="n">\\n</span><br>') // \e\n (Emerald)
  );
  s = isGen4 ? (s
    .replaceAll('\u{F0207}', '<span class="c">[VAR 0207]</span><br>') // [VAR 0207]
    .replaceAll('\u{F0208}', '<span class="r">[VAR 0208]</span><br>') // [VAR 0208]
  ): s;
  s = (s
    .replaceAll('\u{F0201}', '<span class="r">\\r</span><br>') // \r
    .replaceAll('\u{F0202}', '<span class="c">\\c</span><br>') // \c
    .replaceAll('\u{F0200}', '<span class="n">\\n</span><br>') // \n
    .replaceAll('\u{F02FF}', '<span class="e">\\e</span><br>') // \e

    .replaceAll('\u{F0203}', '<span class="tab">\t</span>')
  );

  // GCN
  s = isGCN ? (s
    .replaceAll(/\[unknown5_08_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})\](.*?)(?:\[unknown5_08_ff_ff_ff_ff\]|$|(?=\u{F1000}))/gu, '<span style="color: #$1$2$3$4">$5</span>')
    .replaceAll('[Player]', '<span class="var">[Player]</span>')
    .replaceAll('[Player_alt]', '<span class="var">[Player_alt]</span>')
    .replaceAll('[Rui]', '<span class="var">[Rui]</span>')
    .replaceAll('[opp_trainer_class]', '<span class="var">[opp_trainer_class]</span>')
    .replaceAll('[opp_trainer_name]', '<span class="var">[opp_trainer_name]</span>')
    .replaceAll('[sent_out_pokemon_1]', '<span class="var">[sent_out_pokemon_1]</span>')
    .replaceAll('[sent_out_pokemon_2]', '<span class="var">[sent_out_pokemon_2]</span>')
    .replaceAll('[speechbubble]', '<span class="var">[speechbubble]</span>')
    .replaceAll('[bubble_or_speaker]', '<span class="var">[bubble_or_speaker]</span>')
    .replaceAll('[maybe_speaker_ID_toggle]', '<span class="var">[maybe_speaker_ID_toggle]</span>')
    .replaceAll('[maybe_location]', '<span class="var">[maybe_location]</span>')
    .replaceAll('[dialogue_end]', '<span class="var">[dialogue_end]</span>')
    .replaceAll('[large_e]', '<span class="var">[large_e]</span>')
    .replaceAll('[large_e+]', '<span class="var">[large_e+]</span>')
    .replaceAll('[furi_kanji]', '<span class="var">[furi_kanji]</span>')
    .replaceAll('[furi_kana]', '<span class="var">[furi_kana]</span>')
    .replaceAll('[furi_close]', '<span class="var">[furi_close]</span>')
    .replaceAll(/(\[some_[^\]]+?\])/gu, '<span class="var">$1</span>')
    .replaceAll(/(\[unknown[^\]]+?\])/gu, '<span class="var">$1</span>')
    .replaceAll(/(\[var_[^\]]\])/gu, '<span class="var">$1</span>')
  ): s;

  // PBR
  s = isPBR ? (s
    .replaceAll(/\[COLOR (\d+)\](.*?)(?:\[COLOR \d+\]|[\u{F0201}\u{F0202}\u{F0200}]|$)/gu, '<span class="color-pbr-$1">$2</span>')
    .replaceAll(/(\[VERTOFFSET -?[\d.]+\])/gu, '<span class="vertoffset">$1</span>') // '<span style="position: relative; top: $1px">$2</span>'
    .replaceAll(/\[FONT ([0126])\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[FONT \d+\]|$)/gu, '<span class="font-pbr-$1">$2</span>')
    .replaceAll(/(\[FONT [\d.]+\])/gu, '<span class="var">$1</span>')
    .replaceAll(/\[SPACING (-?[\d.]+)\](.*?$)/gu, '<span class="spacing-$1">$2</span>')
  ): s;

  // Ranch
  s = isRanch ? (s
    .replaceAll(/(%((\d+\$)?(\d*d|\d*\.\d+[fs]m?|ls)|(\(\d+\)%|\d+\$)?\{\}|\(\d+\)))/gu, '<span class="var">$1</span>')
    .replaceAll(/(\$\d+\$)/gu, '<span class="var">$1</span>')
  ): s;

  s = (s
    .replaceAll('[NULL]', '<span class="null">[NULL]</span>')
    .replaceAll('[COMP]', '<span class="compressed">[COMP]</span>')
  );
  s = isGen3 ? (s
    .replaceAll(/(\[DYNAMIC \d+\])/gu, '<span class="var">$1</span>') // F7 xx
    .replaceAll(/(\[(?:(?:[ABLR]|START|SELECT)_BUTTON|DPAD_(?:UP|DOWN|LEFT|RIGHT|UPDOWN|LEFTRIGHT|NONE))\])/gu, '<span class="var">$1</span>') // F8 xx
    .replaceAll(/(\[EMOJI_[^\]]+?\])/gu, '<span class="var">$1</span>') // F9 D0 - F9 FE

    .replaceAll(/(\[COLOR [^\]]+?\])/gu, '<span class="var">$1</span>') // FC 01 xx
    .replaceAll('[COLOR]', '<span class="var">[COLOR]</span>') // FC 01
    .replaceAll(/(\[HIGHLIGHT [^\]]+?\])/gu, '<span class="var">$1</span>') // FC 02 xx
    .replaceAll(/(\[SHADOW [^\]]+?\])/gu, '<span class="var">$1</span>') // FC 03 xx
    .replaceAll(/(\[COLOR_HIGHLIGHT_SHADOW [^\]]+?\])/gu, '<span class="var">$1</span>') // FC 04 xx xx xx
    .replaceAll(/(\[PALETTE [^\]]+?\])/gu, '<span class="var">$1</span>') // FC 05 xx
    .replaceAll(/(\[(?:FONT [^\]]+?|FONT_[^\]]+?)\])/gu, '<span class="var">$1</span>') // FC 06 xx
    .replaceAll(/(\[PAUSE \d+\])/gu, '<span class="var">$1</span>') // FC 08 xx
    .replaceAll('[PAUSE_UNTIL_PRESS]', '<span class="var">[PAUSE_UNTIL_PRESS]</span>') // FC 09 xx
    .replaceAll('[WAIT_SE]', '<span class="var">[WAIT_SE]</span>') // FC 0A xx
    .replaceAll(/(\[PLAY_BGM [^\]]+?\])/gu, '<span class="var">$1</span>') // FC 0B xx
    .replaceAll(/(\[ESCAPE \d+\])/gu, '<span class="var">$1</span>') // FC 0C xx
    .replaceAll(/(\[PLAY_SE [^\]]+?\])/gu, '<span class="var">$1</span>') // FC 10 xx
    .replaceAll(/(\[CLEAR \d+\])/gu, '<span class="var">$1</span>') // FC 11 xx
    .replaceAll(/(\[CLEAR_TO \d+\])/gu, '<span class="var">$1</span>') // FC 13 xx
    .replaceAll('[PAUSE_MUSIC]', '<span class="var">[PAUSE_MUSIC]</span>') // FC 17 xx
    .replaceAll('[RESUME_MUSIC]', '<span class="var">[RESUME_MUSIC]</span>') // FC 18 xx

    .replaceAll('[PLAYER]', '<span class="var">[PLAYER]</span>') // FD 01
    .replaceAll('[STR_VAR_1]', '<span class="var">[STR_VAR_1]</span>') // FD 02
    .replaceAll('[STR_VAR_2]', '<span class="var">[STR_VAR_2]</span>') // FD 03
    .replaceAll('[STR_VAR_3]', '<span class="var">[STR_VAR_3]</span>') // FD 04
    .replaceAll('[RIVAL]', '<span class="var">[RIVAL]</span>') // FD 06 (FRLG)
    .replaceAll(/(\[B_[^\]]+?\])/gu, '<span class="var">$1</span>') // FD xx (battle string placeholders)

    .replaceAll(/\u{F1102}\u{F1200}(.*?)\u{F1104}(.*?)\u{F1103}/gu, (_, male, female) => genderBranch(male, female)) // FD 05, FD 06
    .replaceAll(/\u{F1102}\u{F1207}(.*?)\u{F1104}(.*?)\u{F1103}/gu, (_, form1, form2) => versionBranchRS(form1, form2)) // FD 07 - FD 0D
  ): s;
  s = isModern ? (s
    .replaceAll(/\[VAR (?:GENDBR|1100)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenF, lenM, rest) => {
      const endM = parseInt(lenM, 16);
      const endF = endM + parseInt(lenF, 16);
      return `${genderBranch(rest.substring(0, endM), rest.substring(endM, endF))}${rest.substring(endF)}`;
    })
    .replaceAll(/\[VAR (?:GENDBR|1100)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),00([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenF, lenM, lenN, rest) => {
      const endM = parseInt(lenM, 16);
      const endF = endM + parseInt(lenF, 16);
      const endN = endF + parseInt(lenN, 16);
      return `${genderBranch(rest.substring(0, endM), rest.substring(endM, endF), rest.substring(endF, endN))}${rest.substring(endN)}`;
    })
    .replaceAll(/\[VAR (?:NUMBRNCH|1101)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenP, lenS, rest) => {
      const endS = parseInt(lenS, 16);
      const endP = endS + parseInt(lenP, 16);
      return `${numberBranch(rest.substring(0, endS), rest.substring(endS, endP))}${rest.substring(endP)}`;
    })
    .replaceAll(/\[VAR (?:1102)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenFS, lenMS, lenFP, lenMP, rest) => {
      const endMS = parseInt(lenMS, 16);
      const endFS = endMS + parseInt(lenFS, 16);
      const endMP = endFS + parseInt(lenMP, 16);
      const endFP = endMP + parseInt(lenFP, 16);
      return `${genderNumberBranch(rest.substring(0, endMS), rest.substring(endMS, endFS), rest.substring(endFS, endMP), rest.substring(endMP, endFP))}${rest.substring(endFP)}`;
    })
    .replaceAll(/\[VAR (?:1104|1106)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, len2, len1, rest) => {
      const end1 = parseInt(len1, 16);
      const end2 = end1 + parseInt(len2, 16);
      return `${apocopeBranch(rest.substring(0, end1), rest.substring(end1, end2))}${rest.substring(end2)}`;
    })
    .replaceAll(/\[VAR (?:1105)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),00([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenP, lenS, lenZ, rest) => {
      const endS = parseInt(lenS, 16);
      const endP = endS + parseInt(lenP, 16);
      const endZ = endP + parseInt(lenZ, 16);
      return `${numberBranch(rest.substring(0, endS), rest.substring(endS, endP), rest.substring(endP, endZ))}${rest.substring(endZ)}`;
    })
    .replaceAll(/\[VAR (?:1107)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, len2, len1, rest) => {
      const end1 = parseInt(len1, 16);
      const end2 = end1 + parseInt(len2, 16);
      return `${versionBranchSV(rest.substring(0, end1), rest.substring(end1, end2))}${rest.substring(end2)}`;
    })
  ): s;
  s = isBDSP ? (s
    .replaceAll(/\[VAR 1[3-7A]00\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)(?:\|([^[<{]*?))?\)\]/gu, (_, male, female) => genderBranch(male, female ?? ''))
    .replaceAll(/\[VAR 1[3-7A]01\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)(?:\|([^[<{]*?))?\)\]/gu, (_, singular, plural) => numberBranch(singular, plural ?? ''))
    .replaceAll(/\[VAR 1[3-7A]02\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)\|([^[<{]*?)\|([^[<{]*?)\|([^[<{]*?)\)\]/gu, (_, maleSingular, femaleSingular, malePlural, femalePlural) => genderNumberBranch(maleSingular, femaleSingular, malePlural, femalePlural))
  ): s;
  s = (s
    .replaceAll(/(\[VAR [^\]]+?\])/gu, '<span class="var">$1</span>')
    .replaceAll(/(\[WAIT [\d.]+\])/gu, '<span class="wait">$1</span>')
    .replaceAll(/(\[SFX [\d.]+\])/gu, '<span class="sfx">$1</span>') // BDSP
    .replaceAll(/(\[~ \d+\])/gu, '<span class="unused">$1</span>')
    .replaceAll(/\{([^|}]+)\|([^|}]+)\}/gu, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>') // Switch furigana
    .replaceAll(/(\s+$)/gu, '<span class="whitespace-trailing">$1</span>') // Trailing whitespace
    .replaceAll(/(^\s+)/gu, '<span class="whitespace-leading">$1</span>') // Leading whitespace

    // Speaker name
    .replaceAll(/^(.+)\u{F1100}(.+?)\u{F1101}/gu, '<a class="speaker" data-var="$1">$2</a>')
    .replaceAll(/\u{F1102}(.+?)\u{F1103}/gu, '<span class="literal">$1</span>')

    // Replace placeholders with literal characters
    .replaceAll('\u{F0100}', '\\')
    .replaceAll('\u{F0102}', '[')
    .replaceAll('\u{F0104}', '{')
    .replaceAll('\u{F0106}', '&lt;')
    .replaceAll('\u{F0107}', '&gt;')
  );
  return multiLine(s);
}

export { preprocessString, convertWhitespace, postprocessString };
