import corpus from "./corpus";

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

/**
 * Converts a SearchParams object to a URL hash.
 * If the parameter is invalid or missing, that field will be undefined.
 */
export function searchParamsToHash(params: SearchParams & Partial<SearchParamsURLOnly>) {
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
export function hashToSearchParams(hash: string): Partial<SearchParams> & Partial<SearchParamsURLOnly> {
  const params: URLSearchParams = new URLSearchParams(hash);
  return {
    id: asOptionalString(params.get('id')),
    file: asOptionalString(params.get('file')),
    query: asOptionalString(params.get('query')),
    type: asOptionalLiteral(params.get('type'), isSearchType),
    caseInsensitive: asOptionalBoolean(params.get('caseInsensitive')),
    common: asOptionalBoolean(params.get('common')),
    script: asOptionalBoolean(params.get('script')),
    collections: asOptionalArray(params.get('collections'), Object.keys(corpus.collections)),
    languages: asOptionalArray(params.get('languages'), corpus.languages),
    run: asOptionalBoolean(params.get('run')),
  };
}

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
