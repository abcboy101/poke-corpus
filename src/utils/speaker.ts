import { SearchParamsFactory } from "../utils/searchParams";
import { CollectionKey, LanguageKey } from "./corpus";

function speakerDelimiter(language: LanguageKey) {
  switch (language) {
    case 'ja-Hrkt':
    case 'ja':      return '『';
    case 'fr':      return ' : ';    // space before and after colon
    case 'zh-Hans': return '\uFF1A'; // fullwidth colon
    case 'zh-Hant': return '「';
    default:        return ': ';
  }
}

/* Extracts the lines containing speaker names from a file. */
export function extractSpeakers(speakerData: readonly string[], textFile: string) {
  return speakerData.map((data) => {
    const lines = data.split(/\r\n|\n/);
    const start = lines.indexOf(`Text File : ${textFile}`) + 2;
    const end = lines.indexOf('~~~~~~~~~~~~~~~', start);
    return lines.slice(start, end);
  });
}

/* Looks up the speaker's name by index, and prepend it to the string. */
export function replaceSpeaker(s: string, speakerNames: readonly string[]) {
  return s.replace(/(.*?)(\[VAR 0114\(([0-9A-F]{4})\)\]|\[Name:TrainerNameField Idx="(\d+)" \])(?:$|(?=\u{F0000}))/u, (_, rest: string, tag: string, speakerIndexHex?: string, speakerIndexDecimal?: string) => {
    const speakerIndex = speakerIndexHex !== undefined ? parseInt(speakerIndexHex, 16) : Number(speakerIndexDecimal);
    const speakerName = speakerNames[speakerIndex];
    return `${tag}\u{F1100}${speakerName}\u{F1101}${rest}`;
  });
}

/* Converts the speaker's name to basic HTML. */
export function postprocessSpeaker(s: string, language: LanguageKey) {
  return s.replaceAll(/^(.+)\u{F1100}(.+?)\u{F1101}/gu, `<a class="speaker" data-var="$1">$2${speakerDelimiter(language)}</a>`);
}

/* Converts the speaker's name to a context-dependent link. */
export function expandSpeakers(s: string, factory: SearchParamsFactory, collection: CollectionKey, language: LanguageKey, viewSpeaker: string) {
  return s.replaceAll(/<a class="speaker" data-var="(.+?)">(.+?)<\/a>/gu, (_, speakerVar: string, speakerName: string) => {
    const hash = factory.searchParamsToHash({
      query: speakerVar,
      type: 'exact',
      caseInsensitive: false,
      common: false,
      script: true,
      showAllLanguages: false,
      collections: [collection],
      languages: [language],
      run: true,
    });
    return `<a class="speaker" href="#${hash}" title="${viewSpeaker}" translate="yes"><span translate="no">${speakerName}</span></a>`;
  });
};
