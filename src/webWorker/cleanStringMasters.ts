import { genderBranch, numberBranch } from "./cleanString";

export function preprocessStringMasters(s: string, language: string) {
  switch (language) {
    default:
      return s;
  }
}

export function postprocessStringMasters(s: string) {
  return (s
    // Tags
    .replaceAll(/\u{F0106}attr font=['"]fallback['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span class="fallback">$1</span>') // font
    .replaceAll(/\u{F0106}attr color=['"]([0-9A-Fa-f]{6})['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span class="color" style="color: #$1">$2</span>') // color
    .replaceAll(/\u{F0106}attr size=['"](\d+?)['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span style="font-size: $1px">$2</span>') // size
    .replaceAll(/\u{F0106}attr color=['"]([0-9A-Fa-f]{6})['"] size=['"](\d+?)['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span class="color" style="color: #$1; font-size: $1px">$2</span>') // color
    .replaceAll(/\u{F0106}attr size=['"](\d+?)['"] height=['"](\d+?)['"]\u{F0107}(.+?)\u{F0106}\/attr\u{F0107}/gu, '<span style="font-size: $1px; line-height: $2px">$3</span>') // size, height
    .replaceAll(/(\u{F0106}\/?div\u{F0107})/gu, '<span class="div">$1</span>') // div (treat as whitespace)
    .replaceAll(/\u{F0106}span class=""?word"?"\u{F0107}/gu, '<span class="word">')
    .replaceAll(/\u{F0106}\/span\u{F0107}/gu, '</span>')
    .replaceAll(/\u{F0106}br\u{F0107}/gu, '<br>')

    // Escaped characters
    .replaceAll(/\u{F0100}\[/gu, '\u{F0102}') // literal "["
    .replaceAll(/\u{F0100}\]/gu, ']') // literal "]"
    .replaceAll(/(\u{F0100}n)/gu, '<span class="literal n">$1</span><br>') // literal "\n", rather than a line feed

    // Variables
    .replaceAll(/\[[A-Za-z]+?:Gen Ref="255" M="([^"]*?)" F="([^"]*?)" \]/gu, (_, male, female) => genderBranch(male, female))
    .replaceAll(/\[[A-Za-z]+?:Gen Ref="255" M="([^"]*?)" \]/gu, (_, male) => genderBranch('', male))
    .replaceAll(/\[[A-Za-z]+?:Gen Ref="255" F="([^"]*?)" \]/gu, (_, female) => genderBranch('', female))
    .replaceAll(/\[[A-Za-z]+?:Qty (?:Ref="\d+" )?S="([^"]*?)" P="([^"]*?)" \]/gu, (_, singular, plural) => numberBranch(singular, plural))
    .replaceAll(/\[[A-Za-z]+?:Qty (?:Ref="\d+" )?S="([^"]*?)" \]/gu, (_, singular) => numberBranch(singular, ''))
    .replaceAll(/\[[A-Za-z]+?:Qty (?:Ref="\d+" )?P="([^"]*?)" \]/gu, (_, plural) => numberBranch('', plural))
    .replaceAll(/(\[(?:Name:.+?|Digit:.+?|Kor:Particle) [^[]*?\])/gu, '<span class="var">$1</span>')
  );
}
