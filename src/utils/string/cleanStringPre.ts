/**
 * Various string handling functions.
 *
 * Note that the following codepoints are used internally, and may produce unexpected output if present in input text:
 * - U+F0000: delimiter for copy of string with ruby text converted to kanji
 * - U+F0001: delimiter for copy of string with ruby text converted to kana
 *
 * - U+F0100: placeholder for literal backslash `\\`
 * - U+F0101: placeholder for literal slash `\/`
 * - U+F0102: placeholder for literal left square bracket `\[`
 * - U+F0104: placeholder for literal left curly bracket `\{`
 * - U+F0106: placeholder for less-than sign `<`
 * - U+F0107: placeholder for greater-than sign `>`
 * - U+F0108: placeholder for left parenthesis `(`
 * - U+F0109: placeholder for right parenthesis `)`
 *
 * - U+F0180: placeholder for literal quotation mark `\"`
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
 *
 * - U+F1300: mark a soft line break
 */

import { CollectionKey, LanguageKey } from '../corpus';
import chineseChars from './chineseChars';
import { preprocessStringGO } from './cleanStringGO';
import { preprocessStringMasters } from './cleanStringMasters';
import { variables3DS } from './variableNames';

//#region Pre-processing
// SMUSUM Chinese Pokémon names
export function remapChineseChars(s: string) {
  return s.replaceAll(/[\uE800-\uEE26]/gu, (c: string) => chineseChars[c.charCodeAt(0) - 0xE800]);
}

