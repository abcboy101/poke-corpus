/**
 * String handling functions for converting the corpus to a standard, searchable format.
 */

import { CollectionKey, LanguageKey } from '../corpus';
import { getCorpusGroups } from "../corpusGroups";
import chineseChars from './chineseChars';
import { preprocessStringGO } from './cleanStringGO';
import { preprocessStringMasters } from './cleanStringMasters';
import { variables3DS } from './variableNames';

//#region Pre-processing helper functions
// SMUSUM Chinese Pokémon names
export function remapChineseChars(s: string) {
  return s.replaceAll(/[\uE800-\uEE26]/g, (c: string) => chineseChars[c.charCodeAt(0) - 0xE800]);
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
    .replaceAll(/([\u1100-\u115F])([억옹울옥연운온언얼열인영을은])/g, (_, initial: string, syllable: string) => initial + syllable.normalize("NFD").substring(1)) // combine initial with abbreviations
    .replaceAll(/([가나다마바사자카타파하])([\u11A8-\u11FF])/g, (_, syllable: string, final: string) => syllable.normalize("NFD") + final) // combine abbreviations with final
    .replaceAll(/^[\u1160-\u1175]+$/gm, (match) => '\u115F' + match.split('').join('\u115F')) // filler for unmatched vowels in strings of unmatched vowels
    .replaceAll(/(?<![\u1100-\u115F])([\u1160-\u1175])/g, 'ᄋ$1') // add null initial to all other unmatched vowels
    .replaceAll(/([\u1100-\u115F])(?![\u1160-\u1175]|$)/gm, '$1\u1160') // filler for unmatched initials
    .replaceAll(/(?<![\u1160-\u1175])([\u11A8-\u11FF])/gm, '\u115F\u1160$1') // filler for unmatched finals
    .normalize()
  );
}

// GB special characters
function remapGBSpecialCharacters(s: string) {
  return (s
    .replaceAll('¥', '$') // Pokémon Dollar
    .replaceAll('<PK>', '⒆') // Gen 1/2 PK
    .replaceAll('<MN>', '⒇') // Gen 1/2 MN
    .replaceAll('<do>', 'ど') // Single tile for PrintStatusAilment
    .replaceAll('<zu>', 'ず') // Single tile for Pokedex_DrawMainScreenBG
  );
}

// GBA Braille
const brailleJapanese = '　アッイワナ⠆ニ⠈ウオエヤヌノネ⠐ラーリヲタ⠖チ⠘ルロレヨツトテ⠠カ⠢キ⠤ハ⠦ヒ⠨クコケユフホヘ⠰サ⠲シンマ⠶ミ⠸スソセ⠼ムモメ';
const brailleWestern = ' A,B.K⠆L⠈CIF⠌MSP,E⠒H⠔O⠖R⠘DJGÄNTQ⠠⠡⠢⠣-U⠦V⠨⠩Ö⠫⠬X⠮⠯⠰⠱.Ü⠴Z⠶⠷⠸⠹W⠻⠼Y⠾⠿';

