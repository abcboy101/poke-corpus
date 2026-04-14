import { LanguageKey } from "./corpus";

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

/* Looks up the speaker's name by index, and append it to the string. */
export function replaceSpeaker(s: string, speakerNames: readonly string[], language: LanguageKey) {
  return s.replace(/(\[VAR 0114\(([0-9A-F]{4})\)\]|\[Name:TrainerNameField Idx="(\d+)" \])$/, (_, tag: string, speakerIndexHex?: string, speakerIndexDecimal?: string) => {
    const speakerIndex = speakerIndexHex !== undefined ? parseInt(speakerIndexHex, 16) : Number(speakerIndexDecimal);
    const speakerName = speakerNames[speakerIndex];
    return `\uE701${tag.replaceAll('[', '\\[')}\uE700${speakerName}${speakerDelimiter(language)}`;
  });
}

/* Converts the speaker's name to basic HTML. */
export function postprocessSpeaker(s: string) {
  const match = /\uE701([^\uE700]+)\uE700(.+)$/.exec(s);
  if (match === null)
    return s;
  const [, tag, name] = match;
  return `<text-info class="speaker" data-start="${tag}">${name}</text-info>`.concat(s.substring(0, match.index));
}

export function getSpeaker(s: string) {
  const match = s.match(/\uE701[^\uE700]+\uE700.+$/g);
  return match === null ? null : [match[1], match[2]] as const;
}
