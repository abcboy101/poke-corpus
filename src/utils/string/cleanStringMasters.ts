/* eslint-disable @typescript-eslint/no-unsafe-argument */
export function preprocessStringMasters(s: string) {
  return (s
    // Escaped characters
    .replaceAll('\\\\[', '\\[') // literal "["
    .replaceAll('\\\\]', ']') // literal "]"
    .replaceAll('\\\\n', '\\n') // literal "\n", rather than a line feed
  );
}

export function postprocessStringMasters(s: string) {
  return (s
    .replaceAll(/\u{F0106}attr font=['"]fallback['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span class="fallback">$1</span>') // font
    .replaceAll(/\u{F0106}attr color=['"]([0-9A-Fa-f]{6})['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span class="color" style="color: #$1">$2</span>') // color
    .replaceAll(/\u{F0106}attr size=['"](\d+?)['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span style="font-size: $1px">$2</span>') // size
    .replaceAll(/\u{F0106}attr color=['"]([0-9A-Fa-f]{6})['"] size=['"](\d+?)['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span class="color" style="color: #$1; font-size: $2px">$3</span>') // color
    .replaceAll(/\u{F0106}attr size=['"](\d+?)['"] height=['"](\d+?)['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span style="font-size: $1px; line-height: $2px">$3</span>') // size, height
    .replaceAll(/(\u{F0106}\/?div\u{F0107})/gu, '<span class="control">$1</span>') // div (treat as whitespace)
    .replaceAll(/\u{F0106}span class=""?word"?"\u{F0107}/gu, '<span class="word">')
    .replaceAll(/\u{F0106}\/span\u{F0107}/gu, '</span>')
    .replaceAll(/\u{F0106}br\u{F0107}/gu, '<br>')
  );
}
