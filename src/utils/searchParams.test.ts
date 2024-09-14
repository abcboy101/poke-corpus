import {
  searchParamsToQueryString, queryStringToSearchParams,
  searchParamsToBase64, base64ToSearchParams,
  serializeByteArray, deserializeByteArray,
  bytesBase64, encryptBytes, decryptBytes,
} from './searchParams';

test('query string', () => {
  const params = {
    query: 'foo',
    type: 'boolean',
    caseInsensitive: false,
    common: true,
    script: true,
    collections: ['ScarletViolet'],
    languages: ['en'],
  } as const;
  const hash = searchParamsToQueryString(params);
  const deserialized = queryStringToSearchParams(hash);
  expect(deserialized).toMatchObject(params);
});

test('base 64', () => {
  const params = {
    query: 'foo',
    type: 'boolean',
    caseInsensitive: false,
    common: true,
    script: true,
    collections: [],
    languages: [],
  } as const;
  const hash = searchParamsToBase64(params);
  const deserialized = base64ToSearchParams(hash);
  expect(deserialized).toMatchObject(params);
});

test('byte array', () => {
  const params = {
    type: 'boolean',
    caseInsensitive: false,
    common: true,
    script: true,
    collections: [],
    languages: [],
  } as const;
  const arr = serializeByteArray(params);
  const deserialized = deserializeByteArray(arr);
  expect(deserialized).toMatchObject(params);
});

test('encryption', () => {
  for (let i = 0; i < 10; i++) {
    const original = new Uint8Array(bytesBase64);
    crypto.getRandomValues(original);
    original[0] = 0;

    const bytes = new Uint8Array(original);
    encryptBytes(bytes);
    decryptBytes(bytes);
    expect(bytes.slice(1)).toEqual(original.slice(1));
  }
});
