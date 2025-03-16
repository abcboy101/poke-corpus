import corpus, { corpusKeys, CollectionKey, isCollectionKey, isLanguageKey, LanguageKey } from "./corpus";
import { localStorageGetItem } from "./utils";

/* https://github.com/microsoft/TypeScript/issues/37792#issuecomment-1264705598 */
type TypedArrayMutableProperties = "copyWithin" | "fill" | "reverse" | "set" | "sort" | "subarray" | "valueOf";
interface ReadonlyUint8Array extends Omit<Uint8Array, TypedArrayMutableProperties> {
  readonly [n: number]: number,
  subarray(begin?: number, end?: number): ReadonlyUint8Array,
  valueOf(): ReadonlyUint8Array,
}

export const searchTypes = ["exact", "regex", "boolean", "all"] as const;
export type SearchType = typeof searchTypes[number];
export const isSearchType = (s: unknown): s is SearchType => searchTypes.some((searchType) => s === searchType);

export interface SearchParams {
  readonly query: string,
  readonly type: SearchType,
  readonly caseInsensitive: boolean,
  readonly common: boolean,
  readonly script: boolean,
  readonly showAllLanguages: boolean,
  readonly collections: readonly CollectionKey[],
  readonly languages: readonly LanguageKey[],
}

export type SearchTaskParams = SearchParams;

export interface SearchParamsURLOnly {
  readonly id: string,
  readonly file: string,
  readonly run: boolean,
}

type SearchSettings = Omit<SearchParams, 'query'> & Partial<Pick<SearchParamsURLOnly, 'run'>>;

export const defaultSearchParams: SearchParams & SearchParamsURLOnly = {
  id: '',
  file: '',
  query: '',
  type: 'all',
  caseInsensitive: true,
  common: true,
  script: true,
  showAllLanguages: true,
  collections: corpusKeys.filter((value) => corpus.collections[value].structured),
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
    showAllLanguages: params.showAllLanguages.toString(),
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
    type: asOptionalLiteral(params.get('type') ?? (params.get('regex') === 'true' ? 'regex' : null), isSearchType),
    caseInsensitive: asOptionalBoolean(params.get('caseInsensitive')),
    common: asOptionalBoolean(params.get('common')),
    script: asOptionalBoolean(params.get('script')),
    showAllLanguages: asOptionalBoolean(params.get('showAllLanguages')),
    collections: asOptionalArray(params.get('collections'), isCollectionKey),
    languages: asOptionalArray(params.get('languages'), isLanguageKey, remapLanguages),
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

function asOptionalArray<T extends string>(param: string | null, filter: (value: string) => value is T, remap: (value: string) => string = (value) => value) {
  if (param === null)
    return undefined;
  return param.split(',').map(remap).filter(filter);
}

/* Remap old language codes for backwards compatibility */
function remapLanguages(value: string) {
  switch (value) {
    case 'qid-ZZ':
    case 'ja-JP':
    case 'en-US':
    case 'fr-FR':
    case 'it-IT':
    case 'de-DE':
    case 'es-ES':
    case 'ko-KR':
      return value.split('-', 1)[0];
    case 'ja-Hrkt-JP':
      return 'ja-Hrkt';
    case 'zh-CN':
      return 'zh-Hans';
    case 'zh-TW':
      return 'zh-Hant';
    default:
      return value;
  }
}
//#endregion

//#region Base64
/*
* To create shorter URLs, we serialize the search settings/filters into a binary format.
* - Byte 0: checksum/version
* - Byte 1:
*   - Bit 0: run
*   - Bit 1: caseInsensitive
*   - Bit 2: common
*   - Bit 3: script
*   - Bit 4-5: type
*   - Bit 6: rleFlag
*   - Bit 7: showAllLanguages (inverted)
* - Byte 2+: languages/collections
*
* The checksum uses the number of collections/languages as an initial magic value, added to a byte-wise sum of the remaining bytes.
* This allows it to also serve as a version number when a new collection/language has been added.
* Next, we XOR the other bytes with bytes generated from a pseudorandom number generator seeded with the checksum.
* We then convert it to a URL-safe base64 string for display in the URL bar.
*
* When rleFlag is 0, the languages/collections are stored as a bit array, padded so that the collections begin on a byte boundary.
* When rleFlag is 1, the bit array is compressed using run-length encoding.
* - Bit 0 of byte 2 stores the (inverted) value for the first run. Since the values are either 0 or 1, each run has the opposite value of the previous.
* - The length of each run is stored sequentially, using a constant number of bits for each count (see rleBitCount).
* - More compressible selections (such as all/none/one/consecutive languages/collections) will require fewer characters.
*/

const magic = corpusKeys.length ^ (corpus.languages.length << 4);
const bytesHeader = 2;
const bytesLanguage = Math.ceil(corpus.languages.length / 8);
const bytesCollection = Math.ceil(corpusKeys.length / 8);
const bytesFilters = bytesLanguage + bytesCollection;
const rleFlag = 1 << 6;
const rleBitCount = Math.ceil(Math.log2(corpus.languages.length + corpusKeys.length));
export const bytesBase64 = bytesHeader + bytesFilters;

const btoaUrlSafe = (bytes: ReadonlyUint8Array) => btoa(String.fromCodePoint(...bytes)).replaceAll('/', '_').replaceAll('+', '-').replace(/=+$/, '');
const atobUrlSafe = (s: string) => Uint8Array.from(atob(s.replaceAll('_', '/').replaceAll('-', '+')), (m) => m.charCodeAt(0));

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
    const bytes = atobUrlSafe(s).subarray(0, bytesBase64);
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
    | (+!params.showAllLanguages                << 7) // stored as complement so old links default to true
  );
  const filters = bytes.subarray(bytesHeader);
  setBitArrayFromParams(params, filters);
  setRLEBytesIfShorter(filters, bytes.subarray(1, 2));

  // Trim zero bytes
  let end = bytes.length;
  while (bytes[end - 1] === 0 && end > 1)
    end--;
  return bytes.subarray(0, end);
}

