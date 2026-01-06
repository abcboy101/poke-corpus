import { CollectionKey, LanguageKey, Literals } from "../corpus";

export const replaceLiteralsFactory = (literalsData: readonly ReadonlyMap<number, string>[], messageIdIndex: number, collectionKey: CollectionKey, languages: readonly LanguageKey[], literals: Literals | undefined) => {
  return (s: string, languageIndex: number) => {
    if (literals === undefined || languageIndex === messageIdIndex)
      return s;

    const isGB = ['RedBlue', 'Yellow'].includes(collectionKey);
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
