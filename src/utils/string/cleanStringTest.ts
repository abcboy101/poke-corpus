import { readCorpus, readFile } from '../corpusFs';
import { preprocessString } from "./cleanStringPre";
import { postprocessString } from "./cleanStringPost";
import { extractSpeakers, replaceSpeaker } from '../speaker';
import { getLoader } from '../loader';
import { replaceLiteralsFactory } from './literals';
import { codeId, CollectionKey, FileKey } from '../corpus';

export const corpus = readCorpus();
const loader = getLoader(corpus);
const richText = true as boolean;

export async function cleanStringTest(collection: CollectionKey, file: FileKey) {
  const { speaker, languages, literals: corpusLiterals } = corpus.getCollection(collection);
  const speakerData = speaker === undefined ? undefined
    : await Promise.all(languages.map((language) => readFile(loader, collection, language, speaker.file)));
  const speakers = (speaker === undefined || speakerData === undefined) ? [] : extractSpeakers(speakerData, speaker.textFile);
  const files = await Promise.all(languages.map((language) => readFile(loader, collection, language, file)));
  const fileData: string[][] = files.map((data, i) => preprocessString(data, collection, languages[i]).split(/\r\n|\n/));

  // Substituted string literals vary by language, so we need to look up what the string is in the appropriate language here
  const literalsLine = corpusLiterals ? Object.keys(corpusLiterals).flatMap((id) => (corpusLiterals[id].branch !== 'language') ? corpusLiterals[id].line : Object.values(corpusLiterals[id].line)) : undefined;
  const literalsData = literalsLine ? fileData.map((lines) => new Map(literalsLine.map((i) => [i, lines[i - 1]]))) : [];
  const replaceLiterals = replaceLiteralsFactory(literalsData, languages.indexOf(codeId), collection, languages, corpusLiterals);

  const messageIdIndex = languages.indexOf(codeId);
  const lineKeysSorted = Array.from({length: fileData[0].length}, (_, i) => i);
  const lines: readonly string[][] = ((messageIdIndex === -1) ? lineKeysSorted
    : lineKeysSorted.filter((i) => {
      // Ignore lines that don't correspond to text data (blank lines, text file headers) based on the message ID file
      const messageId = fileData[messageIdIndex][i];
      return messageId && messageId !== '~~~~~~~~~~~~~~~' && !messageId.startsWith('Text File : ');
    }))
    .map((i) => fileData.map((lines) => lines[i]));

  const postprocess = lines.map((row) => row.map((s, j) => {
    if (richText) {
      if (speakers.length > 0)
        s = replaceSpeaker(s, speakers[j], languages[j]);
      s = replaceLiterals(s, j);
    }
    s = postprocessString(s, collection, languages[j], richText);
    return s;
  }));
  postprocess.forEach((lines) => {
    lines.forEach((s) => {
      expect(s).not.toMatch(/(?!\t)[\x00-\x1F\x7F-\x9F\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/u); // Check for private use characters
    });
  });
}
