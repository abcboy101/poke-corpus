import { grammarBranch, numberBranch } from './branches';
import { particlesKO } from './grammar';
import { TextInfo } from './TextInfo';

export function preprocessStringTCGPocket(s: string) {
  return (s
    // Private use characters
    .replaceAll('\uE020', 'ᵉ') // Superscript e
    .replaceAll('\uE021', 'ᵉʳ') // Superscript er
    .replaceAll('\uE022', 'ʳᵉ') // Superscript re

    // Special characters
    .replaceAll(/\[C:Tab(?: [^[]*?)?\]/g,   '\t')
    .replaceAll(/\[C:Lsb(?: [^[]*?)?\]/g,   '\\[') // left square bracket
    .replaceAll(/\[C:Rsb(?: [^[]*?)?\]/g,   ']') // right square bracket
    .replaceAll(/\[C:Nbsp(?: [^[]*?)?\]/g,  '\u00A0') // non-breaking space
    .replaceAll(/\[C:Nbh(?: [^[]*?)?\]/g,   '\u2011') // non-breaking hyphen
    .replaceAll(/\[C:Nnbsp(?: [^[]*?)?\]/g, '\u202F') // narrow non-breaking space
    .replaceAll(/\[Text:Char v="DIAMOND" ?\]/g, '♦')
    .replaceAll(/\[Text:Char v="THREE-PER-EM-SPACE" ?\]/g, '\u2004')

    // Escaped characters
    .replaceAll('[[', '\\[') // literal "["
    .replaceAll(']]', ']') // literal "["

    .replaceAll(/(\[Ctrl:(?:OL|LI) ?\])\\n/g, '$1')
    .replaceAll(/\\n(\[\/Ctrl:(?:OL|LI) ?\])/g, '$1')
  );
}

const particlesKONames = ["", "eun_neun", "eul_reul", "i_ga", "gwa_wa", "eu_", "i_"];

export function postprocessStringTCGPocket(s: string, ti: TextInfo) {
  return (s
    // Variables
    .replaceAll(/\[Num:Int ([^[]*)visible="0" ?([^[]*)\]/g, ti.func('[Num]'))
    .replaceAll(/\[Num:Int ([^[]*)plural_only="([^"]*)" ?([^[]*)\]/g, (code, params1: string, suffix: string, params2: string) =>
      ti.as({ start: code, kind: 'var', content: `<span class="var branch plural"><span class="long">[Num:Int ${params1}${params2}]</span><span class="short">[Num]</span>${suffix}</span>` })
    )
    .replaceAll(/\[Text:SpecialCondition( [^[]*?)v0="([^"]*)" v1="([^"]*)"( [^[]*?)\]/g, (code, params1: string, v0: string, v1: string, params2: string) => {
      // Asleep ("schläft") is a noun rather than a past participle, so a different sentence structure is required
      const placeholder = `<span class="var"><span class="long">[Text:SpecialCondition${params1}${params2}]</span><span class="short">[Text]</span></span>`;
      return ti.asBranch(code, grammarBranch(v0.replaceAll('{}', placeholder), v1.replaceAll('{}', placeholder)));
    })
    .replaceAll(/\[Num:(?:Int|Float)(?: [^[]*?)?\]/g, ti.var('[Num]'))
    .replaceAll(/\[Date:DateTime(?: [^[]*?)?\]/g, ti.var('[Date]'))
    .replaceAll(/\[Mst:[^ ]+(?: [^[]*?)?\]/g, ti.var('[Mst]'))
    .replaceAll(/\[Str:[^ ]+(?: [^[]*?)?\]/g, ti.var('[Str]'))
    .replaceAll(/\[Text:[^ ]+(?: [^[]*?)?\]/g, ti.var('[Text]'))

    // Grammar
    .replaceAll(/\[Gr:Count ([^[]*?)\]/g, (code, params: string) => {
      const args: Record<string, string | undefined> = Object.fromEntries(params.matchAll(/(\S+)="([^"]*)"/g).map(([, k, v]) => [k, v] as const).filter(([, v]) => v.length > 0 && v !== '$no'));
      return ti.asBranch(code, numberBranch(args.s ?? args.one ?? '', args.p ?? '', '', args.two ?? ''));
    })
    .replaceAll(/\[Gr:Patchim v="([^"]*)" ?\]/g, (code, v: string) => {
      const index = particlesKONames.indexOf(v);
      const particles = index === -1 ? v.split('/') : particlesKO[index];
      return ti.asBranch(code, grammarBranch(...particles));
    })
    .replaceAll(/\[Gr:Pron v="([^"]*)" ?\]/g, ti.func('[Gr]'))

    // Image
    .replaceAll(/\[Img:Element id="(\d+)" ?\]/g, (code, id: string) => ti.asLiteral(code, `<span class="var">{${id}}</span>`))
    .replaceAll(/\[Img:Element name="([^"]*)" ?\]/g, (code, name: string) => ti.asLiteral(code, `{${name}}`))
    .replaceAll(/\[Img:ex ?\]/g, ti.literal('ex'))

    // Control
    .replaceAll(/\[Ctrl:Bold(?: [^[]*?)?\]/g, ti.html('<b>'))
    .replaceAll(/\[\/Ctrl:Bold(?: [^[]*?)?\]/g, ti.html('</b>'))
    .replaceAll(/\[Ctrl:Italic(?: [^[]*?)?\]/g, ti.html('<i>'))
    .replaceAll(/\[\/Ctrl:Italic(?: [^[]*?)?\]/g, ti.html('</i>'))
    .replaceAll(/\[Ctrl:OL(?: [^[]*?)?\]\x82?/g, ti.html('<ol>'))
    .replaceAll(/\[\/Ctrl:OL(?: [^[]*?)?\]/g, ti.html('</ol>'))
    .replaceAll(/\[Ctrl:LI(?: [^[]*?)?\]/g, ti.html('<li>'))
    .replaceAll(/\[\/Ctrl:LI(?: [^[]*?)?\]/g, ti.html('</li>'))
    .replaceAll(/(\[Ctrl:NoBreak ?\])(.+?)(\[\/Ctrl:NoBreak ?\])/g, (_, start: string, children: string, end: string) => ti.as({ kind: 'var', start, className: 'no-break', children, end }))

    // Unity rich text tags
    .replaceAll(/<\/?[bi] *>/gi, (code: string) => ti.html(code)) // b, i
    .replaceAll(/(<color="?([^>"]*)"?>)(.*?)(<\/color>|(?=<color=))/g, (_, start: string, value: string, text: string, end: string) => ti.as({ kind: 'tag', start, className: 'color', style: `color: ${value}`, children: text, end })) // color
    .replaceAll(/<\/?(?:size|space|voffset|scale|line-indent)(?:=([^>"]*))?>/gi, ti.control())
    .replaceAll(/<br>/g, '\x83')
  );
}
