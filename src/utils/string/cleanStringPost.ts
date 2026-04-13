import { CollectionKey, LanguageKey } from '../corpus';
import { postprocessSpeaker } from '../speaker';
import { grammarBranch, versionBranch, genderBranch, numberBranch, genderNumberBranch } from './branches';
import { postprocessStringGO } from './cleanStringGO';
import { postprocessStringMasters } from './cleanStringMasters';
import * as g1 from './expandVariablesG1';
import * as g3 from './expandVariablesG3';
import { particlesKO, grammarEN, grammarFR, grammarIT, grammarDE, grammarES, particlesKONames } from './grammar';
import { TextInfo } from './TextInfo';
import { getCorpusGroups } from "../corpusGroups";
import { remapMsgStdVariableName } from "./variableNames";

//#region Post-processing helper functions
function multiLine(s: string) {
  if (s.search(/[\u{F1000}\u{F1001}]/u) === -1) {
    return s;
  }
  return ['<dl>', ...s.split('\u{F1000}').map((line) => line.split('\u{F1001}')).map(([location, str]) => `<dt>${location}</dt><dd>${str}</dd>`), '</dl>'].join('');
}

function escapeHTML(s: string) {
  return (s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
  );
}

const supSub = (s: string) => `<sup>${s[0]}</sup><sub>${s[1]}</sub>`;
const grammarBranchFromIndex = (index: number, grammar: readonly string[][]) => {
  if (import.meta.env.DEV && index >= grammar.length)
    throw new Error(`unknown grammar index ${index} in ${JSON.stringify(grammar)}`);
  return grammarBranch(...grammar[index]);
};
const particleBranchFromIndex = (index: number, isMasters = false) => {
  if (import.meta.env.DEV && index >= particlesKO.length)
    throw new Error(`unknown particles index ${index}`);
  if (isMasters && index === 5) // ni, differs from GF
    return grammarBranch('로', '으로');
  return grammarBranch(...particlesKO[index]);
};
const versionBranchRS = (formA: string, formB: string) => versionBranch(formA, formB, 'ruby', 'sapphire');
const versionBranchSV = (formA: string, formB: string) => versionBranch(formA, formB, 'scarlet', 'violet');

/* Z-A buttons */
const buttonsZA: ReadonlyMap<string, string> = new Map([
  ['Decide', 'A'], // \uE31D
  ['Cancel', 'B'], // \uE31E
  ['Sp_1', 'X'], // \uE31F
  ['Sp_2', 'Y'], // \uE320
  ['L', 'L'], // \uE321
  ['R', 'R'], // \uE322
  ['ZL', 'ZL'], // \uE323
  ['ZR', 'ZR'], // \uE324
  ['Button_Up', '▲'], // \uE325
  ['Button_Down', '▼'], // \uE326
  ['Button_Left', '◀'], // \uE327
  ['Button_Right', '▶'], // \uE328
  ['Plus', '+'], // \uE319
  ['Minus', '\u2212'], // \uE32A

  ['Stick_L', 'Stick_L'], // \uE335
  ['Stick_R', 'Stick_R'], // \uE336
  ['Stick_L_Push', 'Stick_L_Push'], // \uE338
  ['Stick_R_Push', 'Stick_R_Push'], // \uE339
]);
const buttonFromName = (ti: TextInfo, code: string, len: string, rest: string) => {
  const end = parseInt(len, 16);
  const name = rest.substring(0, end);
  return ti.as({ kind: 'var', start: code + name, className: 'button', children: buttonsZA.get(name) ?? name }) + rest.substring(end);
};

/* Text color */
const dec2Hex = (n: string) => Number(n).toString(16).padStart(2, '0').toUpperCase();
const rgbaColor = (r: string, g: string, b: string, a: string) => `#${dec2Hex(r)}${dec2Hex(g)}${dec2Hex(b)}${a === '255' ? '' : dec2Hex(a)}`;
//#endregion

/**
 * Converts the provided string to HTML by escaping `<` and `>`,
 * replacing line break control characters such as `\n` with `<br>`,
 * and converting the ruby syntax `{base|ruby}` to the corresponding HTML tags.
 *
 * Returns the resulting HTML string.
 */
