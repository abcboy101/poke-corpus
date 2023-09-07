import chineseChars from './chineseChars.json';

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

// NDS special characters
function remapNDSSpecialCharacters(s: string) {
  return s.search(/[\u2460-\u2487]/u) === -1 ? s : (s
    .replaceAll('\u2469', 'ᵉʳ') // Gen 5 superscript er
    .replaceAll('\u246A', 'ʳᵉ') // Gen 5 superscript re
    .replaceAll('\u246B', 'ʳ') // Gen 5 superscript r
    .replaceAll('\u2485', 'ᵉ') // Gen 5 superscript e
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

/**
 * Converts private use characters to the corresponding Unicode characters,
 * and adds additional searchable metadata.
 *
 * Returns the resulting string.
 */
function preprocessString(s: string) {
  return preprocessMetadata(remapSwitchSpecialCharacters(remap3DSSpecialCharacters(remapNDSSpecialCharacters(s
    // GCN
    .replaceAll('[..]', '‥')
    .replaceAll('[゛]', '゛')
    .replaceAll('[゜]', '゜')
    .replaceAll('[^er]', 'ᵉʳ')
  ))));
}

/**
 * Converts escaped whitespace characters to literal whitespace characters, so that they are matched by `\s` when using a regex search.
 *
 * Returns the resulting string.
 */
function convertWhitespace(s: string) {
  return (s
    .replaceAll('\\n', '\n')
    .replaceAll('\\r', '\r')
    .replaceAll('\\c', '\f')
  );
}

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
 * Converts the provided string to HTML by escaping `<` and `>`,
 * replacing line break control characters such as  `\n` with `<br>`,
 * and converting the ruby syntax `{base|ruby}` to the corresponding HTML tags.
 *
 * Returns the resulting HTML string.
 */
function postprocessString(s: string) {
  return multiLine(postprocessMetadata(s)
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;')

    // BDSP
    .replaceAll(/&lt;color=(.*?)&gt;(.*?)&lt;\/color&gt;/gu, '<span style="color: $1">$2</span>')
    .replaceAll(/&lt;size=(.*?)&gt;(.*?)&lt;\/size&gt;/gu, '<span style="font-size: $1">$2</span>')
    .replaceAll(/((?<=^|\\r|\\c|\\n).*?)&lt;pos=(.*?)&gt;(.*?(?:\\r|\\c|\\n|$)+)/gu, '<span style="tab-size: $2">$1\t$3</span>')
    .replaceAll(/((?<=^|\\r|\\c|\\n).*?)&lt;line-indent=(.*?)&gt;(.*?(?:\\r|\\c|\\n|$)+)/gu, '<span style="tab-size: $2">$1\t$3</span>')

    .replaceAll('\u2486', '<sup>P</sup><sub>K</sub>') // Gen 5 PK
    .replaceAll('\u2487', '<sup>M</sup><sub>N</sub>') // Gen 5 MN
    .replaceAll('\uE0A7', '<sup>P</sup><sub>K</sub>') // 3DS PK
    .replaceAll('\uE0A8', '<sup>M</sup><sub>N</sub>') // 3DS MN
    .replaceAll(/\[VAR FF01\(FF43\)\]\[VAR FF01\(30B3\)\]/gu, '') // Gen 4 font size
    .replaceAll(/\[VAR FF01\(FF43\)\](.+?)(?:\[VAR FF01\(30B3\)\]|\\r|\\c|\\n|$)/gu, '<span class="line-font-size-200"><span class="text-font-size-200">$1</span></span>')
    .replaceAll('[VAR FF01(30B3)]', '')
    .replaceAll(/\[VAR 0205\](.*?(?:\\r|\\c|\\n|$)+)/gu, '<span class="line-align-center">$1</span>') // HGSS
    .replaceAll(/\[VAR 0206\](.*?(?:\\r|\\c|\\n|$)+)/gu, '<span class="line-align-right">$1</span>') // HGSS

    // Line breaks
    .replaceAll('[VAR 0207]\\n', '<span class="c">&#91;VAR 0207&#93;</span><span class="n">&#92;n</span><br>')
    .replaceAll('[VAR 0208]\\n', '<span class="r">&#91;VAR 0208&#93;</span><span class="n">&#92;n</span><br>')
    .replaceAll('\\r\\n', '<span class="r">&#92;r</span><span class="n">&#92;n</span><br>')
    .replaceAll('\\c\\n', '<span class="c">&#92;c</span><span class="n">&#92;n</span><br>')
    .replaceAll('[VAR 0207]', '<span class="c">[VAR 0207]</span>')
    .replaceAll('[VAR 0208]', '<span class="r">[VAR 0208]</span>')
    .replaceAll('\\r', '<span class="r">&#92;r</span><br>')
    .replaceAll('\\c', '<span class="c">&#92;c</span><br>')
    .replaceAll('\\n', '<span class="n">&#92;n</span><br>')
    .replaceAll('\t', '<span class="tab">\t</span>')

    // GCN
    .replaceAll(/\[unknown5_08_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})\](.*?)(?:\[unknown5_08_ff_ff_ff_ff\]|$|(?=\u{F1000}))/gu, '<span style="color: #$1$2$3$4">$5</span>')
    .replaceAll('[Player]', '<span class="var">[Player]</span>')
    .replaceAll('[Player_alt]', '<span class="var">[Player_alt]</span>')
    .replaceAll('[Rui]', '<span class="var">[Rui]</span>')
    .replaceAll('[opp_trainer_class]', '<span class="var">[opp_trainer_class]</span>')
    .replaceAll('[opp_trainer_name]', '<span class="var">[opp_trainer_name]</span>')
    .replaceAll('[sent_out_pokemon_1]', '<span class="var">[sent_out_pokemon_1]</span>')
    .replaceAll('[sent_out_pokemon_2]', '<span class="var">[sent_out_pokemon_2[]]</span>')
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

    .replaceAll('[NULL]', '<span class="null">[NULL]</span>')
    .replaceAll('[COMP]', '<span class="compressed">[COMP]</span>')
    .replaceAll(/(\[VAR [^\]]+?\])/gu, '<span class="var">$1</span>')
    .replaceAll(/(\[WAIT [\d.]+\])/gu, '<span class="wait">$1</span>')
    .replaceAll(/(\[SFX [\d.]+\])/gu, '<span class="sfx">$1</span>') // BDSP
    .replaceAll(/(\[~ \d+\])/gu, '<span class="unused">$1</span>')
    .replaceAll(/\{([^|}]+)\|([^|}]+)\}/gu, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>') // Switch furigana
    .replaceAll(/(^\s+|\s+$)/gu, '<span class="whitespace">$1</span>')

    // Escaped characters
    .replaceAll('\\\\', '\\')
    .replaceAll('\\[', '[')
  );
}

export { preprocessString, convertWhitespace, postprocessString };
