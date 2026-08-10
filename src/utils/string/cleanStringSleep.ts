import { LanguageKey } from '../corpus';
import { grammarBranch, numberBranch } from './branches';
import { particlesKO } from './grammar';
import { TextInfo } from './TextInfo';

export function preprocessStringSleep(s: string) {
  return (s
    .replaceAll('&nbsp;', '\u00A0')
  );
}

const locales: Partial<Record<LanguageKey, string>> = {
  'ja': 'ja',
  'en': 'en-US',
  'fr': 'fr-FR',
  'it': 'it-IT',
  'de': 'de-DE',
  'es': 'es-ES',
  'ko': 'ko-KR',
  'zh-Hant': 'zh-TW',
};

function formatDateOld(time: number, language: LanguageKey = 'en') {
  // PHP-style date format previously used in news posts
  const format: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  const textContent = new Intl.DateTimeFormat(locales[language] ?? 'en-US', format).format(new Date(time * 1000));
  return `<time data-time="${time}">${textContent}</time>`;
}

function formatDate(time: number, format: number, rawDate: number, language: LanguageKey = 'en') {
  // Date.js format used in news posts
  const formats: Intl.DateTimeFormatOptions[] = [
    { year: 'numeric', month: 'numeric', day: 'numeric' }, // 0
    { year: 'numeric', month: 'long', day: 'numeric' }, // 1
    { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }, // 2
    { month: 'long', day: 'numeric' }, // 3
    { month: 'long', day: 'numeric', weekday: 'short' }, // 4
    { month: 'long', day: 'numeric', weekday: 'short' }, // 5
    { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }, // 6
    { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }, // 7
  ];
  const textContent = new Intl.DateTimeFormat(
    locales[language] ?? 'en-US',
    { ...formats[format], timeZone: rawDate === 1 ? 'UTC' : undefined }
  ).format(new Date(time * 1000));
  return `<time data-time="${time}" data-format="${format}" data-raw-date="${rawDate}">${textContent}</time>`;
}

export function postprocessStringSleep(s: string, language: LanguageKey, ti: TextInfo) {
  return (s
    .replaceAll(/\[Name:[^ ]+ [^[]*?\]/g, ti.var('[Name]'))
    .replaceAll(/\[Digit:Digit\d+ [^[]*?\]/g, ti.var('[Digit]'))
    .replaceAll(/\[(?:EN|FR|IT|DE|ES):Qty (?:S="([^"]*)" )?(?:P="([^"]*)" )?(?:idx="\d+" )?\]/g, (code, singular?: string, plural?: string) => ti.asBranch(code, numberBranch(singular ?? '', plural ?? '')))
    .replaceAll(/\[Kor:Particle type="(\d+)" ?\]/g, (code, type: string) => ti.asBranch(code, grammarBranch(...particlesKO[+type])))
    .replaceAll(/\[Date:[^ ]+ [^[]*?\]/g, ti.var('[Date]'))
    .replaceAll(/(\[Style:FontSize (?:idx="\d+" )?\])(.+?)(\[\/Style:FontSize \])/g, (_, start: string, children: string, end: string) => ti.as({ kind: 'tag', start, style: `font-size: 80%`, children, end }))
    .replaceAll(/\[News:[^ ]+ [^[]*?\]/g, ti.var('[News]'))

    .replaceAll(/<\/?(?:b|strong) *>/gi, (code: string) => ti.html(code)) // b, i
    .replaceAll(/<i data-time="(\d+)"><\/i>/g, (code, time: string) => ti.asLiteral(code, formatDateOld(+time, language)))
    .replaceAll(/<i data-time="(\d+)" data-format="(\d+)" data-raw-date="(\d+)"><\/i>/g, (code, time: string, format: string, rawDate: string) => ti.asLiteral(code, formatDate(+time, +format, +rawDate, language)))
    .replaceAll(/<br>/g, (code) => ti.as({ kind: 'tag', start: code, className: 'n', children: code }) + '\x83')
  );
}
