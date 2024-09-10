import {
  remapChineseChars, remapKoreanBraille, remapGBABrailleJapanese, remapGBABrailleWestern,
  preprocessMetadata, postprocessMetadata,
  postprocessString,
} from "./cleanString";

const remapChineseCharsTestCases = [
  ["\uE801\uE802\uE803\uE804", "妙蛙种子"],
  ["\uEA8A\uE824\uEE21\uE824", "捷拉奥拉"],
  ["\uEB10\uEB11\uEB12\uEB13", "妙蛙種子"],
  ["\uED99\uEB33\uEE26\uEB33", "捷拉奧拉"],
];

describe("remapChineseChars", () => {
  test.each(remapChineseCharsTestCases)(
    "%c%s", (privateUse, chinese) => {
      const result = remapChineseChars(privateUse);
      expect(result).toEqual(chinese);
    }
  );
});

const remapKoreanBrailleTestCases = [
  ["\u1167\u1100\u1175\u1109\u1165\u0020\u1169\u11AF\u1105\u1161\uAC00\u1105\u1161",
    "여기서 올라가라"],
  ["\u1100\u1102\u1103\u1105\u1106\u1107\u1109\u110C\u110E\u110F\u1110\u1111\u1112",
    "ᄀᅠᄂᅠᄃᅠᄅᅠᄆᅠᄇᅠᄉᅠᄌᅠᄎᅠᄏᅠᄐᅠᄑᅠᄒ"],
  ["\uE0C7",
    "ᄉ"],
  ["\u11A8\u11AB\u11AE\u11AF\u11B7\u11B8\u11BA\u11BC\u11BD\u11BE\u11BF\u11C0\u11C1\u11C2",
    "ᅟᅠᆨᅟᅠᆫᅟᅠᆮᅟᅠᆯᅟᅠᆷᅟᅠᆸᅟᅠᆺᅟᅠᆼᅟᅠᆽᅟᅠᆾᅟᅠᆿᅟᅠᇀᅟᅠᇁᅟᅠᇂ"],
  ["\u1161\u1163\u1165\u1167\u1169\u116D\u116E\u1172\u1173\u1175\u1162",
    "ᅟᅡᅟᅣᅟᅥᅟᅧᅟᅩᅟᅭᅟᅮᅟᅲᅟᅳᅟᅵᅟᅢ"],
  ["\u1164\u1166\u1168\u116A\u116B\u116C\u116F\u1170\u1171\u1174",
    "ᅟᅤᅟᅦᅟᅨᅟᅪᅟᅫᅟᅬᅟᅯᅟᅰᅟᅱᅟᅴ"],
  ["\uE0C0\u0020\uE0C1\u0020\uE0C2\u0020\uE0C3",
    "그래서 그러나 그러면 그러므로"],
  ["\uE0C4\u0020\u11A8\u1169\u0020\uE0C6",
    "그런데 그리고 그리하여"],
  ["\u110E\u116C\u110E\u1169\u1166\u0020\u1109\u1175\u1105\u1161\uCE74\u11AB\\n\uB9C8\u110C\u1175\uB9C8\u11A8\u1166\u0020\u1100\u1169\u1105\u1162\u116A\u11BC\\n\uE0C6\u0020\u1106\u1169\u1103\uC740\u0020\uAC83\u1175\\n\uC5F4\u1105\uC778\uB2E4",
    "최초에 시라칸\\n마지막에 고래왕\\n그리하여 모든 것이\\n열린다"],
  ["\u116E\u1105\u1175\u1103\uC744\uC740\\n\u1175\u0020\u1100\uC6B8\u1166\u1109\u1165\\n\u1109\u1162\u11BC\u1112\u116A\u11AF\uD558\u1106\u1167\\n\uC0AC\u11AF\u1161\u116A\u11BB\uB2E4",
    "우리들은\\n이 굴에서\\n생활하며\\n살아왔다"],
];

describe("remapKoreanBraille", () => {
  test.each(remapKoreanBrailleTestCases)(
    "%c%s", (privateUse, chinese) => {
      const result = remapKoreanBraille(privateUse);
      expect(result).toEqual(chinese);
    }
  );
});

const remapGBABrailleJapaneseTestCases = [
  ["⠈⠡", "キャ"],
  ["⠈⠪", "キョ"],
  ["⠈⠩", "キュ"],
  ["⠈⠱", "シャ"],
  ["⠈⠺", "ショ"],
  ["⠈⠹", "シュ"],
  ["⠈⠑", "リャ"],
  ["⠈⠚", "リョ"],
  ["⠈⠙", "リュ"],
];

describe("remapGBABrailleJapanese", () => {
  test.each(remapGBABrailleJapaneseTestCases)(
    "%c%s", (braille, kana) => {
      const result = remapGBABrailleJapanese(braille);
      expect(result).toEqual(kana);
    }
  );
});

const remapGBABrailleWesternTestCases = [
  ["en", "⠛⠕⠀⠥⠏⠀⠓⠑⠗⠑⠲", "GO UP HERE."],
  ["de", "⠜⠪⠳", "ÄÖÜ"],
  ["en", "⠲\n⠂", ".\n,"], // English
  ["fr", "⠄\n⠂", ".\n,"], // French
  ["it", "⠲\n⠂", ".\n,"], // Italian
  ["de", "⠿⠄\n⠿⠂", ".\n,"], // German
  ["es", "⠿⠄\n⠿⠂", ".\n,"], // Spanish
];

describe("remapGBABrailleWestern", () => {
  test.each(remapGBABrailleWesternTestCases)(
    "%c%c%j", (lang, braille, latin) => {
      const result = remapGBABrailleWestern(braille, lang);
      expect(result).toEqual(latin);
    }
  );
});

const metadataTestCases = [
  ["{誰|だれ}ですか？", "誰ですか？", "だれですか？"],
  ["スター{団|だん}の　{人|ひと}たちって", "スター団の　人たちって", "スターだんの　ひとたちって"],
];

describe("metadata", () => {
  test.each(metadataTestCases)(
    "%s", (s, kanji, kana) => {
      const preprocess = preprocessMetadata(s);
      expect(preprocess).toContain(kanji);
      expect(preprocess).toContain(kana);
      const postprocess = postprocessMetadata(preprocess);
      expect(postprocess).toEqual(s);
    }
  );
});

const postprocessStringTestCases = [
  ["\\\\", "\\"],
  ["\\[]", "[]"],
  ["\\{}", "{}"],
  ["<>", "&lt;&gt;"],
  ["[VAR 0100(0000)]", '<span class="var">[VAR 0100(0000)]</span>'],
  ["{誰|だれ}", '<ruby>誰<rp>(</rp><rt>だれ</rt><rp>)</rp></ruby>'],
];

describe("postprocessString", () => {
  test.each(postprocessStringTestCases)(
    "%j", (s, html) => {
      const result = postprocessString(s, '');
      expect(result).toEqual(html);
    }
  );
});