/**
 * Deserializes a bit array into a search settings object.
 */
export function deserializeByteArray(bytes: ReadonlyUint8Array): SearchSettings {
  const filters = new Uint8Array(bytesFilters);
  if (bytes[1] & rleFlag)
    setBitArrayFromRLEBytes(bytes.subarray(bytesHeader), filters);
  else
    filters.set(bytes.subarray(bytesHeader)); // pad with zero bytes
  const languages = corpus.languages.filter((_, i) => getBit(filters, i) === 1);
  const collections = corpusKeys.filter((_, i) => getBit(filters, (8 * bytesLanguage) + i) === 1);
  return {
    run:              (bytes[1] & 0x01) !== 0,
    caseInsensitive:  (bytes[1] & 0x02) !== 0,
    common:           (bytes[1] & 0x04) !== 0,
    script:           (bytes[1] & 0x08) !== 0,
    type:             searchTypes[(bytes[1] & 0x30) >> 4],
    showAllLanguages: (bytes[1] & 0x80) === 0, // read as complement so old links default to true
    languages: languages,
    collections: collections,
  } as const;
}

function setBitArrayFromParams(params: SearchSettings, bitArr: Uint8Array) {
  corpus.languages.forEach((language, i) => {
    if (params.languages.includes(language))
      setBit(bitArr, i);
  });
  corpusKeys.forEach((collection, i) => {
    if (params.collections.includes(collection))
      setBit(bitArr, (8 * bytesLanguage) + i);
  });
}

function setBitArrayFromRLEBytes(rleBytes: ReadonlyUint8Array, bitArr: Uint8Array) {
  const it = iterateRLE(rleBytes);
  corpus.languages.forEach((_, i) => {
    if (it.next().value)
      setBit(bitArr, i);
  });
  corpusKeys.forEach((_, i) => {
    if (it.next().value)
      setBit(bitArr, (8 * bytesLanguage) + i);
  });
}

function setRLEBytesIfShorter(bitArr: Uint8Array, header: Uint8Array) {
  const initialValue = getBit(bitArr, 0) === 1;
  const rleArr = makeRLEArray(bitArr, initialValue);
  let bitArrLength = bitArr.length;
  while (bitArr[bitArrLength - 1] === 0)
    bitArrLength--;
  if (1 + (rleArr.length * rleBitCount) < 8 * bitArrLength) {
    header[0] |= rleFlag;
    bitArr.fill(0);
    if (!initialValue)
      setBit(bitArr, 0); // invert
    let i = 1;
    rleArr.forEach(([count]) => {
      for (let j = 0; j < rleBitCount; i++, j++)
        setBit(bitArr, i, (count >> j) & 1);
    });
  }
}

function makeRLEArray(bitArr: ReadonlyUint8Array, initialValue: boolean): readonly [number, boolean][] {
  const rleArr: [number, boolean][] = [[0, initialValue]];
  corpus.languages.forEach((_, i) => {
    const value = getBit(bitArr, i) === 1;
    if (rleArr[rleArr.length - 1][1] === value)
      rleArr[rleArr.length - 1][0]++;
    else
      rleArr.push([1, value]);
  });
  corpusKeys.forEach((_, i) => {
    const value = getBit(bitArr, (8 * bytesLanguage) + i) === 1;
    if (rleArr[rleArr.length - 1][1] === value)
      rleArr[rleArr.length - 1][0]++;
    else
      rleArr.push([1, value]);
  });
  rleArr.pop(); // last entry is always redundant, no need to include it
  return rleArr;
}

function* iterateRLE(bytes: ReadonlyUint8Array): Generator<boolean, void, never> {
  const bitArr = new Uint8Array(bytesFilters);
  bitArr.set(bytes); // pad with zero bytes
  let enabled = getBit(bitArr, 0) !== 1; // invert
  for (let i = 1; i + rleBitCount <= bitArr.length * 8;) {
    let count = 0;
    for (let j = 0; j < rleBitCount; i++, j++) {
      count |= getBit(bitArr, i) << j;
    }
    if (count === 0)
      break;
    while (count > 0) {
      yield enabled;
      count--;
    }
    enabled = !enabled;
  }

  // Last entry is not encoded, return this value for all remaining calls
  while (true)
    yield enabled;
}

function setBit(bitArr: Uint8Array, i: number, value = 1) {
  bitArr[Math.floor(i / 8)] |= (value << (i % 8));
}

function getBit(bitArr: ReadonlyUint8Array, i: number): number {
  return (bitArr[Math.floor(i / 8)] >> (i % 8)) & 1;
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

function calculateChecksum(bytes: ReadonlyUint8Array, start = 1) {
  return bytes.subarray(start).reduce((a, b) => (a + b) & 0xFF, 0) ^ (magic & 0xFF);
}

/**
 * Symmetric encryption/decryption using a PRNG
 */
function cryptBytes(initial: number, bytes: Uint8Array, start = 1) {
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
  return ((searchParams.get('q') || searchParams.get('s')) ? base64ToSearchParams : queryStringToSearchParams)(hash);
};
//#endregion
