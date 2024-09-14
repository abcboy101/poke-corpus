import corpus from "./corpus";
import { localStorageGetItem } from "./utils";

export const searchTypes = ["exact", "regex", "boolean"] as const;
export type SearchType = typeof searchTypes[number];
export const isSearchType = (s: string): s is SearchType => (searchTypes as readonly string[]).includes(s);

export interface SearchParams {
  readonly query: string,
  readonly type: SearchType,
  readonly caseInsensitive: boolean,
  readonly common: boolean,
  readonly script: boolean,
  readonly collections: readonly string[],
  readonly languages: readonly string[],
}

export interface SearchParamsURLOnly {
  readonly id: string,
  readonly file: string,
  readonly run: boolean,
}

type SearchSettings = Omit<SearchParams, 'query'> & Partial<Pick<SearchParamsURLOnly, 'run'>>;

const allCollections: readonly string[] = Object.keys(corpus.collections);
const allCollectionsStructured: readonly string[] = allCollections.filter((value) => corpus.collections[value].structured);
export const defaultSearchParams: SearchParams & SearchParamsURLOnly = {
  id: '',
  file: '',
  query: '',
  type: 'exact',
  caseInsensitive: true,
  common: true,
  script: true,
  collections: allCollectionsStructured,
  languages: corpus.languages,
  run: false,
};

//#region Query strings
/**
 * Converts a SearchParams object to a URL hash.
 * If the parameter is invalid or missing, that field will be undefined.
 */
export function searchParamsToQueryString(params: SearchParams & Partial<SearchParamsURLOnly>) {
  const urlOnlyString: Record<string, string> = {};
  if (params.id !== undefined)
    urlOnlyString.id = params.id;
  if (params.file !== undefined)
    urlOnlyString.file = params.file;
  if (params.run !== undefined)
    urlOnlyString.run = params.run.toString();
  return new URLSearchParams({
    query: params.query,
    type: params.type,
    caseInsensitive: params.caseInsensitive.toString(),
    common: params.common.toString(),
    script: params.script.toString(),
    collections: params.collections.join(','),
    languages: params.languages.join(','),
    ...urlOnlyString,
  }).toString();
}

/**
 * Converts a URL hash to a valid, possibly partial SearchParams object.
 * If the parameter is invalid or missing, that field will be undefined.
 */
export function queryStringToSearchParams(hash: string): Partial<SearchParams & SearchParamsURLOnly> {
  const params: URLSearchParams = new URLSearchParams(hash);
  return {
    id: asOptionalString(params.get('id')),
    file: asOptionalString(params.get('file')),
    query: asOptionalString(params.get('query')),
    type: asOptionalLiteral(params.get('type'), isSearchType),
    caseInsensitive: asOptionalBoolean(params.get('caseInsensitive')),
    common: asOptionalBoolean(params.get('common')),
    script: asOptionalBoolean(params.get('script')),
    collections: asOptionalArray(params.get('collections'), allCollections),
    languages: asOptionalArray(params.get('languages'), corpus.languages),
    run: asOptionalBoolean(params.get('run')),
  };
}
//#endregion

//#region Optional type helpers
function asOptionalString(param: string | null) {
  return param ?? undefined;
}

function asOptionalBoolean(param: string | null) {
  switch (param) {
    case 'true':
      return true;
    case 'false':
      return false;
  }
  return undefined;
}

function asOptionalLiteral<T extends string>(param: string | null, check: (value: string) => value is T) {
  if (param === null)
    return undefined;
  if (check(param))
    return param;
  return undefined;
}

function asOptionalArray(param: string | null, validValues: readonly string[]) {
  if (param === null)
    return undefined;
  return param.split(',').filter((value) => validValues.includes(value));
}
//#endregion

//#region Base64
/**
* To create shorter URLs, we serialize the search settings/filters into a binary format.
* - Byte 0: checksum/version
* - Byte 1:
*   - Bit 0: run
*   - Bit 1: caseInsensitive
*   - Bit 2: common
*   - Bit 3: script
*   - Bit 4-5: type
*   - Bit 6-7: (reserved)
* - Byte 2-3: languages
* - Byte 4-7: collections
*
* The checksum uses the number of collections/languages as an initial magic value, added to a byte-wise sum of bytes 1-7.
* This allows it to also serve as a version number when a new collection/language has been added.
* Next, we XOR bytes 1-7 with bytes generated from a pseudorandom number generator seeded with the checksum.
* We then convert it to a URL-safe base64 string for display in the URL bar.
*/

const magic = allCollections.length ^ (corpus.languages.length << 4);
const bytesHeader = 2;
const bytesLanguage = Math.ceil(corpus.languages.length / 8);
const bytesCollection = Math.ceil(allCollections.length / 8);
export const bytesBase64 = bytesHeader + bytesLanguage + bytesCollection;

const btoaUrlSafe = (bytes: Uint8Array) => btoa(String.fromCodePoint(...bytes)).replaceAll('/', '_').replaceAll('+', '-').replace(/=+$/, '');
const atobUrlSafe = (s: string) => Uint8Array.from(atob(s.replaceAll('_', '/').replaceAll('-', '+')), (m) => m.codePointAt(0)!);

