import { searchParamsToHash } from "../utils/searchParams";

const speakerDelimiters: {[language: string]: string} = {
  'ja-Hrkt': '『',
  'ja': '『',
  'fr': ' : ', // space before and after colon
  'zh-Hans': '\uFF1A', // fullwidth colon
  'zh-Hant': '「',
  // default: ': '
};

function speakerDelimiter(language: string) {
  return speakerDelimiters[language] ?? ': ';
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
export function replaceSpeaker(s: string, speakerNames: string[], language: string) {
  return s.replace(/(.*?)(\[VAR 0114\(([0-9A-F]{4})\)\])(?:$|(?=\u{F0000}))/u, (_, rest, tag, speakerIndexHex) => {
    const speakerIndex = parseInt(speakerIndexHex, 16);
    const speakerName = speakerNames[speakerIndex];
    return `${tag.replaceAll('[', '\\[')}\u{F1100}${speakerName}${speakerDelimiter(language)}\u{F1101}${rest}`;
  });
}

/* Converts the speaker's name to basic HTML. */
export function postprocessSpeaker(s: string) {
  return s.replaceAll(/^(.+)\u{F1100}(.+?)\u{F1101}/gu, '<a class="speaker" data-var="$1">$2</a>');
}

/* Converts the speaker's name to a context-dependent link. */
export function expandSpeakers(s: string, collection: string, language: string, viewSpeaker: string) {
  return s.replaceAll(/<a class="speaker" data-var="(.+?)">(.+?)<\/a>/gu, (_, speakerVar: string, speakerName: string) => {
    const hash = searchParamsToHash({
      query: speakerVar,
      type: 'exact',
      caseInsensitive: false,
      common: false,
      script: true,
      collections: [collection],
      languages: [language],
      run: true,
    });
    return `<a class="speaker" href="#${hash}" title="${viewSpeaker}">${speakerName}</a>`;
  });
};
