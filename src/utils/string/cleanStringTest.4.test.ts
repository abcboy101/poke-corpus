import { cleanStringTest, corpus } from "./cleanStringTest";
import runLong from '../runLong';

(runLong ? describe : describe.skip)("cleanString", () => {
  const collectionFiles = corpus.collections.flatMap((collectionKey) =>
    corpus.getCollection(collectionKey).files.map((fileKey) => [collectionKey, fileKey] as const)
  ).filter((_, i) => i % 5 === 4);

  test.concurrent.each(collectionFiles)(
    "%s > %s", cleanStringTest,
    1000 * 60 * 5); // 5 minutes
});
