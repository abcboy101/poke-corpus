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
  const grammar: Record<string, Record<string, string[] | undefined> | string[] | undefined> = {
    // Definite/indefinite articles
    dart: {
      en: ["", "the"],
      fr: ["", "le", "l'", "la", "les"],
      it: ["", "il", "l'", "lo", "la", "i", "gli", "le"],
      de: ["", "der", "die", "das"],
      es: ["", "el", "la", "los", "las"],
    },
    iart: {
      en: ["", "a", "an"],
      fr: ["", "un", "une", "des"],
      it: ["", "un", "uno", "una", "un'", "dei", "degli", "delle", "del", "dell'", "dello", "della"],
      de: ["", "ein", "eine"],
      es: ["", "un", "una", "unos", "unas"],
    },

    // Korean
    ko:       ["", "는", "은", "를", "을", "가", "이", "와", "과", "으", "야", "아"], // handled in cleanStringPost

    // French
    fra:      ["à", "au", "à l'", "à la", "aux"],
    frde:     ["", "de", "d'"],
    frdedef:  ["de", "d'", "du", "de l'", "de la", "des"],
    frdemdet: ["", "ce", "cet", "cette", "ces"],
    frque:    ["", "que", "qu'"],
    frstgind: ["à ", "sur l'"],

    // German
    accdart:  ["", "den", "die", "das"],
    acciart:  ["", "einen", "eine", "ein"],

    // Italian
    ita:      ["a", "al", "all'", "allo", "alla", "ai", "agli", "alle"],
    itad:     ["", "a", "ad"],
    itdemdet: ["", "quel", "quell'", "quello", "quella", "quei", "quegli", "quelle"],
    itdi:     ["di", "del", "dell'", "dello", "della", "dei", "degli", "delle"],
    ited:     ["", "e", "ed"],
    itin:     ["in", "nel", "nell'", "nello", "nella", "nei", "negli", "nelle"],
    itsu:     ["su", "sul", "sull'", "sullo", "sulla", "sui", "sugli", "sulle"],

    // Spanish
    esa:      ["a", "al", "a la", "a los", "a las"],
    esde:     ["de", "del", "de la", "de los", "de las"],
    esou:     ["", "o", "u"],
    esye:     ["", "y", "e"],
  } as const;

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
    .replaceAll(/(<fcap>)?<(dart|iart|fra|frdedef|frde|frque|frdemdet|itdi|itsu|ita|itin|ited|itad|itdemdet|accdart|acciart|esde|esa|esye|esou|frstgind)\b[^>]*>/g, (code, fcap: string | undefined, tag: string) => {
      const entry = grammar[tag] ?? [];
      const forms = Array.isArray(entry) ? entry : (entry[language] ?? []);
      const space = tag !== 'frstgind'; // only French stage indirect includes a space already
      for (let i = 0; i < forms.length; i++) {
        if (forms[i].length === 0)
          continue;
        if (fcap) // capitalize first letter
          forms[i] = forms[i][0].toUpperCase() + forms[i].substring(1);
        if (space && forms[i].at(-1) !== "'") // following space
          forms[i] += ' ';
      }
      return ti.asBranch(code, grammarBranch(...forms));
    })

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
    .replaceAll(/<(?!ko\b)([^>]+)>/g, (start: string, tag: string) => ti.var(`<${(/^[^;()>]+/.exec(tag) ?? '')[0]}>`)(start)) // pass <ko> through
  );
  return s;
}
