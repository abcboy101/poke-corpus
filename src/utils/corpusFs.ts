import fs from 'node:fs/promises';

import dataJson from '../../public/data.json';
import { getCorpus, Corpus, CorpusSource, CollectionKey, FileKey, LanguageKey } from './corpus';
import { Loader } from './loader';

export function readCorpus(): Corpus {
  const source = dataJson as CorpusSource;
  return getCorpus(source);
};

export async function readFile(loader: Loader, collectionKey: CollectionKey, languageKey: LanguageKey, fileKey: FileKey): Promise<string> {
  const path = loader.getFilePath(collectionKey, languageKey, fileKey);
  return fs.readFile(path.split('.gz')[0], {encoding: 'utf-8'});
}
