import { readCorpus } from './corpusFs';
import { getSearchParamsFactory } from './searchParams';

const corpus = readCorpus();
const factory = getSearchParamsFactory(corpus);

test('query string', () => {
  const params = {
    query: 'foo',
    type: 'boolean',
    caseInsensitive: false,
    common: true,
    script: true,
    showAllLanguages: true,
    collections: ['ScarletViolet'],
    languages: ['en'],
  } as const;
  const hash = factory._searchParamsToQueryString(params);
  const deserialized = factory._queryStringToSearchParams(hash);
  expect(deserialized).toMatchObject(params);
});

test('base 64', () => {
  const params = {
    query: 'foo',
    type: 'boolean',
    caseInsensitive: false,
    common: true,
    script: true,
    showAllLanguages: true,
    collections: [],
    languages: [],
  } as const;
  const hash = factory._searchParamsToBase64(params);
  const deserialized = factory._base64ToSearchParams(hash);
  expect(deserialized).toMatchObject(params);
});

test('byte array none', () => {
  const params = {
    type: 'boolean',
    caseInsensitive: false,
    common: true,
    script: true,
    showAllLanguages: true,
    collections: [],
    languages: [],
  } as const;
  const arr = factory._serializeByteArray(params);
  const deserialized = factory._deserializeByteArray(arr);
  expect(deserialized).toMatchObject(params);
});

test('byte array all', () => {
  const params = {
    type: 'boolean',
    caseInsensitive: false,
    common: true,
    script: true,
    showAllLanguages: true,
    collections: corpus.collections,
    languages: corpus.languages,
  } as const;
  const arr = factory._serializeByteArray(params);
  const deserialized = factory._deserializeByteArray(arr);
  expect(deserialized).toMatchObject(params);
});

test('byte array random', () => {
  for (let i = 0; i < 100; i++) {
    const params = {
      type: 'regex',
      caseInsensitive: true,
      common: false,
      script: false,
      showAllLanguages: false,
      collections: corpus.collections.filter(() => Math.random() < 0.5),
      languages: corpus.languages.filter(() => Math.random() < 0.5),
    } as const;
    const arr = factory._serializeByteArray(params);
    const deserialized = factory._deserializeByteArray(arr);
    expect(deserialized).toMatchObject(params);
  }
});

test('encryption', () => {
  for (let i = 0; i < 10; i++) {
    const original = new Uint8Array(factory._bytesBase64);
    crypto.getRandomValues(original);
    original[0] = 0;

    const bytes = new Uint8Array(original);
    factory._encryptBytes(bytes);
    factory._decryptBytes(bytes);
    expect(bytes.slice(1)).toEqual(original.slice(1));
  }
});
