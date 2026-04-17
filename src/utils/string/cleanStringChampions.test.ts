import { readCorpus, readFile } from '../corpusFs';
import { getLoader } from '../loader';
import { preprocessString } from './cleanStringPre';
import runLong from '../runLong';

const corpus = readCorpus();
const loader = getLoader(corpus);

(runLong ? test : test.skip)('preprocess', async () => {
  const collectionKey = 'Champions';
  for (const languageKey of corpus.getCollection(collectionKey).languages) {
    const s = await readFile(loader, collectionKey, languageKey, 'ms');
    const preprocess = preprocessString(s, collectionKey, languageKey);
    expect(preprocess).not.toMatch(/.*\[Character[12]:[^ ]+ \].*/g);
  }
}, 10000);
