import { postprocessSpeaker } from '../speaker';
import { grammarBranch, versionBranch, genderBranch, numberBranch, genderNumberBranch } from './branches';
import { postprocessStringGO } from './cleanStringGO';
import { postprocessStringMasters } from './cleanStringMasters';
import * as g3 from './expandVariablesG3';
import { particlesKO, grammarEN, grammarFR, grammarIT, grammarDE, grammarES, remapBDSPGrammarIndex } from './grammar';

//#region Post-processing
/**
 * Strips additional metadata from each string:
 * - Converted ruby text marked with `U+F0000` and `U+F0001`
 *
 * Returns the resulting string.
 */
export function postprocessMetadata(s: string) {
  return s.split('\u{F0000}')[0];
}

function multiLine(s: string) {
  if (s.search(/[\u{F1000}\u{F1001}]/u) === -1) {
    return s;
  }
  return ['<dl>', ...s.split('\u{F1000}').map((line) => line.split('\u{F1001}')).map(([location, str]) => `<dt>${location}</dt><dd>${str}</dd>`), '</dl>'].join('');
}

const grammarBranchFromIndex = (index: number, grammar: readonly string[][]) => grammarBranch(...grammar[index]);
const particleBranchFromIndex = (index: number) => grammarBranch(...particlesKO[index]);
const versionBranchRS = (form1: string, form2: string) => versionBranch(form1, form2, 'ruby', 'sapphire');
const versionBranchSV = (form1: string, form2: string) => versionBranch(form1, form2, 'scarlet', 'violet');

/* Text color */
const dec2Hex = (n: string) => Number(n).toString(16).padStart(2, '0').toUpperCase();
const textColorHex = (_: string, r: string, g: string, b: string, a: string, text: string) => textColor(_, `#${r}${g}${b}${a === 'FF' ? '' : a}`, text);
export const textColor = (_: string, value: string, text: string) => `<span class="color" style="color: ${value}">${text}</span>`;

const textColorOpenDec = (_: string, r: string, g: string, b: string, a: string) => `<span class="color" style="color: #${dec2Hex(r)}${dec2Hex(g)}${dec2Hex(b)}${a === '255' ? '' : dec2Hex(a)}">`;
const textGradientOpenDec = (_: string, r1: string, g1: string, b1: string, a1: string, r2: string, g2: string, b2: string, a2: string) =>
  `<span class="color gradient" style="--top: #${dec2Hex(r1)}${dec2Hex(g1)}${dec2Hex(b1)}${a1 === '255' ? '' : dec2Hex(a1)}; --bottom: #${dec2Hex(r2)}${dec2Hex(g2)}${dec2Hex(b2)}${a2 === '255' ? '' : dec2Hex(a2)}">`;

//#endregion

/**
 * Converts the provided string to HTML by escaping `<` and `>`,
 * replacing line break control characters such as `\n` with `<br>`,
 * and converting the ruby syntax `{base|ruby}` to the corresponding HTML tags.
 *
 * Returns the resulting HTML string.
 */
