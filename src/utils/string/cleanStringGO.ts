import { LanguageKey } from "../corpus";
import { TextInfo } from "./TextInfo";

//#region Hindi
const NUKTA = '\u093C';
const HALANT = '\u094D';
const JOINER = '[\\u200C\\u200D]';
const CONSONANT = '[\\u0915-\\u0939\\u0958-\\u095F]';
const VOWEL = '[\\u0904-\\u0914]';
const MATRA = '[\\u093E-\\u094C]';

export function preprocessHindi(value: string) {
  // De-duplicate
  value = value.replace(/[\u0901\u0902]{2,}/g, '\u0902'); // chandrabindu overstrike
  value = value.replace(/\u093C{2,}/g, '\u093C'); // consecutive nukta
  value = value.replace(/([\u093E\u0940-\u094C]){2}/g, '$1'); // duplicate vowel marks (except short i)

  // Reorder marks to canonical order, so that the nukta is first
  // consonant + halant + ZWNJ/ZWJ + nukta -> consonant + nukta + halant + ZWNJ/ZWJ
  value = value.replace(new RegExp(`(${HALANT}${JOINER}?|${JOINER}${HALANT})${NUKTA}`, 'gu'), `${NUKTA}$1`);

  // Visually identical
  value = value.replace(/जाेगा/g, 'जोगा'); // jā+e.gā -> jo.gā
  value = value.replace(/हैे/g, 'है'); // hai+e -> hai
  value = value.replace(/पोकेेमॉन/g, 'पोकेमॉन'); // po.ke+e.mo.n -> po.ke.mo.n
  value = value.replace(/ज़रिेए/g, 'ज़रिए'); // za.ri+e.e -> za.ri.e
  value = value.replace(/दिखाेएंगे/g, 'दिखाएंगे'); // di.khā+e.en.ge -> di.khā.en.ge
  value = value.replace(/ े /g, ' '); // stray e in privacy_policy_text

  // Transposed letters
  value = value.replace(/मौजदूा/g, 'मौजूदा'); // mau.ja.dū+a -> mau.jū.da
  value = value.replace(/हाइलािट/g, 'हाइलाइट'); // hā.i.la+i.ṭ -> ha.i.la.i.t
  value = value.replace(/जॉिन/g, 'जॉइन'); // jo+i.n -> jo.i.n

  // Wrong vowel form
  value = value.replace(/लिे/g, 'लिए'); // li+e -> li.e
  value = value.replace(/कोी/g, 'कोई'); // ko+ī -> ko.ī
  value = value.replace(/(^|\s)िस/g, '$1इस'); // +i.s -> i.s

  // Misplaced halant
  value = value.replace(/हू्ं/g, 'हूँ'); // hū*ṁ -> hūm̐
  value = value.replace(/शु्क्रिया/g, 'शुक्रिया'); // śu*kri.yā -> śu.kri.yā
  value = value.replace(/इ्स्तेमाल/g, 'इस्तेमाल'); // i*ste.mā.l -> i.ste.mā.l
  value = value.replace(/अ्च्छा/g, 'अच्छा'); // a*cchā -> a.cchā

  // Extra nukta
  // eslint-disable-next-line regexp/prefer-character-class
  value = value.replace(new RegExp(`(${VOWEL}|${MATRA})${NUKTA}((?:र्)?${CONSONANT}${NUKTA})`, 'gu'), '$1$2'); // extra nukta on preceding vowel
  value = value.replace(/एडवेंचर मो़ड/g, 'एडवेंचर मोड'); // "Adventure Mode" in fitness_enable_modal_success_title
  value = value.replace(/पोकेमॉ़न/g, 'पोकेमॉन'); // "Pokémon" in mega_level_tutorial_page4_body
  value = value.replace(/को़ड/g, 'कोड'); // "code" in passcode_log_received_badge
  value = value.replace(/ताजे़/g, 'ताज़े'); // "tāze" in pokemon_desc_0042
  value = value.replace(/बॉ़डी/g, 'बॉडी'); // "body" in quest_special_dialogue_macht_1_4

  return value;
}
//#endregion

export function preprocessStringGO(s: string, language: LanguageKey) {
  switch (language) {
    case 'hi':
      return preprocessHindi(s);
    default:
      return s;
  }
}

export function postprocessStringGO(s: string, ti: TextInfo) {
  return (s
    // Unity rich text tags
    .replaceAll(/<\/?[bi] *>/gi, (code: string) => ti.html(code)) // b, i
    .replaceAll(/(<size=([^>]*)>)(.*?)(<\/size>|(?=<size=))/g, (_, start: string, value: string, text: string, end: string) => ti.as({ kind: 'tag', start, style: `font-size: ${+value / 32 * 100}%`, children: text, end })) // size
    .replaceAll(/(<color=#\{(\d+)\}>)(.*?)(<\/color>|(?=<color=))/g, (_, start: string, index: string, text: string, end: string) => ti.as({ kind: 'tag', start, className: 'color', style: `color: var(--color-${index})`, children: text, end }))
    .replaceAll(/(<color=([^>]*)>)(.*?)(<\/color>|(?=<color=))/g, (_, start: string, value: string, text: string, end: string) => ti.as({ kind: 'tag', start, className: 'color', style: `color: ${value}`, children: text, end })) // color

    // Links
    .replaceAll(/(<a href="[^"{}]*\{\d+\}[^"{}]*">)(.+?)(<\/a>)/g, (_, start: string, children: string, end: string) => ti.as({ kind: 'tag', start, className: 'link', children, end }))
    .replaceAll(/<a href="(\w+)">/g, (_, url: string) => ti.html(`<a class="link" href="#id=go.${url}" title="${url}">`))
    .replaceAll(/<a href=["“](pokemongolive.com\/[^"”]+)["”]>/g, (_, url: string) => ti.html(`<a class="link" href="http://${url}" title="${url}" target="_blank" rel="external noopener noreferrer nofollow">`))
    .replaceAll(/<a href="+(https?:\/\/[^"]+)"+>/g, (_, url: string) => ti.html(`<a class="link" href="${url}" title="${url}" target="_blank" rel="external noopener noreferrer nofollow">`))
    .replaceAll(/<\/a>/g, (code: string) => ti.html(code))

    // Other tags
    .replaceAll(/<br>/g, '\x83')
    .replaceAll(/<(taunt|intimidate)>/g, ti.func())

    // Substitutions
    .replaceAll(/%BREAK%/g, (code) => `${ti.asFunc(code)}\x83`)
    .replaceAll(/%PLAYERNAME%/g, ti.var())
    .replaceAll(/%(\d+\$)?s/g, ti.var())
    .replaceAll(/\{\d+(?::[^\]]+?)?\}/g, ti.var())
  );
}
