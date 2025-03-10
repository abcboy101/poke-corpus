import { Literals } from "./corpus";

export const replaceLiteralsFactory = (literalsData: readonly ReadonlyMap<number, string>[], messageIdIndex: number, collectionKey: string, languages: readonly string[], literals: Literals | undefined) => {
  return (s: string, languageIndex: number) => {
    if (literals === undefined || languageIndex === messageIdIndex)
      return s;

    for (const [literalId, {branch, line}] of Object.entries(literals)) {
      const searchValue = `[${literalId}]`;
      let replaceValue = searchValue;
      if (branch === undefined)
        replaceValue = literalsData[languageIndex].get(line)!;
      else if (branch === 'gender')
        replaceValue = `\u{F1200}${line.map((lineNo) => literalsData[languageIndex].get(lineNo)).join('\u{F1104}')}`;
      else if (branch === 'version')
        replaceValue = `\u{F1207}${line.map((lineNo) => literalsData[languageIndex].get(lineNo)).join('\u{F1104}')}`;
      else if (branch === 'language')
        replaceValue = literalsData[languageIndex].get(line[languages[languageIndex]])!;

      if (collectionKey === 'BattleRevolution')
        replaceValue = replaceValue.substring('[FONT 0][SPACING 1]'.length).trim();

      s = s.replaceAll(searchValue, `\u{F1102}${replaceValue}\u{F1103}`);
    }
    return s;
  };
};