export function postprocessString(s: string, collectionKey: CollectionKey, language: LanguageKey, richText = true) {
  const { isGen1, isGen2, isGen3, isGen4, isGen5, isBDSP, isPBR, isRanch, isDreamRadar, isGO, isMasters, isHOME, isChampions, isGB, isNDS, is3DS, isN64, isGCN, isModern } = getCorpusGroups(collectionKey);

  if (!richText)
    return multiLine(escapeHTML(s));

  const ti = new TextInfo();

  // Replace literal special characters with a placeholder so they don't match other rules
  s = (s
    .replaceAll('\\\\', '\u{F0100}')
    .replaceAll('\\[', '\u{F0102}')
    .replaceAll('\\{', '\u{F0104}')
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
  s = isGB ? (s
    .replaceAll('@', '\u{F0250}')
  ) : s;
  s = isN64 ? (s
    .replaceAll('\u{F0100}n', '\u{F0200}') // Game Boy Tower
  ) : s;
  //#endregion

  //#region Special characters
  s = (isGB || isN64 || isGen3 || isNDS || is3DS) ? (s
    // Gen 5 PKMN [also used privately for Gen 4 and earlier]
    .replaceAll('⒆', ti.literal(supSub('PK')))
    .replaceAll('⒇', ti.literal(supSub('MN')))
  ) : s;
  s = isGen3 ? (s
    // POKé, POKéBLOCK
    .replaceAll('[POKE]', ti.literal(`${supSub('PO')}${supSub('Ké')}`))
    .replaceAll('[BLOCK]', ti.literal(g3.expandBlock(language)))
    .replaceAll('[MELLA]', ti.literal('MELLA'))
    .replaceAll('[MELLE]', ti.literal('MELLE'))
    .replaceAll('[POKEBLOCK]', ti.literal(`${supSub('PO')}${supSub('Ké')}${g3.expandBlock(language)}`))
    .replaceAll('[POKEMELLA]', ti.literal(`${supSub('PO')}${supSub('Ké')}MELLA`))
    .replaceAll('[POKEMELLE]', ti.literal(`${supSub('PO')}${supSub('Ké')}MELLE`))

    // Pco (French BP)
    .replaceAll('[Pco]', ti.literal('Pco'))

    // Gender unknown symbol (blank space with the same width as ♂/♀)
    // Also used as a figure space when printing numeric variables
    .replaceAll('[UNK_SPACER]', ti.literal('\u2007'))

    // Special characters (Lv, PP, ID, No)
    .replaceAll('[LV]', ti.literalSmall(g3.expandLv(language)))
    .replaceAll('[LV_2]', ti.literalSmall(g3.expandLv2(language)))
    .replaceAll('[LV_3]', ti.literalSmall(g3.expandLv3(language)))
    .replaceAll('[PP]', ti.literalSmall(g3.expandPP(language)))
    .replaceAll('[ID]', ti.literalSmall('ID'))
    .replaceAll('[NO]', ti.literalSmall(g3.expandNo(language)))
  ) : s;
  s = isGB ? (s
    // POKé (for POKéGEAR in the menu)
    .replaceAll('<PO>', ti.literal(supSub('PO')))
    .replaceAll('<KE>', ti.literal(supSub('Ké')))

    // Special characters
    .replaceAll('<ID>', ti.literalSmall(g1.expandID(language, isGen1)))
    .replaceAll('№', ti.literalSmall(g1.expandNo(language)))
    .replaceAll('<ED>', ti.literal(supSub(g1.expandED(language))))
    .replaceAll('<DOT>', ti.literal(g1.expandDot(language)))
  ) : s;
  s = (isGen2 && language === 'ja-Hrkt') ? (s
    // Pokédex
    .replaceAll('\\x44\\x45\\x46\\x47', ti.literal('オプション')) // OPTION
    .replaceAll('\\x4B\\x4C\\x4D\\x4E', ti.literal('けんさく')) // SEARCH
    .replaceAll('\\x51\\x52\\x53\\x54', ti.literal('プリント')) // PRNT
    .replaceAll('\\x55\\x56\\x57',      ti.literal('ぶんぷ')) // AREA
    .replaceAll('\\x58\\x59\\x5A\\x5B', ti.literal('なきごえ')) // CRY
  ) : s;
  s = (isGen2 && language === 'ko') ? (s
    // Single tile hangul, regular hangul are two tiles tall
    // Pokédex
    .replaceAll('\\x44\\x45\\x46\\x47', ti.literalSmall('옵션')) // OPTION
    .replaceAll('\\x4B\\x4C\\x4D\\x4E', ti.literalSmall('검색')) // SEARCH
    .replaceAll('\\x51\\x52\\x53\\x54', ti.literalSmall('프린트')) // PRNT
    .replaceAll('\\x55\\x56\\x57',      ti.literalSmall('분포')) // AREA
    .replaceAll('\\x58\\x59\\x5A\\x5B', ti.literalSmall('울음소리')) // CRY

    // Text entry screen
    .replaceAll('\\xA0\\xA1\\xA2\\xA3', ti.literalSmall('ㄱ')('\\xA0') + ti.literalSmall('ㄴ')('\\xA1') + ti.literalSmall('ㄷ')('\\xA2') + ti.literalSmall('ㄹ')('\\xA3'))
    .replaceAll('\\xA4\\xA5\\xA6\\xA7', ti.literalSmall('ㅁ')('\\xA4') + ti.literalSmall('ㅂ')('\\xA5') + ti.literalSmall('ㅅ')('\\xA6') + ti.literalSmall('ㅇ')('\\xA7'))
    .replaceAll('\\xA8\\xA9\\xAA\\xAB', ti.literalSmall('ㅈ')('\\xA8') + ti.literalSmall('ㅊ')('\\xA9') + ti.literalSmall('ㅋ')('\\xAA') + ti.literalSmall('ㅌ')('\\xAB'))
    .replaceAll('\\xAC\\xAD\\xAE\\xAF', ti.literalSmall('ㅍ')('\\xAC') + ti.literalSmall('ㅎ')('\\xAD') + ti.literalSmall('ㄲ')('\\xAE') + ti.literalSmall('ㄸ')('\\xAF'))
    .replaceAll('\\xB0\\xB1\\xB2',      ti.literalSmall('ㅃ')('\\xB0') + ti.literalSmall('ㅆ')('\\xB1') + ti.literalSmall('ㅉ')('\\xB2'))
    .replaceAll('\\xC0\\xC1\\xC2\\xC3', ti.literalSmall('ㅏ')('\\xC0') + ti.literalSmall('ㅑ')('\\xC1') + ti.literalSmall('ㅓ')('\\xC2') + ti.literalSmall('ㅕ')('\\xC3'))
    .replaceAll('\\xC4\\xC5\\xC6\\xC7', ti.literalSmall('ㅗ')('\\xC4') + ti.literalSmall('ㅛ')('\\xC5') + ti.literalSmall('ㅜ')('\\xC6') + ti.literalSmall('ㅠ')('\\xC7'))
    .replaceAll('\\xC8\\xC9\\xCA\\xCB', ti.literalSmall('ㅡ')('\\xC8') + ti.literalSmall('ㅣ')('\\xC9') + ti.literalSmall('ㅐ')('\\xCA') + ti.literalSmall('ㅒ')('\\xCB'))
    .replaceAll('\\xCC\\xCD\\xCE\\xCF', ti.literalSmall('ㅔ')('\\xCC') + ti.literalSmall('ㅖ')('\\xCD') + ti.literalSmall('ㅘ')('\\xCE') + ti.literalSmall('ㅙ')('\\xCF'))
    .replaceAll('\\xD0\\xD1\\xD2\\xD3', ti.literalSmall('ㅚ')('\\xD0') + ti.literalSmall('ㅝ')('\\xD1') + ti.literalSmall('ㅞ')('\\xD2') + ti.literalSmall('ㅟ')('\\xD3'))
    .replaceAll('\\xD4',                ti.literalSmall('ㅢ')('\\xD4'))

    // Main font
    .replaceAll('$', ti.literalSmall('원')) // won (currency)
    .replaceAll('\\xC8\\xC9', ti.literalSmall('동전')) // COIN
    .replaceAll('\\xBA\\xBB\\xBC', ti.literalFixed('기절')) // FNT
    .replaceAll('\\xBD\\xBE\\xBF', ti.literalFixed('잠듦')) // SLP
    .replaceAll('\\xCA\\xCB\\xCC', ti.literalFixed('독')) // PSN
    .replaceAll('\\xCD\\xCE\\xCF', ti.literalFixed('화상')) // BRN
    .replaceAll('\\xDA\\xDB\\xDC', ti.literalFixed('얼음')) // FRZ
    .replaceAll('\\xDD\\xDE\\xDF', ti.literalFixed('마비')) // PAR
  ) : s;
  //#endregion

  //#region Formatting
  s = (isBDSP || isChampions) ? (s
    .replaceAll(/(\[System:Size percent="(\d+)" \])(.*?)(\[System:Size percent="100" \])/gu, (_, start: string, value: string, children: string, end: string) => ti.as({ kind: 'tag', start, style: `font-size: ${value}%`, children, end })) // font size
    .replaceAll(/\[System:Size percent="100" \]/gu, ti.func()) // font size (reset)
    .replaceAll(/(\[System:Color (?!a="255" \])(?:r="(\d+)" )?(?:g="(\d+)" )?(?:b="(\d+)" )?(?:a="(\d+)" )?\])(.*?)(\[System:Color a="255" \]|(?=\[System:Color ))/gu, (_, start: string, r: string | undefined, g: string | undefined, b: string | undefined, a: string | undefined, children: string, end: string) => ti.as({ kind: 'tag', start, className: 'color', style: `color: ${rgbaColor(r ?? '', g ?? '', b ?? '', a ?? '')}`, children, end })) // font color
    .replaceAll(/\[System:Color a="255" \]/gu, ti.func()) // font color (reset)
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)(\[Ctrl1:xadd value="(\d+)" \])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before: string, start: string, value: string, after: string) => ti.as({ span: true, style: `tab-size: ${value}px`, children: `${before}${ti.as({ kind: 'tag', start, content: '\t' })}${after}` })) // xadd
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)(\[Ctrl1:xset value="(\d+)" \])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before: string, start: string, value: string, after: string) => ti.as({ span: true, style: `tab-size: ${value}px`, children: `${before}${ti.as({ kind: 'tag', start, content: '\t' })}${after}` })) // xset
  ) : s;
  s = (isGen4 || isModern) ? (s
    .replaceAll(/(\[VAR FF00\((?!0000)([0-9A-F]{4})\)\])(.+?)(\[VAR FF00\(0000\)\]|(?=\[VAR FF00\((?!0000)[0-9A-F]{4}\)\])|$)/gu, (_, code: string, color: string, children: string, end: string) => ti.as({ kind: 'var', start: code, className: 'color', style: `color: var(--color-${parseInt(color, 16)})`, children, end })) // font color
    .replaceAll(/\[VAR FF00\(0000\)\]/gu, ti.func()) // font color (reset)
  ) : s;
  s = (isGen5 || is3DS) ? (s
    .replaceAll(/(\[VAR BD00\(([0-9A-F]{4}),([0-9A-F]{4}),([0-9A-F]{4})\)\])(.+?)(\[VAR BD00\(0001,0002,0000\)\]|\[VAR BD01\]|$)/gu, (_, code: string, color1: string, color2: string, color3: string, children: string, end: string) => ti.as({ kind: 'var', start: code, className: 'color', style: `color: var(--color-${parseInt(color1, 16)}-${parseInt(color2, 16)}-${parseInt(color3, 16)})`, children, end })) // font color
    .replaceAll('[VAR BD01]', ti.func()) // font color (reset)
  ) : s;
  s = isGen4 ? (s
    .replaceAll(/(\[VAR FF01\(00C8\)\])(\[VAR FF01\(0064\)\])/gu, (_, start: string, end: string) => ti.as({ kind: 'var', start, end })) // Gen 4 font size (empty string at 200%)
    .replaceAll(/(\[VAR FF01\(00C8\)\])(.+?)(\[VAR FF01\(0064\)\]|$)/gu, (_, start: string, children: string, end: string) => ti.as({ span: true, className: 'line-font-size-200', children: ti.as({ kind: 'var', start, className: 'text-font-size-200', children, end }) })) // Gen 4 font size (text at 200%)
    .replaceAll('[VAR FF01(0064)]', ti.func()) // Gen 4 font size (set to 100%)

    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)(\[VAR 0203\(([0-9A-F]{4})\)\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before: string, start: string, size: string, after: string) => ti.as({ span: true, style: `tab-size: ${parseInt(size, 16)}pt`, children: `${before}${ti.as({ kind: 'var', start, content: '\t' })}${after}` })) // Gen 4 X coords
    .replaceAll(/\[VAR 0203\(([0-9A-F]{4})\)\]/gu, (start) => ti.as({ kind: 'var', start, content: '\t' })) // can't really have multiple tab sizes, so approximate the rest as tabs
    .replaceAll(/\[VAR 0204\(([0-9A-F]{4})\)\]/gu, (start, pad: string) => ti.as({ kind: 'var', start, style: `display: block; height: ${parseInt(pad, 16)}pt` })) // Gen 4 Y coords
    .replaceAll(/(\[VAR 0205\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, code: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-center', children })) // HGSS
    .replaceAll(/(\[VAR 0206\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, code: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-right', children })) // HGSS
  ) : s;
  s = isModern ? (s
    .replaceAll(/(\[VAR BD02\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, code: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-center', children })) // Gen 5+
    .replaceAll(/(\[VAR BD03\(([0-9A-F]{4})\)\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, code: string, pad: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-right', style: `padding-right: ${parseInt(pad, 16)}pt`, children })) // Gen 5+
    .replaceAll(/(\[VAR BD04\(([0-9A-F]{4})\)\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, code: string, pad: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-left', style: `padding-left: ${parseInt(pad, 16)}pt`, children })) // Gen 5+
    .replaceAll(/((?<=^|[\u{F0201}\u{F0202}\u{F0200}]).*?)(\[VAR BD05\(([0-9A-F]{4})\)\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)/gu, (_, before: string, start: string, size: string, after: string) => ti.as({ span: true, style: `tab-size: ${parseInt(size, 16)}pt`, children: `${before}${ti.as({ kind: 'var', start, content: '\t' })}${after}` })) // Gen 5 X coords
    .replaceAll(/\[VAR BD05\(([0-9A-F]{4})\)\]/gu, (start) => ti.as({ kind: 'var', start, content: '\t' })) // can't really have multiple tab sizes, so approximate the rest as tabs
    .replaceAll(/(\[VAR BD0A\(([0-9A-F]{4})\)\])([^[<{]*)/gu, (_, code: string, len: string, rest: string) => buttonFromName(ti, code, len, rest)) // buttons
  ) : s;
  s = isPBR ? (s
    .replaceAll(/(\[ALIGN 1\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, (_, code: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-left', children })) // PBR
    .replaceAll(/(\[ALIGN 2\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, (_, code: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-center', children })) // PBR
    .replaceAll(/(\[ALIGN 3\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[ALIGN \d+\]|$)/gu, (_, code: string, children: string) => ti.as({ kind: 'var', start: code, className: 'line-align-right', children })) // PBR
  ) : s;
  s = isHOME ? (s
    .replaceAll(/<(\/?[bu]) *>/giu, (code: string) => ti.html(code)) // HOME mobile b, u
  ) : s;
  //#endregion

  //#region Line breaks
  // Soft line breaks
  const BR = "\u{FF000}";
  switch (collectionKey) {
    case "SunMoon":
    case "UltraSunUltraMoon":
      // In SMUSUM, it affects the next \n (as long as \r or \c does not occur prior to the line break), but it must be at the start of the string and only affects two-line strings.
      s = s.replaceAll(/^(\[VAR BD06\([0-9A-F]{4}\)\])([^\u{F0201}\u{F0202}\u{F0200}]*?)\u{F0200}(?=[^\u{F0201}\u{F0202}\u{F0200}]*?[\u{F0201}\u{F0202}]?$)/gu, (_, code: string, line: string) => `${code}${line}\u{F0200}\u{F1300}`);
      break;
    case "LetsGoPikachuLetsGoEevee":
    case "SwordShield":
      // In LGPE and SwSh, it affects the next \n (as long as \r or \c does not occur prior to the line break), and it can now be anywhere in the string and affect the following two lines.
      s = s.replaceAll(/(\[VAR BD06\([0-9A-F]{4}\)\])([^\u{F0201}\u{F0202}\u{F0200}]*?)\u{F0200}/gu, (_, code: string, line: string) => `${code}${line}\u{F0200}\u{F1300}`);
      break;
    case "Champions":
    default:
      // Starting in LA, it affects all subsequent \n and \r\n (but not \c\n).
      s = s.replaceAll(/(\[VAR BD06\([0-9A-F]{4}\)\]|\[Ctrl1:battle_oneline \])(.*)$/gu, (_, code: string, children: string) => `${code}${children.replaceAll(/(?<!\u{F0202})\u{F0200}/gu, '\u{F0200}\u{F1300}')}`);
  }
  s = isGen4 ? (s
    .replaceAll('\u{F0207}\u{F0200}', `${ti.asWhitespace('c', '[VAR 0207]')}${ti.asWhitespace('n')}`) // [VAR 0207]\n
    .replaceAll('\u{F0208}\u{F0200}', `${ti.asWhitespace('r', '[VAR 0208]')}${ti.asWhitespace('n')}${BR}`) // [VAR 0208]\n
  ) : s;
  s = (s
    .replaceAll('\u{F0201}\u{F0200}', `${ti.asWhitespace('r')}${ti.asWhitespace('n')}${BR}`) // \r\n
    .replaceAll('\u{F0202}\u{F0200}', `${ti.asWhitespace('c')}${ti.asWhitespace('n')}${BR}`) // \c\n
    .replaceAll('\u{F0200}\u{F0202}', `${ti.asWhitespace('n')}${ti.asWhitespace('c')}${BR}`) // \n\c (Ranch)
  );
  s = isGen4 ? (s
    .replaceAll('\u{F0207}', `${ti.asWhitespace('c', '[VAR 0207]')}${BR}`) // [VAR 0207]
    .replaceAll('\u{F0208}', `${ti.asWhitespace('r', '[VAR 0208]')}${BR}`) // [VAR 0208]
  ) : s;
  s = isGB ? (s
    // Terminator (50)
    // Should be followed by a line break unless part of a <MOBILE> string or if followed by a text command or another terminator
    .replaceAll(/(?<!<MOBILE>\{.+?\})\u{F0250}(?!\{text_|\{sound_|\u{F0250}|\\x00|$)/gu, `\u{F0250}\u{FF000}`)

    // General line breaks
    // Should be followed by a line break, placed after any following string terminators
    .replaceAll(/(<LF>)(\u{F0250}*)/gu,     (_, code: string, end: string) => `${ti.asWhitespace('n', code)}${end}${BR}`) // 22
    .replaceAll(/(<PAGE>)(\u{F0250}*)/gu,   (_, code: string, end: string) => `${ti.asWhitespace('c', code)}${end}${BR}`) // 49
    .replaceAll(/(<_CONT>)(\u{F0250}*)/gu,  (_, code: string, end: string) => `${ti.asWhitespace('r', code)}${end}${BR}`) // 4B
    .replaceAll(/(<SCROLL>)(\u{F0250}*)/gu, (_, code: string, end: string) => `${ti.asWhitespace('r', code)}${end}${BR}`) // 4C
    .replaceAll(/(<NEXT>)(\u{F0250}*)/gu,   (_, code: string, end: string) => `${ti.asWhitespace('n', code)}${end}${BR}`) // 4E
    .replaceAll(/(<LINE>)(\u{F0250}*)/gu,   (_, code: string, end: string) => `${ti.asWhitespace('n', code)}${end}${BR}`) // 4F
    .replaceAll(/(<PARA>)(\u{F0250}*)/gu,   (_, code: string, end: string) => `${ti.asWhitespace('c', code)}${end}${BR}`) // 51
    .replaceAll(/(<CONT>)(\u{F0250}*)/gu,   (_, code: string, end: string) => `${ti.asWhitespace('r', code)}${end}${BR}`) // 55
    .replaceAll(/(<DONE>)(\u{F0250}*)/gu,   (_, code: string, end: string) => `${ti.asWhitespace('t', code)}${end}${BR}`) // 57
    .replaceAll(/(<PROMPT>)(\u{F0250}*)/gu, (_, code: string, end: string) => `${ti.asWhitespace('t', code)}${end}${BR}`) // 58

    .replaceAll(/\u{F0250}/gu, ti.asWhitespace('t', '@'))
    .replaceAll('<DEXEND>', ti.literal(`${g1.expandDexEnd(language)}<span class="t">@</span>`))
    .replaceAll('{text_low}', `{text_low}${BR}`)
    .replaceAll(/(\{nts_(?:switch)[^}]+\})(<MOBILE>)/gu, '$1\u{FF000}$2')
  ) : s;
  s = (s
    .replaceAll('\u{F0201}', `${ti.asWhitespace('r')}${BR}`) // \r
    .replaceAll('\u{F0202}', `${ti.asWhitespace('c')}${BR}`) // \c
    .replaceAll('\u{F0200}', `${ti.asWhitespace('n')}${BR}`) // \n

    .replaceAll('\u{F02FF}', ti.asWhitespace('e')) // \e
    .replaceAll('\u{F0203}', ti.html('<span class="tab">\t</span>'))
  );
  const space = ['ja', 'ko', 'zh'].some((lang) => language.startsWith(lang)) ? '\u3000' : ' ';
  s = s.replaceAll(`${BR}\u{F1300}`, ti.html(`<wbr class="soft"><span class="soft">${space}</span>`)); // soft line break
  s = isGen2 ? (s
    // Soft line breaks
    .replaceAll('<SHY>', ti.as({ start: '<SHY>', kind: 'whitespace', content: '<span class="control">&lt;SHY&gt;</span><span class="soft">&shy;</span>' })) // soft hyphen (1E)
    .replaceAll('<BSP>', ti.as({ start: '<BSP>', kind: 'whitespace', content: '<span class="control">&lt;BSP&gt;</span><span class="soft"> </span>' }))     // soft space (1F)
    .replaceAll('<WBR>', ti.as({ start: '<WBR>', kind: 'whitespace', content: '<span class="control">&lt;WBR&gt;</span><wbr class="soft">' }))              // soft line break (25)
  ) : s;
  //#endregion

  //#region Spin-off
  // N64
  if (isN64) {
    s = (s
      // Color animation
      .replaceAll(/(#71)(.*?)(<COL1,POP><COL2,POP>|$)/gu,
        (_, start: string, children: string, end: string) =>
          ti.as({ kind: 'tag', start, className: 'color color-animation', children, end }))

      // Color gradient
      .replaceAll(/(<COL1,PUSH,(\d+),(\d+),(\d+),(\d+)><COL2,PUSH,(\d+),(\d+),(\d+),(\d+)>)(.*?)(<COL1,POP><COL2,POP>|$)/gu,
        (_: string, start: string, r1: string, g1: string, b1: string, a1: string, r2: string, g2: string, b2: string, a2: string, children: string, end: string) =>
          ti.as({ kind: 'tag', start, children: ti.as({ span: true, className: 'color gradient', style: `--top: ${rgbaColor(r1, g1, b1, a1)}; --bottom: ${rgbaColor(r2, g2, b2, a2)}`, children }), end }))

      // Color push/pop (at most two levels deep)
      .replaceAll(/(<COL1,PUSH,(\d+),(\d+),(\d+),(\d+)>)((?:(?!<COL1).)*?)(<COL[12],POP>|(?=<COL1,LOAD)|$)/gu,
        (_, start: string, r: string, g: string, b: string, a: string, children: string, end: string) =>
          ti.as({ kind: 'tag', start, className: 'color', style: `color: ${rgbaColor(r, g, b, a)}`, children, end }))
      .replaceAll(/(<COL1,PUSH,(\d+),(\d+),(\d+),(\d+)>)(.*?)(<COL1,POP>|(?=<COL1,LOAD)|$)/gu,
        (_, start: string, r: string, g: string, b: string, a: string, children: string, end: string) =>
          ti.as({ kind: 'tag', start, className: 'color', style: `color: ${rgbaColor(r, g, b, a)}`, children, end }))
      .replaceAll(/(<COL[12],POP>)/gu, ti.func())

      // Color load
      .replaceAll(/(<COL1,LOAD,(\d+),(\d+),(\d+),(\d+)>)(.*?)(?=<COL1,LOAD|$)/gu,
        (_, start: string, r: string, g: string, b: string, a: string, children: string) =>
          ti.as({ kind: 'tag', start, className: 'color', style: `color: ${rgbaColor(r, g, b, a)}`, children }))

      // Spacing
      .replaceAll(/(<DIST,([\d.]+)>)(.*?)(?=<DIST,([\d.]+)>|$)/gu, (_, start: string, value: string, children: string) => ti.as({ span: true, className: `spacing-${value}`, children: `${ti.asControl(start)}${children}` }))

      .replaceAll(/<FONT,(?:LOAD,\d+|PUSH,\d+|POP)>/gu, ti.func())
      .replaceAll(/<TEX, ?[\d０-９]+>/gu, ti.var())
      .replaceAll(/<LINE,[\d０-９]+>/gu, ti.func())
      .replaceAll(/<FACE,\d+,[\dZ]+>/gu, ti.func())
      .replaceAll(/<WAZA,?\d+,\d+>/gu, ti.func())
      .replaceAll(/<(?:KOKA|NEMURI|DOKU|DOKUDOKU|YAKEDO|KOHRI|MAHI|HIRUM[IU]|SHIBARI|KONRAN|MEROMERO|NOROI|AKUMU|YADORIGI|HARE|AME|SUNA), ?\d+>/gu, ti.func())

      .replaceAll(/#\d{2}/gu, ti.var())
      .replaceAll(/%%/gu, ti.literal('%')) // printf

      // Game Boy Tower
      .replaceAll(/(\u{F0100}(?:CU|CR|B|R))/gu, ti.var())
    );
  }

  // GCN
  s = isGCN ? (s
    .replaceAll(/(<SCOL=0x0d0e0f>)/gu, ti.func())
    .replaceAll(/(\[unknown5_08_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})_([0-9a-f]{2})\])(.*?)(\[unknown5_08_ff_ff_ff_ff\]|$|(?=\u{F1000}))/gu, (_, start: string, r: string, g: string, b: string, a: string, children: string, end: string) => ti.as({ kind: 'var', start, className: 'color', style: `color: #${r}${g}${b}${a === 'ff' ? '' : a}`, children, end }))
    .replaceAll('[Player]', ti.var())
    .replaceAll('[Player_alt]', ti.var())
    .replaceAll('[Rui]', ti.var())
    .replaceAll('[opp_trainer_class]', ti.var())
    .replaceAll('[opp_trainer_name]', ti.var())
    .replaceAll('[sent_out_pokemon_1]', ti.var())
    .replaceAll('[sent_out_pokemon_2]', ti.var())
    .replaceAll('[speechbubble]', ti.var())
    .replaceAll('[bubble_or_speaker]', ti.var())
    .replaceAll('[maybe_speaker_ID_toggle]', ti.var())
    .replaceAll('[maybe_location]', ti.var())
    .replaceAll('[dialogue_end]', ti.func())
    .replaceAll('[large_e]', ti.var())
    .replaceAll('[large_e+]', ti.var())
    .replaceAll('[furi_kanji]', ti.func())
    .replaceAll('[furi_kana]', ti.func())
    .replaceAll('[furi_close]', ti.func())
    .replaceAll(/(\[some_[^\]]+?\])/gu, ti.var())
    .replaceAll(/(\[unknown[^\]]+?\])/gu, ti.var())
    .replaceAll(/(\[var_[^\]]\])/gu, ti.var())
    .replaceAll('<SCOL=0x0d0e0f>', ti.func())
  ) : s;

  // PBR
  s = isPBR ? (s
    .replaceAll(/(\[COLOR (\d+)\])(.*?)(?:\[COLOR \d+\]|[\u{F0201}\u{F0202}\u{F0200}]|$)/gu, (_, code: string, color: string, children: string) => ti.as({ kind: 'var', start: code, className: 'color', style: `color: var(--color-${color})`, children }))
    .replaceAll(/(\[VERTOFFSET -?[\d.]+\])/gu, ti.control())
    .replaceAll(/(\[FONT (\d+)\])(.*?(?:[\u{F0201}\u{F0202}\u{F0200}]|$)+)(?=\[FONT \d+\]|$)/gu, (_, code: string, index: string, children: string) => ti.as({ span: true, className: `font-pbr-${index}`, children: `${ti.asControl(code)}${children}` }))
    .replaceAll(/(\[SPACING (-?[\d.]+)\])(.*?$)/gu, (_, code: string, value: string, children: string) => ti.as({ span: true, className: `spacing-${value}`, children: `${ti.asControl(code)}${children}` }))
  ) : s;

  // Ranch
  s = isRanch ? (s
    .replaceAll(/(%((\d+\$)?(\d*d|\d*\.\d+[fs]m?|ls)|(\(\d+\)%|\d+\$)?\{\}|\(\d+\)))/gu, ti.var())
    .replaceAll(/(\$\d+\$)/gu, ti.var())
  ) : s;

  // Dream Radar
  s = isDreamRadar ? (s
    .replaceAll(/(\[VAR 0003\(([0-9A-F]{2})[0-9A-F]{2}\)\])(.*?)(\[VAR 0003\([0-9A-F]{4}\)\]|$)/gu, (_, code: string, color: string, children: string, end: string) => ti.as({ kind: 'var', start: code, className: 'color', style: `color: var(--color-${parseInt(color, 16)})`, children, end })) // font color
    .replaceAll(/\[VAR 0003\(0000\)\]/gu, '') // font color (reset)
  ) : s;

  // Separate files
  s = isGO ? postprocessStringGO(s, ti) : s;
  s = isMasters ? postprocessStringMasters(s, ti) : s;
  //#endregion

  //#region Grammar
  if (isModern) {
    if (isBDSP || isChampions)
      s = (s
        .replaceAll(/\[(EN:(?!Force|Gen|Qty|Version)[^ ]+) [^\]]*?\]/gu,         (code, tag: string) => ti.asBranch(code, grammarBranchFromIndex(remapMsgStdVariableName(tag, collectionKey), grammarEN))) // English
        .replaceAll(/\[(FR:(?!Force|Gen|Qty|Version|Elision)[^ ]+) [^\]]*?\]/gu, (code, tag: string) => ti.asBranch(code, grammarBranchFromIndex(remapMsgStdVariableName(tag, collectionKey), grammarFR))) // French
        .replaceAll(/\[(IT:(?!Force|Gen|Qty|Version|DateIT)[^ ]+) [^\]]*?\]/gu,  (code, tag: string) => ti.asBranch(code, grammarBranchFromIndex(remapMsgStdVariableName(tag, collectionKey), grammarIT))) // Italian
        .replaceAll(/\[(DE:(?!Force|Gen|Qty|Version|ItemAcc)[^ ]+) [^\]]*?\]/gu, (code, tag: string) => ti.asBranch(code, grammarBranchFromIndex(remapMsgStdVariableName(tag, collectionKey), grammarDE))) // German
        .replaceAll(/\[(ES:(?!Force|Gen|Qty|Version)[^ ]+) [^\]]*?\]/gu,         (code, tag: string) => ti.asBranch(code, grammarBranchFromIndex(remapMsgStdVariableName(tag, collectionKey), grammarES))) // Spanish
      );
    else
      s = (s
        .replaceAll(/\[VAR 13(0[0-3])[^\]]*?\]/gu,    (code, index: string) => ti.asBranch(code, grammarBranchFromIndex(parseInt(index, 16), grammarEN))) // English
        .replaceAll(/\[VAR 14(0[0-9A-B])[^\]]*?\]/gu, (code, index: string) => ti.asBranch(code, grammarBranchFromIndex(parseInt(index, 16), grammarFR))) // French
        .replaceAll(/\[VAR 15(0[0-9A-F])[^\]]*?\]/gu, (code, index: string) => ti.asBranch(code, grammarBranchFromIndex(parseInt(index, 16), grammarIT))) // Italian
        .replaceAll(/\[VAR 16(0[0-7])[^\]]*?\]/gu,    (code, index: string) => ti.asBranch(code, grammarBranchFromIndex(parseInt(index, 16), grammarDE))) // German
        .replaceAll(/\[VAR 17(0[0-9A-F])[^\]]*?\]/gu, (code, index: string) => ti.asBranch(code, grammarBranchFromIndex(parseInt(index, 16), grammarES))) // Spanish
      );
  }

  // Korean particle
  if (language === 'ko' && isGen4)
    s = s.replaceAll(/\[VAR (?:0[1346]|34)[0-9A-F]{2}\([0-9A-F]{4},([0-9A-F]{4})\)\]/gu, (code, index: string) => ti.asVarSuffix(code, particleBranchFromIndex(parseInt(index, 16) % 8)));
  else if (language === 'ko' && collectionKey === 'BlackWhite')
    s = s.replaceAll(/\[VAR 0[12][0-9A-F]{2}\([0-9A-F]{4},([0-9A-F]{4})\)\]/gu, (code, index: string) => ti.asVarSuffix(code, particleBranchFromIndex(parseInt(index, 16) % 8)));
  else if (collectionKey === 'Black2White2')
    s = s.replaceAll(/\[VAR 3400\(([0-9A-F]{4})\)\]/gu, (code, index: string) => ti.asBranch(code, particleBranchFromIndex(parseInt(index, 16) % 8)));
  else if (isBDSP || isChampions || isMasters)
    s = s.replaceAll(/\[Kor:Particle char="(none|ha|wo|ga|to|ni|ya|san|desu)" \]/gu, (code, char: string) => ti.asBranch(code, particleBranchFromIndex(particlesKONames.indexOf(char), isMasters)));
  else if (isModern)
    s = s.replaceAll(/\[VAR 1900\(([0-9A-F]{4})\)\]/gu, (code, index: string) => ti.asBranch(code, particleBranchFromIndex(parseInt(index, 16))));
  else if (isDreamRadar)
    s = s.replaceAll(/\[VAR 0600\((0[0-9A-F])[0-9A-F]{2}\)\]/gu, (code, index: string) => ti.asBranch(code, particleBranchFromIndex(parseInt(index, 16))));
  //#endregion

  //#region Branches
  s = isGen2 ? (s
    .replaceAll('<PLAY_G>', (code) => ti.as({ start: code, kind: 'var', content: '<span class="var">&lt;PLAYER&gt;</span>' + (language === 'ja-Hrkt' ? genderBranch('くん', 'ちゃん') : '')})) // <PLAY_G>
  ) : s;
  s = isGen3 ? (s
    .replaceAll(/\u{F1102}([^\u{F1102}]*?)\u{F1105}\u{F1200}([^\u{F1102}]*?)\u{F1104}([^\u{F1102}]*?)\u{F1103}/gu, (_, code: string, male: string, female: string) => ti.asLiteral(code, genderBranch(male, female))) // FD 05, FD 06
    .replaceAll(/\u{F1102}([^\u{F1102}]*?)\u{F1105}\u{F1207}([^\u{F1102}]*?)\u{F1104}([^\u{F1102}]*?)\u{F1103}/gu, (_, code: string, form1: string, form2: string) => ti.asLiteral(code, versionBranchRS(form1, form2))) // FD 07 - FD 0D
  ) : s;
  s = isModern ? (s
    .replaceAll(/(\[VAR 1100\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\])([^[<{]*)/gu, (_, code: string, lenF: string, lenM: string, rest: string) => {
      const endM = parseInt(lenM, 16);
      const endF = endM + parseInt(lenF, 16);
      return `${ti.asBranch(code, genderBranch(rest.substring(0, endM), rest.substring(endM, endF)))}${rest.substring(endF)}`;
    })
    .replaceAll(/(\[VAR 1100\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),00([0-9A-F]{2})\)\])([^[<{]*)/gu, (_, code: string, lenF: string, lenM: string, lenN: string, rest: string) => {
      const endM = parseInt(lenM, 16);
      const endF = endM + parseInt(lenF, 16);
      const endN = endF + parseInt(lenN, 16);
      return `${ti.asBranch(code, genderBranch(rest.substring(0, endM), rest.substring(endM, endF), rest.substring(endF, endN)))}${rest.substring(endN)}`;
    })
    .replaceAll(/(\[VAR 1101\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\])([^[<{]*)/gu, (_, code: string, lenP: string, lenS: string, rest: string) => {
      const endS = parseInt(lenS, 16);
      const endP = endS + parseInt(lenP, 16);
      return `${ti.asBranch(code, numberBranch(rest.substring(0, endS), rest.substring(endS, endP)))}${rest.substring(endP)}`;
    })
    .replaceAll(/(\[VAR 1102\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),([0-9A-F]{2})([0-9A-F]{2})\)\])([^[<{]*)/gu, (_, code: string, lenFS: string, lenMS: string, lenFP: string, lenMP: string, rest: string) => {
      const endMS = parseInt(lenMS, 16);
      const endFS = endMS + parseInt(lenFS, 16);
      const endMP = endFS + parseInt(lenMP, 16);
      const endFP = endMP + parseInt(lenFP, 16);
      return `${ti.asBranch(code, genderNumberBranch(rest.substring(0, endMS), rest.substring(endMS, endFS), rest.substring(endFS, endMP), rest.substring(endMP, endFP)))}${rest.substring(endFP)}`;
    })
    .replaceAll(/(\[VAR (?:1104|1106)\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\])([^[<{]*)/gu, (_, code: string, len2: string, len1: string, rest: string) => {
      const end1 = parseInt(len1, 16);
      const end2 = end1 + parseInt(len2, 16);
      return `${ti.asBranch(code, grammarBranch(rest.substring(0, end1), rest.substring(end1, end2)))}${rest.substring(end2)}`;
    })
    .replaceAll(/(\[VAR 1105\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2}),00([0-9A-F]{2})\)\])([^[<{]*)/gu, (_, code: string, lenP: string, lenS: string, lenZ: string, rest: string) => {
      const endS = parseInt(lenS, 16);
      const endP = endS + parseInt(lenP, 16);
      const endZ = endP + parseInt(lenZ, 16);
      return `${ti.asBranch(code, numberBranch(rest.substring(0, endS), rest.substring(endS, endP), rest.substring(endP, endZ)))}${rest.substring(endZ)}`;
    })
    .replaceAll(/(\[VAR 1107\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)\])([^[<{]*)/gu, (_, code: string, len2: string, len1: string, rest: string) => {
      const end1 = parseInt(len1, 16);
      const end2 = end1 + parseInt(len2, 16);
      return `${ti.asBranch(code, versionBranchSV(rest.substring(0, end1), rest.substring(end1, end2)))}${rest.substring(end2)}`;
    })
  ) : s;
  s = (isBDSP || isChampions || isMasters) ? (s
    .replaceAll(/\[(?:JP|EN|FR|IT|DE|ES|Kor|SC):Gen (?:Ref="\d+" )?(?:M="([^"]*?)" )?(?:F="([^"]*?)" )?\]/gu, (code, male?: string, female?: string) => ti.asBranch(code, genderBranch(male ?? '', female ?? '')))
    .replaceAll(/\[(?:JP|EN|FR|IT|DE|ES|Kor|SC):Qty (?:Ref="\d+" )?(?:S="([^"]*?)" )?(?:P="([^"]*?)" )?\]/gu, (code, singular?: string, plural?: string) => ti.asBranch(code, numberBranch(singular ?? '', plural ?? '')))
    .replaceAll(/\[(?:JP|EN|FR|IT|DE|ES|Kor|SC):GenQty (?:Ref="\d+" )?(?:MS="([^"]*?)" )?(?:FS="([^"]*?)" )?(?:MP="([^"]*?)" )?(?:FP="([^"]*?)" )?\]/gu, (code, maleSingular?: string, femaleSingular?: string, malePlural?: string, femalePlural?: string) => ti.asBranch(code, genderNumberBranch(maleSingular ?? '', femaleSingular ?? '', malePlural ?? '', femalePlural ?? '')))
    .replaceAll(/\[(?:JP|EN|FR|IT|DE|ES|Kor|SC):QtyZero (?:Ref="\d+" )?(?:S="([^"]*?)" )?(?:P="([^"]*?)" )?(?:Z="([^"]*?)" )?\]/gu, (code, singular?: string, plural?: string, zero?: string) => ti.asBranch(code, numberBranch(singular ?? '', plural ?? '', zero ?? '')))
    .replaceAll(/\[(?:FR):Elision (?:Ref="\d+" )?(?:N="([^"]*?)" )?(?:Y="([^"]*?)" )?\]/gu, (code, no?: string, yes?: string) => ti.asBranch(code, grammarBranch(no ?? '', yes ?? '')))
    .replaceAll(/\[(?:IT):DateIT (?:Ref="\d+" )?(?:V="([^"]*?)" )?(?:C="([^"]*?)" )?\]/gu, (code, vowel?: string, consonant?: string) => ti.asBranch(code, grammarBranch(vowel ?? '', consonant ?? '')))
  ) : s;
  //#endregion

  //#region Variables
  s = isGB ? (s
    .replaceAll(/(\{text_(?:start|waitbutton|promptbutton|linkwaitbutton|pause)\})/gu, ti.control())
    .replaceAll(/(\{text_low\})/gu, ti.asWhitespace('n', '{text_low}'))
    .replaceAll(/(\{text_ram [^}]+\})/gu, ti.var('{text_ram}'))
    .replaceAll(/(\{text_bcd [^}]+\})/gu, ti.var('{text_bcd}'))
    .replaceAll(/(\{text_decimal [^}]+\})/gu, ti.var('{text_decimal}'))
    .replaceAll(/\{text_dots (\d+)\}/gu, (code, count: string) => ti.as({ start: code, kind: 'var', children: '…'.repeat(Number(count)) }))
    .replaceAll(/(\{text_today\})/gu, ti.var())
    .replaceAll(/(\{sound_[^}]+\})/gu, ti.func('{sound}'))
    .replaceAll(/\{(nts_(?:placement|next))[^}]+\}/gu, (code, name: string) => ti.func(`{${name}}`)(code))
    .replaceAll(/\{(nts_(?:ranking_(?:number|string|ezchat|region|pokemon|gender|item)|placement|player_(?:name|region|region_backup|zip|zip_backup)|switch|next|number))[^}]+\}/gu, (code, name: string) => ti.var(`{${name}}`)(code))
    .replaceAll(/(\\x[0-9A-F]{2})/gu, ti.var())

    .replaceAll('<MOBILE>', ti.control()) // 15
    .replaceAll('<ENEMY>',  ti.var()) // 52
    .replaceAll('<PLAYER>', ti.var()) // 52
    .replaceAll('<RIVAL>',  ti.var()) // 53
    .replaceAll('<TARGET>', ti.var()) // 59
    .replaceAll('<USER>',   ti.var()) // 5A
  ) : s;
  s = isGen3 ? (s
    .replaceAll(/(\[DYNAMIC \d+\])/gu, ti.var()) // F7 xx
    .replaceAll(/(\[(?:(?:[ABLR]|START|SELECT)_BUTTON|DPAD_(?:UP|DOWN|LEFT|RIGHT|UPDOWN|LEFTRIGHT|NONE))\])/gu, ti.var()) // F8 xx
    .replaceAll(/(\[EMOJI_[^\]]+?\])/gu, ti.var()) // F9 D0 - F9 FE

    .replaceAll('[NOP]', ti.var()) // FC 00 (no-op; in Western RS only, it's used to shorten city/town names in the Trainer's Eyes feature of the PokéNav, and as a placeholder for one-digit numbers in Contests)
    .replaceAll(/(\[COLOR [^\]]+?\])/gu, ti.func()) // FC 01 xx
    .replaceAll('[COLOR]', ti.func()) // FC 01
    .replaceAll(/(\[HIGHLIGHT [^\]]+?\])/gu, ti.func()) // FC 02 xx
    .replaceAll(/(\[SHADOW [^\]]+?\])/gu, ti.func()) // FC 03 xx
    .replaceAll(/(\[COLOR_HIGHLIGHT_SHADOW [^\]]+?\])/gu, ti.func()) // FC 04 xx xx xx
    .replaceAll(/(\[PALETTE [^\]]+?\])/gu, ti.func()) // FC 05 xx
    .replaceAll(/(\[(?:FONT [^\]]+?|FONT_[^\]]+?)\])/gu, ti.func()) // FC 06 xx
    .replaceAll(/(\[PAUSE \d+\])/gu, ti.func()) // FC 08 xx
    .replaceAll('[PAUSE_UNTIL_PRESS]', ti.func()) // FC 09 xx
    .replaceAll('[WAIT_SE]', ti.func()) // FC 0A xx
    .replaceAll(/(\[PLAY_BGM [^\]]+?\])/gu, ti.func()) // FC 0B xx
    .replaceAll(/(\[ESCAPE \d+\])/gu, ti.var()) // FC 0C xx
    .replaceAll(/(\[PLAY_SE [^\]]+?\])/gu, ti.func()) // FC 10 xx
    .replaceAll(/(\[CLEAR \d+\])/gu, ti.func()) // FC 11 xx
    .replaceAll(/(\[CLEAR_TO \d+\])/gu, ti.func()) // FC 13 xx
    .replaceAll(/(\[MIN_LETTER_SPACING \d+\])/gu, ti.func()) // FC 14 xx
    .replaceAll('[PAUSE_MUSIC]', ti.func()) // FC 17
    .replaceAll('[RESUME_MUSIC]', ti.func()) // FC 18

    .replaceAll('[PLAYER]', ti.var()) // FD 01
    .replaceAll('[STR_VAR_1]', ti.var()) // FD 02
    .replaceAll('[STR_VAR_2]', ti.var()) // FD 03
    .replaceAll('[STR_VAR_3]', ti.var()) // FD 04
    .replaceAll('[RIVAL]', ti.var()) // FD 06 (FRLG)
    .replaceAll(/(\[B_[^\]]+?\])/gu, ti.var()) // FD xx (battle string placeholders)
  ) : s;
  s = isGen4 ? (s
    .replaceAll(/\[(VAR 013[2-9A-B][^\]]+?\])/gu, ti.var('[Digit]'))
    .replaceAll(/\[(VAR (?:0[1346]|34)[^\]]+?\])/gu, ti.var('[Name]'))
    .replaceAll(/\[(VAR 02[^\]]+?\])/gu, ti.func('[Ctrl1]'))
    .replaceAll(/\[(VAR FF[^\]]+?\])/gu, ti.func('[Ctrl2]'))
  ) : s;
  s = isModern ? (s
    .replaceAll(/\[(VAR 01[^\]]+?\])/gu, ti.var('[Name]'))
    .replaceAll(/\[(VAR 02[^\]]+?\])/gu, ti.var('[Digit]'))
    .replaceAll(/\[(VAR 1[0-9A][^\]]+?\])/gu, ti.func('[Grm]'))
    .replaceAll(/\[(VAR BD[^\]]+?\])/gu, ti.func('[Ctrl1]'))
    .replaceAll(/\[(VAR BE[^\]]+?\])/gu, ti.func('[Ctrl2]'))
  ) : s;
  s = (isBDSP || isChampions || isMasters) ? (s
    .replaceAll(/\[((?:Name:.+?|DE:ItemAcc(?:Classified)?) [^[]*?\])/gu, ti.var('[Name]'))
    .replaceAll(/\[(Digit:.+? [^[]*?\])/gu, ti.var('[Digit]'))
    .replaceAll(/\[((?:Grm:|(?:JP|EN|FR|IT|DE|ES|Kor|SC):Force).+? [^[]*?\])/gu, ti.func('[Grm]'))
    .replaceAll(/\[(Ctrl1:.+? [^[]*?\])/gu, ti.func('[Ctrl1]'))
    .replaceAll(/\[(Ctrl2:.+? [^[]*?\])/gu, ti.func('[Ctrl2]'))
    .replaceAll(/\[(PKB:.+? [^[]*?\])/gu, ti.func('[PKB]'))
  ) : s;
  s = isDreamRadar ? (s
    .replaceAll(/\[(VAR 02[^\]]+?\])/gu, ti.var('[Character]'))
    .replaceAll(/\[(VAR 03[^\]]+?\])/gu, ti.var('[Digit]'))
    .replaceAll(/\[(VAR 04[^\]]+?\])/gu, ti.var('[Name]'))
  ) : s;
  s = (s
    .replaceAll('[NULL]', ti.class('null', 'null'))
    .replaceAll('[COMP]', ti.class('var', 'func compressed'))
    .replaceAll(/\[VAR [^\]]+?\]/gu, ti.var())
    .replaceAll(/\[WAIT [\d.]+\]/gu, ti.class('var', 'func wait'))
    .replaceAll(/\[SFX [\d.]+\]/gu, ti.class('var', 'func sfx')) // BDSP
    .replaceAll(/\[~ \d+\]/gu, ti.class('var', 'unused'))
    .replaceAll(/\{([^|}]+)\|([^|}]+)\}/gu, (_, base: string, ruby: string) => ti.html(`<ruby>${base}<rp>(</rp><rt>${ruby}</rt><rp>)</rp></ruby>`)) // Switch furigana
  );
  //#endregion

  // Format literals
  s = s.replaceAll(/\u{F1102}([^\u{F1102}]*?)\u{F1105}([^\u{F1102}]*?)\u{F1103}/gu, (_, code: string, content: string) => ti.asLiteral(code, ti.applyInner(content)));

  // Replace placeholders with literal characters
  s = (s
    .replaceAll('\u{F0100}', '\\')
    .replaceAll('\u{F0100}', '\\')
    .replaceAll('\u{F0102}', '[')
    .replaceAll('\u{F0104}', '{')
  );
  s = escapeHTML(s);
  s = isModern ? postprocessSpeaker(s) : s;

  // Substitute all text info
  s = ti.apply(multiLine(s));
  s = (s
    .replaceAll(/(\s+)$/gu, '<span class="whitespace-trailing">$1</span>') // Trailing whitespace
    .replaceAll(/^(\s+)/gu, '<span class="whitespace-leading">$1</span>') // Leading whitespace
    .replaceAll(BR, '<br>')
  );
  return s;
}
