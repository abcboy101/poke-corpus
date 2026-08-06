import { cleanStringTest, corpus } from "./cleanStringTest";

describe.skip("cleanString", () => {
  const collectionFiles = corpus.collections.flatMap((collectionKey) =>
    corpus.getCollection(collectionKey).files.map((fileKey) => [collectionKey, fileKey] as const)
  ).filter(([collectionKey]) => collectionKey !== collectionKey);

  test.concurrent.each(collectionFiles)(
    "%s > %s", cleanStringTest,
    1000 * 60 * 10); // 10 minutes
});