/**
 * Converts a SearchParams object to a short URL hash.
 */
export function searchParamsToBase64(params: SearchParams & Partial<SearchParamsURLOnly>) {
  const urlOnlyString: Record<string, string> = {};
  if (params.id !== undefined)
    urlOnlyString.id = params.id;
  if (params.file !== undefined)
    urlOnlyString.file = params.file;

  const bytes = serializeByteArray(params);
  encryptBytes(bytes);
  return new URLSearchParams({
    ...urlOnlyString,
    q: params.query,
    s: btoaUrlSafe(bytes),
  }).toString();
}

/**
 * Converts a short URL hash to a valid SearchParams object.
 */
export function base64ToSearchParams(hash: string): Partial<SearchParams & SearchParamsURLOnly> {
  const searchParams: URLSearchParams = new URLSearchParams(hash);
  const stringParams: Partial<SearchParams & SearchParamsURLOnly> = {
    id: asOptionalString(searchParams.get('id')),
    file: asOptionalString(searchParams.get('file')),
    query: asOptionalString(searchParams.get('q')),
  };
  const s = asOptionalString(searchParams.get('s'));
  if (!s)
    return stringParams;

  try {
    const bytes = new Uint8Array(bytesBase64);
    bytes.set(atobUrlSafe(s).slice(0, bytes.length));
    decryptBytes(bytes);
    return {
      ...stringParams,
      ...deserializeByteArray(bytes),
    };
  }
  catch {
    return stringParams;
  }
}

/**
 * Serializes search settings as a bit array.
 */
export function serializeByteArray(params: SearchSettings) {
  const bytes = new Uint8Array(bytesBase64);
  bytes[1] = (
    (  +(params.run ?? defaultSearchParams.run) << 0)
    | (+params.caseInsensitive                  << 1)
    | (+params.common                           << 2)
    | (+params.script                           << 3)
    | (searchTypes.indexOf(params.type)         << 4)
  );
  corpus.languages.forEach((language, i) => {
    if (params.languages.includes(language))
      bytes[bytesHeader + Math.floor(i / 8)] |= (1 << (i % 8));
  });
  allCollections.forEach((collection, i) => {
    if (params.collections.includes(collection))
      bytes[bytesHeader + bytesLanguage + Math.floor(i / 8)] |= (1 << (i % 8));
  });
  return bytes;
}

/**
 * Deserializes a bit array into a search settings object.
 */
export function deserializeByteArray(bytes: Uint8Array): SearchSettings {
  const languages = corpus.languages.filter((_, i) => ((bytes[bytesHeader + Math.floor(i / 8)] >> (i % 8)) & 1) === 1);
  const collections = allCollections.filter((_, i) => ((bytes[bytesHeader + bytesLanguage + Math.floor(i / 8)] >> (i % 8)) & 1) === 1);
  return {
    run:             (bytes[1] & 0x01) !== 0,
    caseInsensitive: (bytes[1] & 0x02) !== 0,
    common:          (bytes[1] & 0x04) !== 0,
    script:          (bytes[1] & 0x08) !== 0,
    type:            searchTypes[(bytes[1] & 0x30) >> 4],
    languages: languages,
    collections: collections,
  } as const;
}

export function encryptBytes(bytes: Uint8Array) {
  const checksum = bytes[0] = calculateChecksum(bytes);
  cryptBytes(checksum, bytes); // Use checksum as seed for PRNG to reduce similarity
}

export function decryptBytes(bytes: Uint8Array) {
  const checksum = bytes[0];
  cryptBytes(checksum, bytes);
  if (checksum !== calculateChecksum(bytes))
    throw Error('invalid checksum');
}

function calculateChecksum(bytes: Uint8Array, start: number = 1) {
  return bytes.slice(start).reduce((a, b) => (a + b) & 0xFF, 0) ^ (magic & 0xFF);
}

/**
 * Symmetric encryption/decryption using a PRNG
 */
function cryptBytes(initial: number, bytes: Uint8Array, start: number = 1) {
  let state = mcgAdvance(initial);
  for (let i = start; i < bytes.length; i++) {
    bytes[i] ^= state >> 24;
    state = lcgAdvance(state);
  }
}

/* a values are from Steele and Vigna 2021 */
/* c value is from phi: https://softwareengineering.stackexchange.com/questions/402542 */
const mcgAdvance = (state: number) => (0x93D765DD * state) & 0xFFFFFFFF;
const lcgAdvance = (state: number) => ((0x915F77F5 * state) + 0x9E3779B9) & 0xFFFFFFFF;

export function searchParamsToHash(params: SearchParams & Partial<SearchParamsURLOnly>) {
  return (localStorageGetItem('corpus-longURL') === 'true' ? searchParamsToQueryString : searchParamsToBase64)(params);
}
export function hashToSearchParams(hash: string) {
  const searchParams: URLSearchParams = new URLSearchParams(hash);
  if (searchParams.get('q') || searchParams.get('s'))
    return base64ToSearchParams(hash);
  return queryStringToSearchParams(hash);
};
//#endregion
