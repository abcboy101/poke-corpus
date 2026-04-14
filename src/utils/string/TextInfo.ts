export type TextInfoKind = 'var' | 'whitespace' | 'tag' | 'null' | 'literal';

interface TextInfoEntry {
  span?: undefined,
  kind: TextInfoKind,
  start: string,
  className?: string,
  style?: string,
  content?: string,
  children?: string,
  end?: string,
  short?: string,
}

interface SpanEntry {
  span: true,
  kind?: undefined,
  start?: undefined,
  className?: string,
  style?: string,
  content?: string,
  children?: string,
  end?: undefined,
  short?: undefined,
}

function escape(code: string) {
  return (code
    .replaceAll('\u{F005C}', '\\')
    .replaceAll('\u{F005B}', '[')
    .replaceAll('\u{F007B}', '{')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
  );
}

/**
 * Class used to annotate a string with additional information.
 */
export class TextInfo {
  private counter = 0;
  private data = new Map<string, TextInfoEntry | SpanEntry>();
  private dataHtml = new Map<string, string>();

  private getSigil() {
    let value = this.counter++;
    const sigil = [String.fromCodePoint(0xEF00 | (value & 0xFF))];
    while (value > 0xFF) {
      sigil.push(String.fromCodePoint(0xEF00 | (value & 0xFF)));
      value >>= 8;
    }
    return sigil.join('');
  }

  /**
   * Replaces placeholders with a text-info tag corresponding to the saved annotations.
   */
  public apply(s: string) {
    for (const [tag, sigil] of s.matchAll(/\x9F([\uEF00-\uEFFF]+)/g)) {
      const html = this.dataHtml.get(sigil);
      if (html !== undefined) {
        s = s.replace(tag, html);
        continue;
      }

      const args = this.data.get(sigil);
      const match = new RegExp(`${tag}(.*?)${tag}`, 'u').exec(s);
      if (args === undefined || match === null) {
        continue;
      }

      let children = match[1];
      const { start = '', className = '', style = '', content = '', end = '', short = '', span = false } = args;
      const attributes: readonly [string, string][] = [
        ['class', className],
        ['style', style],
        ['data-start', escape(start)],
        ['data-end', escape(end)],
      ];
      if (children === '') children = content;
      if (short !== '') children = `<span class="long">${children}</span><span class="short">${short}</span>`;
      const element = span ? 'span' : 'text-info';
      s = s.replace(match[0], `<${element} ${attributes.filter(([, value]) => value).map(([name, value]) => `${name}="${value}"`).join(" ")}>${children}</${element}>`);
    }
    return s;
  }

  /**
   * Replaces placeholders with a text-info tag corresponding to the saved annotations.
   */
  public applyInner(s: string) {
    for (const [tag, sigil] of s.matchAll(/\x9F([\uEF00-\uEFFF]+)/g)) {
      const html = this.dataHtml.get(sigil);
      if (html !== undefined) {
        s = s.replace(tag, html);
        continue;
      }

      const args = this.data.get(sigil);
      const match = new RegExp(`${tag}(.*?)${tag}`, 'u').exec(s);
      if (args === undefined || match === null) {
        continue;
      }

      let children = match[1];
      const { content = '', short = '' } = args;
      if (children === '') children = content;
      if (short !== '') children = `<span class="long">${children}</span><span class="short">${short}</span>`;
      s = s.replace(match[0], children);
    }
    return s;
  }

  /**
   * Saves the provided annotations and returns the children marked with placeholders.
   */
  public as(args: TextInfoEntry | SpanEntry) {
    const sigil = this.getSigil();
    this.data.set(sigil, args);
    return `\x9F${sigil}${args.children ?? ''}\x9F${sigil}`;
  }

  /**
   * Saves the provided HTML and returns the placeholder.
   */
  public html(html: string) {
    const sigil = this.getSigil();
    this.dataHtml.set(sigil, html);
    return `\x9F${sigil}`;
  }

  //#region String functions
  public asLiteral(start: string, content: string) {
    return this.as({ start, kind: 'literal', className: 'literal', content });
  }

  public asVarSuffix(start: string, suffix: string, short?: string) {
    return this.as({ start, kind: 'var', className: 'var', content: escape(start) + suffix, short });
  };

  public asFunc(start: string, short?: string) {
    return this.as({ start, kind: 'var', className: 'func', content: escape(start), short });
  };

  public asBranch(start: string, content: string) {
    return this.as({ start, kind: 'var', content });
  }

  public asControl(start: string) {
    return this.as({ start, kind: 'var', className: 'control', content: escape(start) });
  }

  public asWhitespace(kind: 'r' | 'c' | 'n' | 't' | 'e', start = `\\${kind}`) {
    return this.as({ start, kind: 'whitespace', className: kind, content: escape(start) });
  }
  //#endregion

  //#region Factory functions
  public literal(content: string) {
    return (start: string) => this.as({ start, kind: 'literal', className: 'literal', content });
  }

  public literalSmall(content: string) {
    return (start: string) => this.as({ start, kind: 'literal', className: 'literal', content: `<span class="literal-small">${content}</span>` });
  }

  public literalFixed(content: string) {
    return (start: string) => this.as({ start, kind: 'literal', className: 'literal', content: `<span class="literal-small literal-fixed" style="--outer: ${Math.floor(start.length / 4)};">${content}</span>` });
  }

  public var(short?: string) {
    return (start: string) => this.as({ start, kind: 'var', className: 'var', content: escape(start), short });
  };

  public func(short?: string) {
    return (start: string) => this.as({ start, kind: 'var', className: 'func', content: escape(start), short });
  };

  public control() {
    return (start: string) => this.as({ start, kind: 'var', className: 'control', content: escape(start) });
  };

  public class(kind: TextInfoKind, className: string) {
    return (start: string) => this.as({ start, kind, className, content: escape(start) });
  };
  //#endregion
}
