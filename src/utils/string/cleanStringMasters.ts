import { TextInfo } from './TextInfo';

export function preprocessStringMasters(s: string) {
  return (s
    // Escaped characters
    .replaceAll('\\\\[', '\\[') // literal "["
    .replaceAll('\\\\]', ']') // literal "]"
    .replaceAll('\\\\n', '\\n') // literal "\n", rather than a line feed
  );
}

export function postprocessStringMasters(s: string, ti: TextInfo) {
  return (s
    .replaceAll(/(<attr font=['"]fallback['"]>)(.+?)(<\/attr>)/gu, (_, start: string, children: string, end: string) => ti.as({ kind: 'tag', start, className: 'fallback', children, end })) // font
    .replaceAll(/(<attr color=['"]([0-9A-Fa-f]{6})['"]>)(.+?)(<\/attr>)/gu, (_, start: string, value: string, children: string, end: string) => ti.as({ kind: 'tag', start, className: 'color', style: `color: #${value}`, children, end })) // color
    .replaceAll(/(<attr size=['"](\d+?)['"]>)(.+?)(<\/attr>)/gu, (_, start: string, value: string, children: string, end: string) => ti.as({ kind: 'tag', start, style: `font-size: ${value}px`, children, end })) // size
    .replaceAll(/(<attr color=['"]([0-9A-Fa-f]{6})['"] size=['"](\d+?)['"]>)(.+?)(<\/attr>)/gu, (_, start: string, color: string, size: string, children: string, end: string) => ti.as({ kind: 'tag', start, className: 'color', style: `color: #${color}; font-size: ${size}px`, children, end })) // color, size
    .replaceAll(/(<attr size=['"](\d+?)['"] height=['"](\d+?)['"]>)(.+?)(<\/attr>)/gu, (_, start: string, size: string, height: string, children: string, end: string) => ti.as({ kind: 'tag', start, style: `font-size: ${size}px; line-height: ${height}px`, children, end })) // size, height
    .replaceAll(/(<\/?div>)/gu, (code) => ti.as({ kind: 'tag', start: code, className: 'control', children: code })) // div (treat as whitespace)
    .replaceAll(/(<span class=""?word"?">)(.+?)(<\/span>)/gu, (_, start: string, children: string, end: string) => ti.as({ kind: 'tag', start, className: 'word', children, end }))
    .replaceAll(/<br>/gu, (code) => ti.as({ kind: 'tag', start: code, className: 'n', children: code }) + '<br>')
  );
}
