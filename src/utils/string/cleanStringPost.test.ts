import { postprocessString } from "./cleanStringPost";
import { convertFurigana } from "../../webWorker/searchWorker";

describe("metadata", () => {
  const metadataTestCases = [
    ["{誰|だれ}ですか？", "誰ですか？", "だれですか？"],
    ["スター{団|だん}の　{人|ひと}たちって", "スター団の　人たちって", "スターだんの　ひとたちって"],
  ];

  test.each(metadataTestCases)(
    "%s", (s, kanji, kana) => {
      const converted = convertFurigana(s);
      expect(converted).toContain(kanji);
      expect(converted).toContain(kana);
      expect(converted).toContain(s);
    }
  );
});

describe("postprocessString", () => {
  const postprocessStringTestCases = [
    ["\\\\", "\\"],
    ["\\[]", "[]"],
    ["\\{}", "{}"],
    ["<>", "&lt;&gt;"],
    ["[VAR 0100(0000)]", '<text-info class="var" data-start="[VAR 0100(0000)]"><span class="long">[VAR 0100(0000)]</span><span class="short">[Name]</span></text-info>'],
    ["{誰|だれ}", '<ruby>誰<rp>(</rp><rt>だれ</rt><rp>)</rp></ruby>'],
  ];

  test.each(postprocessStringTestCases)(
    "%j", (s, html) => {
      const result = postprocessString(s, 'ScarletViolet', 'ja');
      expect(result).toEqual(html);
    }
  );
});