export function postprocessString(s: string, collectionKey: string, language: string = '', richText: boolean = true) {
  const isGen3 = ["RubySapphire", "FireRedLeafGreen", "Emerald"].includes(collectionKey);
  const isGen4 = ["DiamondPearl", "Platinum", "HeartGoldSoulSilver"].includes(collectionKey);
  const isGen5 = ["BlackWhite", "Black2White2"].includes(collectionKey);
  const isBDSP = collectionKey === "BrilliantDiamondShiningPearl";
  const isPBR = collectionKey === "BattleRevolution";
  const isRanch = collectionKey === "Ranch";
  const isGO = collectionKey === "GO";
  const isMasters = collectionKey === "Masters";
  const isHOME = collectionKey === "HOME";

  const isNDS = isGen4 || isGen5;
  const is3DS = ["XY", "OmegaRubyAlphaSapphire", "SunMoon", "UltraSunUltraMoon", "Bank"].includes(collectionKey);
  const isSwitch = ["LetsGoPikachuLetsGoEevee", "SwordShield", "BrilliantDiamondShiningPearl", "LegendsArceus", "ScarletViolet", "HOME"].includes(collectionKey);
  const isN64 = ["Stadium", "Stadium2"].includes(collectionKey);
  const isGCN = ["Colosseum", "XD"].includes(collectionKey);
  const isModern = isGen5 || is3DS || isSwitch;

  s = postprocessMetadata(s ?? '');
  if (!richText) {
    s = (s
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
    );
    return multiLine(s);
  }

  // Replace literal special characters with a placeholder so they don't match other rules
  s = (s
    .replaceAll('\\\\', '\u{F0100}')
    .replaceAll('\\[', '\u{F0102}')
    .replaceAll('\\{', '\u{F0104}')
    .replaceAll('<', '\u{F0106}')
    .replaceAll('>', '\u{F0107}')
  );

  //#region Whitespace
  s = (s
    .replaceAll('\\n', '\u{F0200}')
    .replaceAll('\\r', '\u{F0201}')
    .replaceAll('\\c', '\u{F0202}')
    .replaceAll('\t', '\u{F0203}')
  );
  s = isGen4 ? (s
    .replaceAll('[VAR 0207]', '\u{F0207}')
    .replaceAll('[VAR 0208]', '\u{F0208}')
  ) : s;
  s = isGen3 ? (s
    .replaceAll('\\e', '\u{F02FF}')
  ) : s;
  s = isN64 ? (s
    .replaceAll('\u{F0100}n', '\u{F0200}') // Game Boy Tower
  ) : s;
  //#endregion

  //#region Literals
  s = (isN64 || isGen3 || isNDS) ? (s
    .replaceAll('⒆', '<sup>P</sup><sub>K</sub>') // Gen 5 PK [also used privately for Gen 4 and earlier]
    .replaceAll('⒇', '<sup>M</sup><sub>N</sub>') // Gen 5 MN [also used privately for Gen 4 and earlier]
  ) : s;
  s = is3DS ? (s
    .replaceAll('\uE0A7', '<sup>P</sup><sub>K</sub>') // 3DS PK (unused)
    .replaceAll('\uE0A8', '<sup>M</sup><sub>N</sub>') // 3DS MN (unused)
  ) : s;
  s = isGen3 ? (s
    // POKé, POKéBLOCK
    .replaceAll('[POKE]', '<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>')
    .replaceAll('[POKEBLOCK]', `<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>\u{F1102}${g3.expandBlock(language)}\u{F1103}`)
    .replaceAll('[BLOCK]', `\u{F1102}${g3.expandBlock(language)}\u{F1103}`)
    .replaceAll('[POKEMELLA]', '\u{F1102}<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>MELLA\u{F1103}')
    .replaceAll('[MELLA]', '\u{F1102}MELLA\u{F1103}')
    .replaceAll('[POKEMELLE]', '\u{F1102}<sup>P</sup><sub>O</sub><sup>K</sup><sub>é</sub>MELLE\u{F1103}')
    .replaceAll('[MELLE]', '\u{F1102}MELLE\u{F1103}')

    // Pco (French BP)
    .replaceAll('[Pco]', `\u{F1102}${g3.expandPco()}\u{F1103}`)

    // Gender unknown symbol (blank space with the same width as ♂/♀)
    // Also used as a figure space when printing numeric variables
    .replaceAll('[UNK_SPACER]', '\u2007')

    // Special characters (Lv, PP, ID, No)
    .replaceAll('[LV]', `\u{F1102}<span class="literal-small">${g3.expandLv(language)}</span>\u{F1103}`)
    .replaceAll('[LV_2]', `\u{F1102}<span class="literal-small">${g3.expandLv2(language)}</span>\u{F1103}`)
    .replaceAll('[LV_3]', `\u{F1102}<span class="literal-small">${g3.expandLv3(language)}</span>\u{F1103}`)
    .replaceAll('[PP]', `\u{F1102}<span class="literal-small">${g3.expandPP(language)}</span>\u{F1103}`)
    .replaceAll('[ID]', `\u{F1102}<span class="literal-small">${g3.expandID()}</span>\u{F1103}`)
    .replaceAll('[NO]', `\u{F1102}<span class="literal-small">${g3.expandNo(language)}</span>\u{F1103}`)
  ) : s;
  //#endregion

  //#region Formatting
  s = isBDSP ? (s
    .replaceAll(/\u{F0106}color=(.*?)\u{F0107}(.*?)\u{F0106}\/color\u{F0107}/gu, textColor) // BDSP color
    .replaceAll('\u{F0106}/color\u{F0107}', '') // BDSP color (extra closing tag)
    .replaceAll(/\u{F0106}size=(.*?)\u{F0107}(.*?)\u{F0106}\/size\u{F0107}/gu, '<span style="font-size: $1">$2</span>') // BDSP size
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\u{F0106}pos=(.*?)\u{F0107}(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span style="tab-size: $2">$1\t$3</span>') // BDSP pos
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\u{F0106}line-indent=(.*?)\u{F0107}(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span style="tab-size: $2">$1\t$3</span>') // BDSP line-indent
  ) : s;
  s = (isGen4 || isModern) ? (s
    .replaceAll(/\[VAR FF00\((?!0000)([0-9A-F]{4})\)\](.+?)(?=\[VAR FF00\([0-9A-F]{4}\)\]|$)/gu, (_, color, text) => `<span class="color" style="color: var(--color-${parseInt(color, 16)})">${text}</span>`) // font color
    .replaceAll(/\[VAR FF00\(0000\)\]/gu, '') // font color (reset)
  ) : s;
  s = (isGen5 || is3DS) ? (s
    .replaceAll(/\[VAR BD00\(([0-9A-F]{4}),([0-9A-F]{4}),([0-9A-F]{4})\)\](.+?)(?:\[VAR BD00\(0001,0002,0000\)\]|\[VAR BD01\]|$)/gu, (_, color1, color2, color3, text) => `<span class="color" style="color: var(--color-${parseInt(color1, 16)}-${parseInt(color2, 16)}-${parseInt(color3, 16)})">${text}</span>`) // font color
    .replaceAll('[VAR BD01]', '') // font color (reset)
  ) : s;
  s = isGen4 ? (s
    .replaceAll(/\[VAR FF01\(00C8\)\]\[VAR FF01\(0064\)\]/gu, '') // Gen 4 font size (empty string at 200%)
    .replaceAll(/\[VAR FF01\(00C8\)\](.+?)(?:\[VAR FF01\(0064\)\]|[\u{F0201}\u{F0202}\u{F0200}]|$)/gu, '<span class="line-font-size-200"><span class="text-font-size-200">$1</span></span>') // Gen 4 font size (text at 200%)
    .replaceAll('[VAR FF01(0064)]', '') // Gen 4 font size (set to 100%)

    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\[VAR 0203\(([0-9A-F]{4})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before, size, after) => `<span style="tab-size: ${parseInt(size, 16)}pt">${before}\t${after}</span>`) // Gen 4 X coords
    .replaceAll(/\[VAR 0203\(([0-9A-F]{4})\)\]/gu, '\t') // can't really have multiple tab sizes, so approximate the rest as tabs
    .replaceAll(/\[VAR 0204\(([0-9A-F]{4})\)\]/gu, (_, pad) => `<div style="height: ${parseInt(pad, 16)}pt"></div>`) // Gen 4 Y coords
    .replaceAll(/\[VAR 0205\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span class="line-align-center">$1</span>') // HGSS
    .replaceAll(/\[VAR 0206\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span class="line-align-right">$1</span>') // HGSS
  ) : s;
  s = isModern ? (s
    .replaceAll(/\[VAR BD02\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, '<span class="line-align-center">$1</span>') // Gen 5+
    .replaceAll(/\[VAR BD03\(([0-9A-F]{4})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, pad, text) => `<span class="line-align-right" style="padding-right: ${parseInt(pad, 16)}pt">${text}</span>`) // Gen 5+
    .replaceAll(/\[VAR BD04\(([0-9A-F]{4})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, pad, text) => `<span class="line-align-left" style="padding-left: ${parseInt(pad, 16)}pt">${text}</span>`) // Gen 5+
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)\[VAR BD05\(([0-9A-F]{4})\)\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before, size, after) => `<span style="tab-size: ${parseInt(size, 16)}pt">${before}\t${after}</span>`) // Gen 5 X coords
    .replaceAll(/\[VAR BD05\(([0-9A-F]{4})\)\]/gu, '\t') // can't really have multiple tab sizes, so approximate the rest as tabs
  ) : s;
  s = isPBR ? (s
    .replaceAll(/\[ALIGN 1\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, '<span class="line-align-left">$1</span>') // PBR
    .replaceAll(/\[ALIGN 2\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, '<span class="line-align-center">$1</span>') // PBR
    .replaceAll(/\[ALIGN 3\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, '<span class="line-align-right">$1</span>') // PBR
  ) : s;
  s = isHOME ? (s
    .replaceAll(/\u{F0106}(\/?[bu]) *\u{F0107}/giu, '<$1>') // HOME mobile b, u
  ) : s;
  //#endregion

  //#region Line breaks
  // Soft line breaks
  switch (collectionKey) {
    case "SunMoon":
    case "UltraSunUltraMoon":
      // In SMUSUM, it affects the next \n (as long as \r or \c does not occur prior to the line break), but it must be at the start of the string and only affects two-line strings.
      s = s.replaceAll(/^\[VAR BD06\([0-9A-F]{4}\)\]([^\u{F0201}\u{F0202}\u{F0200}]*?)\u{F0200}(?=[^\u{F0201}\u{F0202}\u{F0200}]*?[\u{F0201}\u{F0202}]?$)/gu, (_, line) => `${line}\u{F0200}\u{F1300}`);
      break;
    case "LetsGoPikachuLetsGoEevee":
    case "SwordShield":
      // In LGPE and SwSh, it affects the next \n (as long as \r or \c does not occur prior to the line break), and it can now be anywhere in the string and affect the following two lines.
      s = s.replaceAll(/\[VAR BD06\([0-9A-F]{4}\)\]([^\u{F0201}\u{F0202}\u{F0200}]*?)\u{F0200}/gu, (_, line) => `${line}\u{F0200}\u{F1300}`);
      break;
    default:
      // Starting in LA, it affects all subsequent \n and \r\n (but not \c\n).
      s = s.replaceAll(/\[VAR BD06\([0-9A-F]{4}\)\](.*)$/gu, (_, text) => text.replaceAll(/(?<!\u{F0202})\u{F0200}/gu, '\u{F0200}\u{F1300}'));
  }
  s = isGen4 ? (s
    .replaceAll('\u{F0207}\u{F0200}', '<span class="c">[VAR 0207]</span><span class="n">\\n</span><br>') // [VAR 0207]\n
    .replaceAll('\u{F0208}\u{F0200}', '<span class="r">[VAR 0208]</span><span class="n">\\n</span><br>') // [VAR 0208]\n
  ) : s;
  s = (s
    .replaceAll('\u{F0201}\u{F0200}', '<span class="r">\\r</span><span class="n">\\n</span><br>') // \r\n
    .replaceAll('\u{F0202}\u{F0200}', '<span class="c">\\c</span><span class="n">\\n</span><br>') // \c\n
    .replaceAll('\u{F0200}\u{F0202}', '<span class="n">\\n</span><span class="c">\\c</span><br>') // \n\c (Ranch)
  );
  s = isGen4 ? (s
    .replaceAll('\u{F0207}', '<span class="c">[VAR 0207]</span><br>') // [VAR 0207]
    .replaceAll('\u{F0208}', '<span class="r">[VAR 0208]</span><br>') // [VAR 0208]
  ) : s;
  s = (s
    .replaceAll('\u{F0201}', '<span class="r">\\r</span><br>') // \r
    .replaceAll('\u{F0202}', '<span class="c">\\c</span><br>') // \c
    .replaceAll('\u{F0200}', '<span class="n">\\n</span><br>') // \n

    .replaceAll('\u{F02FF}', '<span class="e">\\e</span>') // \e
    .replaceAll('\u{F0203}', '<span class="tab">\t</span>')
  );
  const space = ['ja', 'ko', 'zh'].some((lang) => language.startsWith(lang)) ? '\u3000' : ' ';
  s = s.replaceAll('<br>\u{F1300}', `<wbr class="soft"><span class="soft">${space}</span>`); // soft line break
  //#endregion

  //#region Spin-off
  // N64
  if (isN64) {
    s = (s
      // Variables
      .replaceAll('#71', '<span class="color color-animation">')
      .replaceAll(/(#\d{2})/gu, '<span class="var">$1</span>')

      // Color
      .replaceAll(/\u{F0106}COL1,PUSH,(\d+),(\d+),(\d+),(\d+)\u{F0107}\u{F0106}COL2,PUSH,(\d+),(\d+),(\d+),(\d+)\u{F0107}/gu, textGradientOpenDec)
      .replaceAll(/\u{F0106}COL1,LOAD,(\d+),(\d+),(\d+),(\d+)\u{F0107}/gu, textColorOpenDec)
      .replaceAll(/\u{F0106}COL1,PUSH,(\d+),(\d+),(\d+),(\d+)\u{F0107}/gu, textColorOpenDec)
      .replaceAll(/\u{F0106}COL1,POP\u{F0107}\u{F0106}COL2,POP\u{F0107}/gu, '</span>')
      .replaceAll(/\u{F0106}COL1,POP\u{F0107}/gu, '</span>')

      // Spacing
      .replaceAll(/\u{F0106}DIST,([\d.]+)\u{F0107}/gu, '<span class="spacing-$1">')

      .replaceAll(/(\u{F0106}[0-9A-Z, ]+\u{F0107})/gu, '<span class="var">$1</span>')
      .replaceAll(/%%/gu, '<span class="literal">%</span>') // printf

      // Game Boy Tower
      .replaceAll(/(\u{F0100}(?:CU|CR|B|R))/gu, '<span class="var">$1</span>')
    );
    const spanOpen = s.match(/<span\b/gu)?.length ?? 0;
    const spanClose = s.match(/<\/span>/gu)?.length ?? 0;
    if (spanClose < spanOpen)
      s = s.concat('</span>'.repeat(spanOpen - spanClose)); // LOAD, or extra PUSH
    else if (spanOpen < spanClose)
      s = '<span>'.repeat(spanClose - spanOpen).concat(s); // extra POP
  }

  // GCN
  s = isGCN ? (s
    .replaceAll(/\[unknown5_08_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})\](.*?)(?:\[unknown5_08_ff_ff_ff_ff\]|$|(?=\u{F1000}))/gu, textColorHex)
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
    .replaceAll('[dialogue_end]', '<span class="func">[dialogue_end]</span>')
    .replaceAll('[large_e]', '<span class="var">[large_e]</span>')
    .replaceAll('[large_e+]', '<span class="var">[large_e+]</span>')
    .replaceAll('[furi_kanji]', '<span class="var">[furi_kanji]</span>')
    .replaceAll('[furi_kana]', '<span class="var">[furi_kana]</span>')
    .replaceAll('[furi_close]', '<span class="var">[furi_close]</span>')
    .replaceAll(/(\[some_[^\]]+?\])/gu, '<span class="var">$1</span>')
    .replaceAll(/(\[unknown[^\]]+?\])/gu, '<span class="var">$1</span>')
    .replaceAll(/(\[var_[^\]]\])/gu, '<span class="var">$1</span>')
    .replaceAll('\u{F0106}SCOL=0x0d0e0f\u{F0107}', '<span class="func">\u{F0106}SCOL=0x0d0e0f\u{F0107}</span>')
  ) : s;

  // PBR
  s = isPBR ? (s
    .replaceAll(/\[COLOR (\d+)\](.*?)(?:\[COLOR \d+\]|[\u{F0201}\u{F0202}\u{F0200}]|$)/gu, '<span class="color" style="color: var(--color-$1)">$2</span>')
    .replaceAll(/(\[VERTOFFSET -?[\d.]+\])/gu, '<span class="vertoffset">$1</span>') // '<span style="position: relative; top: $1px">$2</span>'
    .replaceAll(/\[FONT ([0126])\](.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[FONT \d+\]|$)/gu, '<span class="font-pbr-$1">$2</span>')
    .replaceAll(/(\[FONT [\d.]+\])/gu, '<span class="func">$1</span>')
    .replaceAll(/\[SPACING (-?[\d.]+)\](.*?$)/gu, '<span class="spacing-$1">$2</span>')
  ) : s;

  // Ranch
  s = isRanch ? (s
    .replaceAll(/(%((\d+\$)?(\d*d|\d*\.\d+[fs]m?|ls)|(\(\d+\)%|\d+\$)?\{\}|\(\d+\)))/gu, '<span class="var">$1</span>')
    .replaceAll(/(\$\d+\$)/gu, '<span class="var">$1</span>')
  ) : s;

  // GO
  s = isGO ? postprocessStringGO(s) : s;

  // Masters
  s = isMasters ? postprocessStringMasters(s) : s;
  //#endregion

  //#region Grammar
  s = isModern ? (!isBDSP ? (s
    .replaceAll(/\[VAR 13(0[0-3])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(parseInt(index, 16), grammarEN)) // English
    .replaceAll(/\[VAR 14(0[0-9A-B])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(parseInt(index, 16), grammarFR)) // French
    .replaceAll(/\[VAR 15(0[0-9A-F])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(parseInt(index, 16), grammarIT)) // Italian
    .replaceAll(/\[VAR 16(0[0-7])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(parseInt(index, 16), grammarDE)) // German
    .replaceAll(/\[VAR 17(0[0-9A-F])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(parseInt(index, 16), grammarES)) // Spanish
  ) : (s
    .replaceAll(/\[VAR 13(0[3-6])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(remapBDSPGrammarIndex(parseInt(index, 16)), grammarEN)) // English
    .replaceAll(/\[VAR 14(0[3-9A-CF]|10)[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(remapBDSPGrammarIndex(parseInt(index, 16)), grammarFR)) // French
    .replaceAll(/\[VAR 15(0[3-9A-CF]|1[0-5])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(remapBDSPGrammarIndex(parseInt(index, 16)), grammarIT)) // Italian
    .replaceAll(/\[VAR 16(0[3-9A])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(remapBDSPGrammarIndex(parseInt(index, 16)), grammarDE)) // German
    .replaceAll(/\[VAR 17(0[3-9A-E]|1[3-6])[^\]]*?\]/gu, (_, index) => grammarBranchFromIndex(remapBDSPGrammarIndex(parseInt(index, 16), true), grammarES)) // Spanish
  )) : s;

  // Korean particle
  if (language === 'ko' && isGen4)
    s = s.replaceAll(/\[VAR ((?:0[1346]|34)[0-9A-F]{2})\(([0-9A-F]{4}),([0-9A-F]{4})\)\]/gu, (_, tag, param, index) => `[VAR ${tag}(${param})]${particleBranchFromIndex(parseInt(index, 16) % 8)}`);
  else if (language === 'ko' && collectionKey === 'BlackWhite')
    s = s.replaceAll(/\[VAR (0[12][0-9A-F]{2})\(([0-9A-F]{4}),([0-9A-F]{4})\)\]/gu, (_, tag, param, index) => `[VAR ${tag}(${param})]${particleBranchFromIndex(parseInt(index, 16) % 8)}`);
  else if (collectionKey === 'Black2White2')
    s = s.replaceAll(/\[VAR 3400\(([0-9A-F]{4})\)\]/gu, (_, index) => particleBranchFromIndex(parseInt(index, 16) % 8));
  else if (isBDSP)
    s = s.replaceAll(/\[VAR 1900\(tagParameter=(\d+)\)\]/gu, (_, index) => particleBranchFromIndex(index));
  else if (isModern)
    s = s.replaceAll(/\[VAR 1900\(([0-9A-F]{4})\)\]/gu, (_, index) => particleBranchFromIndex(parseInt(index, 16)));
  //#endregion

  //#region Branches
  s = isGen3 ? (s
    .replaceAll(/\u{F1102}\u{F1200}(.*?)\u{F1104}(.*?)\u{F1103}/gu, (_, male, female) => genderBranch(male, female)) // FD 05, FD 06
    .replaceAll(/\u{F1102}\u{F1207}(.*?)\u{F1104}(.*?)\u{F1103}/gu, (_, form1, form2) => versionBranchRS(form1, form2)) // FD 07 - FD 0D
  ) : s;
  s = isModern ? (s
    .replaceAll(/\[VAR 1100\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenF, lenM, rest) => {
      const endM = parseInt(lenM, 16);
      const endF = endM + parseInt(lenF, 16);
      return `${genderBranch(rest.substring(0, endM), rest.substring(endM, endF))}${rest.substring(endF)}`;
    })
    .replaceAll(/\[VAR 1100\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),00([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenF, lenM, lenN, rest) => {
      const endM = parseInt(lenM, 16);
      const endF = endM + parseInt(lenF, 16);
      const endN = endF + parseInt(lenN, 16);
      return `${genderBranch(rest.substring(0, endM), rest.substring(endM, endF), rest.substring(endF, endN))}${rest.substring(endN)}`;
    })
    .replaceAll(/\[VAR 1101\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenP, lenS, rest) => {
      const endS = parseInt(lenS, 16);
      const endP = endS + parseInt(lenP, 16);
      return `${numberBranch(rest.substring(0, endS), rest.substring(endS, endP))}${rest.substring(endP)}`;
    })
    .replaceAll(/\[VAR 1102\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenFS, lenMS, lenFP, lenMP, rest) => {
      const endMS = parseInt(lenMS, 16);
      const endFS = endMS + parseInt(lenFS, 16);
      const endMP = endFS + parseInt(lenMP, 16);
      const endFP = endMP + parseInt(lenFP, 16);
      return `${genderNumberBranch(rest.substring(0, endMS), rest.substring(endMS, endFS), rest.substring(endFS, endMP), rest.substring(endMP, endFP))}${rest.substring(endFP)}`;
    })
    .replaceAll(/\[VAR (?:1104|1106)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, len2, len1, rest) => {
      const end1 = parseInt(len1, 16);
      const end2 = end1 + parseInt(len2, 16);
      return `${grammarBranch(rest.substring(0, end1), rest.substring(end1, end2))}${rest.substring(end2)}`;
    })
    .replaceAll(/\[VAR 1105\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),00([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, lenP, lenS, lenZ, rest) => {
      const endS = parseInt(lenS, 16);
      const endP = endS + parseInt(lenP, 16);
      const endZ = endP + parseInt(lenZ, 16);
      return `${numberBranch(rest.substring(0, endS), rest.substring(endS, endP), rest.substring(endP, endZ))}${rest.substring(endZ)}`;
    })
    .replaceAll(/\[VAR 1107\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\]([^[<{]*)/gu, (_, len2, len1, rest) => {
      const end1 = parseInt(len1, 16);
      const end2 = end1 + parseInt(len2, 16);
      return `${versionBranchSV(rest.substring(0, end1), rest.substring(end1, end2))}${rest.substring(end2)}`;
    })
  ) : s;
  s = isBDSP ? (s
    .replaceAll(/\[VAR (?:1[3-7A]00|1901)\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)(?:\|([^[<{]*?))?\)\]/gu, (_, male, female) => genderBranch(male, female ?? ''))
    .replaceAll(/\[VAR (?:1[3-7]01|1902)\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)(?:\|([^[<{]*?))?\)\]/gu, (_, singular, plural) => numberBranch(singular, plural ?? ''))
    .replaceAll(/\[VAR (?:1[3-7]02|1903)\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)\|([^[<{]*?)\|([^[<{]*?)\|([^[<{]*?)\)\]/gu, (_, maleSingular, femaleSingular, malePlural, femalePlural) => genderNumberBranch(maleSingular, femaleSingular, malePlural, femalePlural))
    .replaceAll(/\[VAR (?:130A|1413|1517|160E|1712|1904)\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)(?:\|([^[<{]*?))?(?:\|([^[<{]*?))?\)\]/gu, (_, singular, plural, zero) => numberBranch(singular, plural ?? '', zero ?? ''))
    .replaceAll(/\[VAR (?:1411|1518)\((?:tagParameter=\d+,)?tagWordArray=([^[<{]*?)(?:\|([^[<{]*?))?(?:,forceGrmID=\d+)?\)\]/gu, (_, form1, form2) => grammarBranch(form1, form2 ?? ''))
  ) : s;
  //#endregion

  //#region Variables
  s = isGen3 ? (s
    .replaceAll(/(\[DYNAMIC \d+\])/gu, '<span class="var">$1</span>') // F7 xx
    .replaceAll(/(\[(?:(?:[ABLR]|START|SELECT)_BUTTON|DPAD_(?:UP|DOWN|LEFT|RIGHT|UPDOWN|LEFTRIGHT|NONE))\])/gu, '<span class="var">$1</span>') // F8 xx
    .replaceAll(/(\[EMOJI_[^\]]+?\])/gu, '<span class="var">$1</span>') // F9 D0 - F9 FE

    .replaceAll('[NOP]', '<span class="var">[NOP]</span>') // FC 00 (no-op; in Western RS only, it's used to shorten city/town names in the Trainer's Eyes feature of the PokéNav, and as a placeholder for one-digit numbers in Contests)
    .replaceAll(/(\[COLOR [^\]]+?\])/gu, '<span class="func">$1</span>') // FC 01 xx
    .replaceAll('[COLOR]', '<span class="func">[COLOR]</span>') // FC 01
    .replaceAll(/(\[HIGHLIGHT [^\]]+?\])/gu, '<span class="func">$1</span>') // FC 02 xx
    .replaceAll(/(\[SHADOW [^\]]+?\])/gu, '<span class="func">$1</span>') // FC 03 xx
    .replaceAll(/(\[COLOR_HIGHLIGHT_SHADOW [^\]]+?\])/gu, '<span class="func">$1</span>') // FC 04 xx xx xx
    .replaceAll(/(\[PALETTE [^\]]+?\])/gu, '<span class="func">$1</span>') // FC 05 xx
    .replaceAll(/(\[(?:FONT [^\]]+?|FONT_[^\]]+?)\])/gu, '<span class="func">$1</span>') // FC 06 xx
    .replaceAll(/(\[PAUSE \d+\])/gu, '<span class="func">$1</span>') // FC 08 xx
    .replaceAll('[PAUSE_UNTIL_PRESS]', '<span class="func">[PAUSE_UNTIL_PRESS]</span>') // FC 09 xx
    .replaceAll('[WAIT_SE]', '<span class="func">[WAIT_SE]</span>') // FC 0A xx
    .replaceAll(/(\[PLAY_BGM [^\]]+?\])/gu, '<span class="func">$1</span>') // FC 0B xx
    .replaceAll(/(\[ESCAPE \d+\])/gu, '<span class="var">$1</span>') // FC 0C xx
    .replaceAll(/(\[PLAY_SE [^\]]+?\])/gu, '<span class="func">$1</span>') // FC 10 xx
    .replaceAll(/(\[CLEAR \d+\])/gu, '<span class="func">$1</span>') // FC 11 xx
    .replaceAll(/(\[CLEAR_TO \d+\])/gu, '<span class="func">$1</span>') // FC 13 xx
    .replaceAll(/(\[MIN_LETTER_SPACING \d+\])/gu, '<span class="func">$1</span>') // FC 14 xx
    .replaceAll('[PAUSE_MUSIC]', '<span class="func">[PAUSE_MUSIC]</span>') // FC 17 xx
    .replaceAll('[RESUME_MUSIC]', '<span class="func">[RESUME_MUSIC]</span>') // FC 18 xx

    .replaceAll('[PLAYER]', '<span class="var">[PLAYER]</span>') // FD 01
    .replaceAll('[STR_VAR_1]', '<span class="var">[STR_VAR_1]</span>') // FD 02
    .replaceAll('[STR_VAR_2]', '<span class="var">[STR_VAR_2]</span>') // FD 03
    .replaceAll('[STR_VAR_3]', '<span class="var">[STR_VAR_3]</span>') // FD 04
    .replaceAll('[RIVAL]', '<span class="var">[RIVAL]</span>') // FD 06 (FRLG)
    .replaceAll(/(\[B_[^\]]+?\])/gu, '<span class="var">$1</span>') // FD xx (battle string placeholders)
  ) : s;
  s = isGen4 ? (s
    .replaceAll(/\[(VAR 013[2-9A-B][^\]]+?\])/gu, '<span class="var long">\u{F0102}$1</span><span class="var short" title="\u{F0102}$1">\u{F0102}Digit]</span>')
    .replaceAll(/\[(VAR (?:0[1346]|34)[^\]]+?\])/gu, '<span class="var long">\u{F0102}$1</span><span class="var short" title="\u{F0102}$1">\u{F0102}Name]</span>')
    .replaceAll(/\[(VAR 02[^\]]+?\])/gu, '<span class="func long">\u{F0102}$1</span><span class="func short" title="\u{F0102}$1">\u{F0102}Ctrl1]</span>')
    .replaceAll(/\[(VAR FF[^\]]+?\])/gu, '<span class="func long">\u{F0102}$1</span><span class="func short" title="\u{F0102}$1">\u{F0102}Ctrl2]</span>')
  ) : s;
  s = isModern ? (s
    .replaceAll(/\[(VAR 01[^\]]+?\])/gu, '<span class="var long">\u{F0102}$1</span><span class="var short" title="\u{F0102}$1">\u{F0102}Name]</span>')
    .replaceAll(/\[(VAR 02[^\]]+?\])/gu, '<span class="var long">\u{F0102}$1</span><span class="var short" title="\u{F0102}$1">\u{F0102}Digit]</span>')
    .replaceAll(/\[(VAR 1[0-9A][^\]]+?\])/gu, '<span class="func long">\u{F0102}$1</span><span class="func short" title="\u{F0102}$1">\u{F0102}Grm]</span>')
    .replaceAll(/\[(VAR BD[^\]]+?\])/gu, '<span class="func long">\u{F0102}$1</span><span class="func short" title="\u{F0102}$1">\u{F0102}Ctrl1]</span>')
    .replaceAll(/\[(VAR BE[^\]]+?\])/gu, '<span class="func long">\u{F0102}$1</span><span class="func short" title="\u{F0102}$1">\u{F0102}Ctrl2]</span>')
  ) : s;
  s = (s
    .replaceAll('[NULL]', '<span class="null">[NULL]</span>')
    .replaceAll('[COMP]', '<span class="func compressed">[COMP]</span>')
    .replaceAll(/(\[VAR [^\]]+?\])/gu, '<span class="var">$1</span>')
    .replaceAll(/(\[WAIT [\d.]+\])/gu, '<span class="func wait">$1</span>')
    .replaceAll(/(\[SFX [\d.]+\])/gu, '<span class="func sfx">$1</span>') // BDSP
    .replaceAll(/(\[~ \d+\])/gu, '<span class="unused">$1</span>')
    .replaceAll(/\{([^|}]+)\|([^|}]+)\}/gu, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>') // Switch furigana
    .replaceAll(/(\s+$)/gu, '<span class="whitespace-trailing">$1</span>') // Trailing whitespace
    .replaceAll(/(^\s+)/gu, '<span class="whitespace-leading">$1</span>') // Leading whitespace
  );
  s = isModern ? postprocessSpeaker(s) : s;
  //#endregion

  // Format literals
  s = s.replaceAll(/\u{F1102}(.+?)\u{F1103}/gu, '<span class="literal">$1</span>');

  // Replace placeholders with literal characters
  s = (s
    .replaceAll('\u{F0100}', '\\')
    .replaceAll('\u{F0102}', '[')
    .replaceAll('\u{F0104}', '{')
    .replaceAll('\u{F0106}', '&lt;')
    .replaceAll('\u{F0107}', '&gt;')
  );
  return multiLine(s);
}