// ORAS Korean Braille
export function remapKoreanBraille(s: string) {
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

// GBA Braille
const brailleJapanese = '　アッイワナ⠆ニ⠈ウオエヤヌノネ⠐ラーリヲタ⠖チ⠘ルロレヨツトテ⠠カ⠢キ⠤ハ⠦ヒ⠨クコケユフホヘ⠰サ⠲シンマ⠶ミ⠸スソセ⠼ムモメ';
const brailleWestern = ' A,B.K⠆L⠈CIF⠌MSP,E⠒H⠔O⠖R⠘DJGÄNTQ⠠⠡⠢⠣-U⠦V⠨⠩Ö⠫⠬X⠮⠯⠰⠱.Ü⠴Z⠶⠷⠸⠹W⠻⠼Y⠾⠿';

export function remapGBABrailleJapanese(s: string) {
  return (s.replaceAll(/[\u2800-\u283F]/gu, (c: string) => brailleJapanese[c.charCodeAt(0) - 0x2800])
    .replaceAll(/([\u2808\u2810\u2818\u2820\u2828])(.)/gu, (_, prefix: string, base: string) => {
      // Japanese braille encodes yōon, dakuten, and handakuten in the preceding cell
      // " ^dh CV" (braille) -> "CV^dh" (kana)
      // "y^dh CV" (braille) -> "Ci^dh yV" (kana)
      const code = prefix.charCodeAt(0);

      let suffix = '';
      if (code & 0x08) { // yōon (dot 4)
        const index = 'カクコサスソタツトナヌノハフホマムモラルロ'.indexOf(base);
        if (index !== -1) {
          base = 'キシチニヒミリ'[Math.floor(index / 3)]; // consonant + i
          suffix = 'ャュョ'[index % 3]; // y + vowel
        }
      }

      if (code & 0x10) // dakuten (dot 5)
        base = String.fromCodePoint(base.charCodeAt(0) + 1); // add dakuten
      else if (code & 0x20) // handakuten (dot 6)
        base = String.fromCodePoint(base.charCodeAt(0) + 2); // add handakuten
      return base.concat(suffix);
    })
  );
}

export function remapGBABrailleWestern(s: string, language: LanguageKey) {
  // In German/Spanish, the period/comma are incorrectly written with a preceding '⠿'
  if (language === 'de' || language === 'es')
    s = s.replaceAll(/\u283F([\u2802\u2804])/gu, '$1');
  return s.replaceAll(/[\u2800-\u283F]/gu, (c: string) => brailleWestern[c.charCodeAt(0) - 0x2800]);
}

function remapGBABraille(s: string, language: LanguageKey) {
  s = s.replaceAll(/(\[BRAILLE_FORMAT(?: \d+){6}\])/gu, ''); // Strip RSE braille format
  return language === 'ja-Hrkt' ? remapGBABrailleJapanese(s) : remapGBABrailleWestern(s, language);
}

// GBA special characters
function remapGBASpecialCharacters(s: string, language: LanguageKey) {
  return (remapGBABraille(s, language)
    // Old method for strings introduced in RS
    // Japanese - FC 0C xx (ESCAPE)
    // Western - replacing Japanese characters
    .replaceAll('[UP_ARROW]', '↑')
    .replaceAll('[DOWN_ARROW]', '↓')
    .replaceAll('[LEFT_ARROW]', '←')
    .replaceAll('[RIGHT_ARROW]', '→')
    .replaceAll('[PLUS]', '＋')
    .replaceAll('[AMPERSAND]', '＆') // Japanese RS credits
    .replaceAll('[EQUALS]', '＝') // Japanese RS options
    .replaceAll('[PK]', '⒆') // Gen 3 PK
    .replaceAll('[PKMN]', '⒆⒇') // Gen 3 PKMN
    .replaceAll('[SUPER_ER]', 'ᵉʳ')
    .replaceAll('[SUPER_E]', 'ᵉ')
    .replaceAll('[SUPER_RE]', 'ʳᵉ')

    // FRLGE - FC 0C xx (ESCAPE)
    // These still use the old escape sequence
    .replaceAll('[ESCAPE 0]', '↑')
    .replaceAll('[ESCAPE 1]', '↓')
    .replaceAll('[ESCAPE 2]', '←')
    .replaceAll('[ESCAPE 3]', '→')
    .replaceAll('[ESCAPE 4]', '＋')

    // New method for strings introduced in FRLGE
    // FRLGE - F9 xx (EXTRA_SYMBOL)
    .replaceAll('[UP_ARROW_2]', '↑')
    .replaceAll('[DOWN_ARROW_2]', '↓')
    .replaceAll('[LEFT_ARROW_2]', '←')
    .replaceAll('[RIGHT_ARROW_2]', '→')
    .replaceAll('[PLUS]', '＋')
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

// N64 special characters
function remapN64SpecialCharacters(s: string) {
  return (s
    .replaceAll('¥', '$') // Pokémon Dollar
    .replaceAll('¼', '⒆') // PK
    .replaceAll('½', '⒇') // MN
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
    .replaceAll('⑩', 'ᵉʳ') // Gen 5 superscript er [also used privately for Gen 4]
    .replaceAll('⑪', 'ʳᵉ') // Gen 5 superscript re [also used privately for Gen 4]
    .replaceAll('⑫', 'ʳ') // Gen 5 superscript r [also used privately for Gen 4]
    .replaceAll('⒅', 'ᵉ') // Gen 5 superscript e [also used privately for Gen 4]
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
    .replaceAll('¥', '\\\\') // backslash
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

// 3DS variable names
function remap3DSVariables(s: string) {
  s = s.replaceAll('\\[', '\u{F0102}');
  for (const [code, name] of variables3DS.entries()) {
    s = s.replaceAll(new RegExp(`\\[VAR ${name}\\b`, 'gu'), `[VAR ${code}`);
  };
  s = s.replaceAll('\u{F0102}', '\\[');
  return s;
}

// Switch special characters
function remapSwitchSpecialCharacters(s: string) {
  s = remapLegendsZAEscapedCharacters(s);
  return s.search(/[\uE104\uE300-\uE34C]/u) === -1 ? s : (s
    .replaceAll('\uE104', '✨︎') // BDSP sparkles
    .replaceAll('\uE300', '$') // Pokémon Dollar

    // PLA
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

    // Z-A
    // U+E31D-E33F: buttons are handled in postprocess
    .replaceAll('\uE340', '▾') // Bottom-right down-pointing triangle
    // U+E341 handled in postprocess
    .replaceAll('\uE342', '綉') // CHT xiù (used in Valerie's name)
    .replaceAll('\uE343', '원') // KOR won (currency)
    .replaceAll('\uE344', '배') // KOR bae (times)
    .replaceAll('\uE345', '명') // KOR myeong (people)
    .replaceAll('\uE346', '개') // KOR gae (counter)
    .replaceAll('\uE347', '倍') // CHT bèi (times)
    .replaceAll('\uE348', '人') // CHT rén (people)
    .replaceAll('\uE349', '枚') // CHT méi (counter)
    .replaceAll('\uE34A', '倍') // CHS bèi (times)
    .replaceAll('\uE34B', '人') // CHS rén (people)
    .replaceAll('\uE34C', '枚') // CHS méi (counter)
  );
}

const escapedZA: ReadonlyMap<string, string> = new Map([
  ['Text_icon1', '\uE340'],
  ['Text_infinity', '\uE341'],
]);

// Legends: Z-A escaped private use characters
function remapLegendsZAEscapedCharacters(s: string) {
  if (s.search(/VAR BD0A/u) !== -1) {
    for (const [name, c] of escapedZA.entries()) {
      const len = name.length.toString(16).padStart(4, '0').toUpperCase();
      s = s.replaceAll(new RegExp( `\\[VAR BD0A\\(${len}\\)\\]${name}`, 'gu'), c);
    };
  }
  return s;
}

// Pixel font used to display level in battle
function remapChinaLGPEPixelFont(s: string) {
  return (s
    .replaceAll(/\b(ab|ef|ij)\b/gu, '等级')
    .replaceAll(/\b(cd|gh|kl)\b/gu, '战力')
  );
}

/**
 * Appends additional metadata to each string:
 * - For strings with ruby, appends copies of the strings with the ruby text converted to kana/kanji so that they can be searched.
 *   These copies are separated by `U+F0000` and `U+F0001` so that they can be stripped before display.
 *
 * Returns the resulting string.
 */
export function preprocessMetadata(s: string) {
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
export function preprocessString(s: string, collectionKey: CollectionKey, language: LanguageKey) {
  switch (collectionKey) {
    case "RubySapphire":
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
      s = remap3DSVariables(s);
      break;

    case "LetsGoPikachuLetsGoEevee":
      s = remapSwitchSpecialCharacters(s);
      if (language === 'zh-Hans-CN')
        s = remapChinaLGPEPixelFont(s);
      break;

    case "SwordShield":
    case "BrilliantDiamondShiningPearl":
    case "LegendsArceus":
    case "ScarletViolet":
    case "HOME":
    case "LegendsZA":
      s = remapSwitchSpecialCharacters(s);
      break;

    case "Stadium":
    case "Stadium2":
      s = remapN64SpecialCharacters(s);
      break;

    case "Colosseum":
    case "XD":
      s = remapGCNSpecialCharacters(s);
      break;

    case "BattleRevolution":
    case "Ranch":
      s = remapWiiSpecialCharacters(s);
      break;

    case "GO":
      s = preprocessStringGO(s, language);
      break;

    case "Masters":
      s = preprocessStringMasters(s);
      break;
  }
  return preprocessMetadata(s);
}

/**
 * Converts escaped whitespace characters to literal whitespace characters, so that they are matched by `\s` when using a regex search.
 *
 * Returns the resulting string.
 */
export function convertWhitespace(s: string) {
  return (s
    .replaceAll('\\\\', '\u{F0100}')
    .replaceAll('\\n', '\n')
    .replaceAll('\\r', '\r')
    .replaceAll('\\c', '\f')
    .replaceAll('\u{F0100}', '\\\\')
  );
}
