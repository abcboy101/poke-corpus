import { LanguageKey } from '../corpus';
import { genderBranch, genderNumberBranch, grammarBranch, numberBranch } from './branches';
import { TextInfo } from './TextInfo';

export function preprocessStringPokopia(s: string) {
  return (s
    // Whitespace
    .replaceAll('<slide>', '\\r')
    .replaceAll('<clear>', '\\c')
    .replaceAll('<br>', '\\n')
    // .replaceAll('<nbs>', '')  // TODO: determine best representation
    // .replaceAll('<nbs2>', '')
    // .replaceAll('<nbs4>', '')

    // Furigana
    .replaceAll(/<([^:>]+):([^:>]+)>/g, '{$1|$2}')
  );
}

export function postprocessStringPokopia(s: string, language: LanguageKey, ti: TextInfo) {
  const makeRuby = (base: string, ruby: string) => `<ruby>${base}<rp>(</rp><rt>${ruby}</rt><rp>)</rp></ruby>`;
  s = (s
    // Formatting
    .replaceAll(/(<\$cdef\((\d+)\)>)(.*?)(<\/color>)/g, (_, start: string, value: string, children: string, end: string) => ti.as({ kind: 'var', start, className: 'color', style: `color: var(--color-${value})`, children, end })) // font color
    .replaceAll('</color>', ti.func()) // font color (reset)
    .replaceAll(/(<\$textsize\((\d+)\)>)(.*?)(<\/textsize>)/g, (_, start: string, value: string, children: string, end: string) => ti.as({ kind: 'tag', start, className: `text-size-${value}`, children, end })) // font size
    .replaceAll('</textsize>', ti.func()) // font size (reset)

    // Branches
    .replaceAll(/<genruby;-?\d+\(([^,>]*),([^,>]*),([^,>]*),([^,>]*)\)>/g, (code, male: string, female: string, maleRuby: string, femaleRuby: string) => ti.asBranch(code, genderBranch(makeRuby(male, maleRuby), makeRuby(female, femaleRuby))))
    .replaceAll(/<gen;-?\d+\(([^,>]*),([^,>]*)(?:,([^,>]*))?\)>/g, (code, male: string, female: string, neuter?: string) => ti.asBranch(code, genderBranch(male, female, neuter ?? '')))
    .replaceAll(/<qty;-?\d+\(([^,>]*),([^,>]*)\)>/g, (code, singular: string, plural: string) => ti.asBranch(code, numberBranch(singular, plural)))
    .replaceAll(/<genqty;-?\d+\(([^,>]*),([^,>]*),([^,>]*),([^,>]*)\)>/g, (code, maleSingular: string, femaleSingular: string, malePlural: string, femalePlural: string) => ti.asBranch(code, genderNumberBranch(maleSingular, femaleSingular, malePlural, femalePlural)))
    .replaceAll(/<elis;-?\d+\(([^,>]*),([^,>]*)\)>/g, (code, no: string, yes: string) => ti.asBranch(code, grammarBranch(no, yes)))

    // Grammar
    // TODO: check values in Pokopia
    .replaceAll(/<(dart)\b[^>]*>/g, ti.var('<dart>'))
    .replaceAll(/<(iart)\b[^>]*>/g, ti.var('<iart>'))
    .replaceAll(/<(fra)\b[^>]*>/g, ti.var('<fra>'))
    .replaceAll(/<(frdedef)\b[^>]*>/g, ti.var('<frdedef>'))
    .replaceAll(/<(frde)\b[^>]*>/g, ti.var('<frde>'))
    .replaceAll(/<(frque)\b[^>]*>/g, ti.var('<frque>'))
    .replaceAll(/<(frdemdet)\b[^>]*>/g, ti.var('<frdemdet>')) // "ce", "cet", "cette", "ces"
    .replaceAll(/<(itdi)\b[^>]*>/g, ti.var('<itdi>'))
    .replaceAll(/<(itsu)\b[^>]*>/g, ti.var('<itsu>'))
    .replaceAll(/<(ita)\b[^>]*>/g, ti.var('<ita>'))
    .replaceAll(/<(itin)\b[^>]*>/g, ti.var('<itin>'))
    .replaceAll(/<(ited)\b[^>]*>/g, ti.var('<ited>'))
    .replaceAll(/<(itad)\b[^>]*>/g, ti.var('<itad>'))
    .replaceAll(/<(itdemdet)\b[^>]*>/g, ti.var('<itdemdet>'))
    .replaceAll(/<(accdart)\b[^>]*>/g, ti.var('<accdart>'))
    .replaceAll(/<(acciart)\b[^>]*>/g, ti.var('<acciart>'))
    .replaceAll(/<(esde)\b[^>]*>/g, ti.var('<esde>'))
    .replaceAll(/<(esa)\b[^>]*>/g, ti.var('<esa>'))
    .replaceAll(/<(esye)\b[^>]*>/g, ti.var('<esye>'))
    .replaceAll(/<(esou)\b[^>]*>/g, ti.var('<esou>'))
    .replaceAll(/<(ko)\b[^>]*>/g, ti.var('<ko>'))

    // Force
    .replaceAll(/<(fgen)\b[^>]*>/g, ti.func('<fgen>'))
    .replaceAll(/<(fqty)\b[^>]*>/g, ti.func('<fqty>'))
    .replaceAll(/<(fcap)\b[^>]*>/g, ti.func('<fcap>'))
    .replaceAll(/<(flow)\b[^>]*>/g, ti.func('<flow>'))
    .replaceAll(/<(acc)\b[^>]*>/g, ti.func('<acc>'))
    .replaceAll(/<(class)\b[^>]*>/g, ti.func('<class>'))
    .replaceAll(/<(accclass)\b[^>]*>/g, ti.func('<accclass>'))
    .replaceAll(/<(indirect)\b[^>]*>/g, ti.func('<indirect>'))

    // Functions
    .replaceAll(/<(wait\(\d+\.\d+\))>/g, ti.class('var', 'func wait'))
    .replaceAll(/<(\$voice)\b[^>]*>/g, ti.func('<$voice>'))
    .replaceAll(/<(\$voicel)\b[^>]*>/g, ti.func('<$voicel>'))
    .replaceAll(/<(\$voice3d)\b[^>]*>/g, ti.func('<$voice3d>'))
    .replaceAll(/<(\$motion)\b[^>]*>/g, ti.func('<$motion>'))
    .replaceAll(/<(\$lookat)\b[^>]*>/g, ti.func('<$lookat>'))
    .replaceAll(/<(\$comeff)\b[^>]*>/g, ti.func('<$comeff>'))
    .replaceAll(/<(\$facial)\b[^>]*>/g, ti.func('<$facial>'))
    .replaceAll(/<(\$kfacial)\b[^>]*>/g, ti.func('<$kfacial>'))
    .replaceAll(/<(\$emotion)\b[^>]*>/g, ti.func('<$emotion>'))
    .replaceAll(/<(\$motionoff)\b[^>]*>/g, ti.func('<$motionoff>'))
    .replaceAll(/<(\$voicev)\b[^>]*>/g, ti.func('<$voicev>'))
    .replaceAll(/<(\$padvib)\b[^>]*>/g, ti.func('<$padvib>'))
    .replaceAll(/<(\$padvibstp)\b[^>]*>/g, ti.func('<$padvibstp>'))
    .replaceAll(/<(turn)\b[^>]*>/g, ti.func('<turn>'))
    .replaceAll(/<(oneline)\b[^>]*>/g, ti.func('<oneline>'))
    .replaceAll(/<(\$se2d)\b[^>]*>/g, ti.func('<$se2d>'))
    .replaceAll(/<(\$comcan)\b[^>]*>/g, ti.func('<$comcan>'))
    .replaceAll(/<(waitactor)\b[^>]*>/g, ti.func('<waitactor>'))
    .replaceAll(/<(\$voicetonevar)\b[^>]*>/g, ti.func('<$voicetonevar>'))

    // Variables
    .replaceAll(/<([^>]+)>/g, (start: string, tag: string) => ti.var(`<${(/^[^;()>]+/.exec(tag) ?? '')[0]}>`)(start))
  );
  return s;
}
