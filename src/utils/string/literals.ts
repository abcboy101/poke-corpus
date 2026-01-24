import { CollectionKey, LanguageKey, Literals } from "../corpus";

/** Replaces literals with the corresponding substituted text values for searches. */
export const replaceLiteralsPreFactory = (literalsData: readonly ReadonlyMap<number, string>[], messageIdIndex: number, collectionKey: CollectionKey, languages: readonly LanguageKey[], literals: Literals | undefined) => {
  const isGB = ['RedBlue', 'Yellow', 'GoldSilver', 'Crystal'].includes(collectionKey);
  const indexJA = languages.indexOf('ja-Hrkt');
  return (s: string, languageIndex: number) => {
    if (literals === undefined || languageIndex === messageIdIndex)
      return s;

    // Treat as Japanese instead if kana are present, for untranslated text in other languages
    if (indexJA !== -1 && languageIndex !== indexJA && /[ぁ-んァ-ン]/gu.test(s))
      languageIndex = indexJA;

    for (const [literalId, {branch, line}] of Object.entries(literals)) {
      const searchValue = isGB ? (literalId === '#' ? literalId : `<${literalId}>`) : `[${literalId}]`;
      let replaceValue = undefined;
      switch (branch) {
        case undefined:
          replaceValue = literalsData[languageIndex].get(line);
          break;
        case 'gender':
        case 'version':
          break;
        case 'language':
        {
          const lineNo = line[languages[languageIndex]];
          if (lineNo !== undefined)
            replaceValue = literalsData[languageIndex].get(lineNo);
          break;
        }
        default:
          branch satisfies never;
      }
      if (replaceValue === undefined)
        continue;

      if (isGB)
        replaceValue = replaceValue.replaceAll(/@/gu, '');
      if (collectionKey === 'BattleRevolution')
        replaceValue = replaceValue.substring('[FONT 0][SPACING 1]'.length).trim();

      s = s.replaceAll(searchValue, replaceValue);
    }
    return s;
  };
};

/** Replaces literals with the corresponding substituted text values for rich text display. */
export const replaceLiteralsFactory = (literalsData: readonly ReadonlyMap<number, string>[], messageIdIndex: number, collectionKey: CollectionKey, languages: readonly LanguageKey[], literals: Literals | undefined) => {
  const isGB = ['RedBlue', 'Yellow', 'GoldSilver', 'Crystal'].includes(collectionKey);
  const indexJA = languages.indexOf('ja-Hrkt');
  return (s: string, languageIndex: number) => {
    if (literals === undefined || languageIndex === messageIdIndex)
      return s;

    // Treat as Japanese instead if kana are present, for untranslated text in other languages
    if (indexJA !== -1 && languageIndex !== indexJA && /[ぁ-んァ-ン]/gu.test(s))
      languageIndex = indexJA;

    for (const [literalId, {branch, line}] of Object.entries(literals)) {
      const searchValue = isGB ? (literalId === '#' ? literalId : `<${literalId}>`) : `[${literalId}]`;
      let replaceValue = undefined;
      switch (branch) {
        case undefined:
          replaceValue = literalsData[languageIndex].get(line);
          break;
        case 'gender':
          replaceValue = `\u{F1200}${line.map((lineNo) => literalsData[languageIndex].get(lineNo)).join('\u{F1104}')}`;
          break;
        case 'version':
          replaceValue = `\u{F1207}${line.map((lineNo) => literalsData[languageIndex].get(lineNo)).join('\u{F1104}')}`;
          break;
        case 'language':
        {
          const lineNo = line[languages[languageIndex]];
          if (lineNo !== undefined)
            replaceValue = literalsData[languageIndex].get(lineNo);
          break;
        }
        default:
          branch satisfies never;
      }
      if (replaceValue === undefined)
        continue;

      if (isGB)
        replaceValue = replaceValue.replaceAll(/@/gu, '');
      if (collectionKey === 'BattleRevolution')
        replaceValue = replaceValue.substring('[FONT 0][SPACING 1]'.length).trim();

      s = s.replaceAll(searchValue, `\u{F1102}${replaceValue}\u{F1103}`);
    }
    return s;
  };
};
