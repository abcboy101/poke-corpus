import { readCorpus, readFile } from '../corpusFs';
import { getLoader } from '../loader';
import { preprocessString } from './cleanStringPre';

const corpus = readCorpus();
const loader = getLoader(corpus);

test('preprocess', async () => {
  const collectionKey = 'Champions';
  for (const languageKey of corpus.getCollection(collectionKey).languages) {
    const s = await readFile(loader, collectionKey, languageKey, 'ms');
    const preprocess = preprocessString(s, collectionKey, languageKey);
    expect(preprocess).not.toMatch(/.*\[Character[12]:[^ ]+ \].*/gu);
  }
}, 10000);