export function remapGBABrailleJapanese(s: string) {
  return (s.replaceAll(/[\u2800-\u283F]/g, (c: string) => brailleJapanese[c.charCodeAt(0) - 0x2800])
    .replaceAll(/([\u2808\u2810\u2818\u2820\u2828])(.)/g, (_, prefix: string, base: string) => {
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
    s = s.replaceAll(/\u283F([\u2802\u2804])/g, '$1');
  return s.replaceAll(/[\u2800-\u283F]/g, (c: string) => brailleWestern[c.charCodeAt(0) - 0x2800]);
}

function remapGBABraille(s: string, language: LanguageKey) {
  s = s.replaceAll(/(\[BRAILLE_FORMAT(?: \d+){6}\])/g, ''); // Strip RSE braille format
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

// Dream Radar special characters
function remapDreamRadarSpecialCharacters(s: string) {
  return (s
    // Pokémon private use
    .replaceAll('[VAR 0004]', '\\c')

    // System
    .replaceAll('[VAR 0200]', '✜') // Wii Remote Control Pad
    .replaceAll('[VAR 0201]', 'Ⓐ') // Wii Remote A Button
    .replaceAll('[VAR 0202]', 'Ⓑ') // Wii Remote B Button
    .replaceAll('[VAR 0203]', '🏠︎') // Home Button
    .replaceAll('[VAR 0204]', '⊕') // Wii Remote + Button
    .replaceAll('[VAR 0205]', '⊖') // Wii Remote - Button
    .replaceAll('[VAR 0206]', '①') // Wii Remote 1 Button
    .replaceAll('[VAR 0207]', '②') // Wii Remote 2 Button
    // [VAR 0208]: Play Coin icon handled in postprocess
  );
}

// 3DS special characters
function remap3DSSpecialCharacters(s: string) {
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
      .replaceAll('\uE0A7', '⒆') // PK
      .replaceAll('\uE0A8', '⒇') // MN

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
  return s.search(/[\uE104\uE300-\uE31C]/u) === -1 ? s : (s
    // BDSP
    .replaceAll('\uE100', '🡄') // LeftDirection
    .replaceAll('\uE101', '🡅') // UpDirection
    .replaceAll('\uE102', '🡆') // RightDirection
    .replaceAll('\uE103', '🡇') // DownDirection
    .replaceAll('\uE104', '✨︎') // Sparkles

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
  );
}

const escapedZA: ReadonlyMap<string, string> = new Map([
  ['Text_icon1', '\uE340'],
  ['Text_infinity', '\uE341'],
]);

// Legends: Z-A special characters
function remapLegendsZASpecialCharacters(s: string, language: LanguageKey) {
  // Escaped using VAR BD0A
  if (s.search(/VAR BD0A/u) !== -1) {
    for (const [name, c] of escapedZA.entries()) {
      const len = name.length.toString(16).padStart(4, '0').toUpperCase();
      s = s.replaceAll(new RegExp( `\\[VAR BD0A\\(${len}\\)\\]${name}`, 'gu'), c);
    };
  }

  s = s.search(/[\uE340-\uE34E]/u) === -1 ? s : (s
    // U+E31D-E33F: buttons are handled in postprocess
    .replaceAll('\uE340', '▾') // Bottom-right down-pointing triangle
    .replaceAll('\uE341', '∞') // Infinity (about 1.5× wider, always used in CHT)
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
    .replaceAll('\uE34D', '個') // CHT gè (counter)
    .replaceAll('\uE34E', '个') // CHS gè (counter)
  );

  // Star rank (EFIGS digits clipping a star)
  const isFullwidth = language === 'ja' || language === 'zh-Hans' || language === 'zh-Hant';
  const isAfter = isFullwidth || language === 'ko';
  s = s.replaceAll(/[\uE401-\uE405]/g, (c) => {
    const n = c.charCodeAt(0) - 0xE400;
    return isAfter ? `★${isFullwidth ? String.fromCodePoint(0xFF10 + n) : n}` : `${n}★`;
  });
  return s;
}

// Pixel font used to display level in battle
function remapChinaLGPEPixelFont(s: string) {
  return (s
    .replaceAll(/\b(ab|ef|ij)\b/g, '等级')
    .replaceAll(/\b(cd|gh|kl)\b/g, '战力')
  );
}

// Champions special characters
function remapChampionsSpecialCharacters(s: string) {
  s = s.search(/\[Character[12]:/u) === -1 ? s : (s
    .replaceAll('[Character1:heart ]', '♥')
    .replaceAll('[Character1:music ]', '♪')
    .replaceAll('[Character1:male ]', '♂')
    .replaceAll('[Character1:female ]', '♀')
    .replaceAll('[Character1:PokeDollar ]', '$') // U+E300

    .replaceAll('[Character2:L_SingleQuot. ]', '‘')
    .replaceAll('[Character2:R_SingleQuot. ]', '’')
    .replaceAll('[Character2:L_DoubleQuot. ]', '“')
    .replaceAll('[Character2:R_DoubleQuot. ]', '”')
    .replaceAll('[Character2:DE_L_DoubleQuot. ]', '„')
    .replaceAll('[Character2:DE_R_DoubleQuot. ]', '⹂') // '“' in BDSP
    .replaceAll('[Character2:StraightSingleQuot. ]', "'")
    .replaceAll('[Character2:StraightDoubleQuot. ]', '"')
    .replaceAll('[Character2:HalfSpace ]', ' ')
    .replaceAll('[Character2:QuarterSpace ]', '\u202F')
    .replaceAll('[Character2:Upper_er ]', 'ᵉʳ')
    .replaceAll('[Character2:Upper_re ]', 'ʳᵉ')
    .replaceAll('[Character2:Upper_r ]', 'ʳ')
    .replaceAll('[Character2:Upper_e ]', 'ᵉ')
    .replaceAll('[Character2:Upper_a ]', 'ª')
    .replaceAll('[Character2:Abbrev. ]', '…')
    .replaceAll('[Character2:Center_dot ]', '･')
    // [Character2:PKMN ] is unimplemented
    .replaceAll('[Character2:null ]', '')
    .replaceAll('[Character2:ModifierLetterCapitalO ]', 'ᴼ')
    .replaceAll('[Character2:SixPerEmSpace ]', '\u2006')
  );
  return s;
}
//#endregion

/**
 * Converts private use characters to the corresponding Unicode characters,
 * and adds additional searchable metadata.
 *
 * Returns the resulting string.
 */
export function preprocessString(s: string, collectionKey: CollectionKey, language: LanguageKey) {
  const { isGB, isGen3, isNDS, is3DS, isSwitch, isN64, isGCN, isPBR, isRanch, isDreamRadar, isGO, isMasters } = getCorpusGroups(collectionKey);

  if (isGB) {
    s = remapGBSpecialCharacters(s);
  }
  else if (isGen3) {
    s = remapGBASpecialCharacters(s, language);
  }
  else if (isNDS) {
    s = remapNDSSpecialCharacters(s);
  }
  else if (is3DS) {
    s = remap3DSSpecialCharacters(s);
    s = remap3DSVariables(s);
  }
  else if (isSwitch) {
    s = remapSwitchSpecialCharacters(s);
    if (collectionKey === "LetsGoPikachuLetsGoEevee" && language === 'zh-Hans-CN') {
      s = remapChinaLGPEPixelFont(s);
    }
    else if (collectionKey === "LegendsZA") {
      s = remapLegendsZASpecialCharacters(s, language);
    }
    else if (collectionKey === "Champions") {
      s = remapChampionsSpecialCharacters(s);
    }
  }
  else if (isN64) {
    s = remapN64SpecialCharacters(s);
  }
  else if (isGCN) {
    s = remapGCNSpecialCharacters(s);
  }
  else if (isPBR || isRanch) {
    s = remapWiiSpecialCharacters(s);
  }
  else if (isDreamRadar) {
    s = remapDreamRadarSpecialCharacters(s);
  }
  else if (isGO) {
    s = preprocessStringGO(s, language);
  }
  else if (isMasters) {
    s = preprocessStringMasters(s);
  }

  return s;
}

/**
 * Converts escaped whitespace characters to literal whitespace characters, so that they are matched by `\s` when using a regex search.
 *
 * Returns the resulting string.
 */
export function convertWhitespace(s: string) {
  return (s
    // Escape existing literal whitespace
    .replaceAll('\n', '\\x0A')
    .replaceAll('\f', '\\x0C')
    .replaceAll('\r', '\\x0D')

    .replaceAll('\\\\', '\u{F0100}')
    .replaceAll('\\n', '\n')
    .replaceAll('\\r', '\r')
    .replaceAll('\\c', '\f')
    .replaceAll('\u{F0100}', '\\\\')
  );
}
