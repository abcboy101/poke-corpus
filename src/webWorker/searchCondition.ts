import { SearchParams, SearchType } from '../utils/searchParams';
import { convertWhitespace } from './cleanString';
import { getMatchConditionBoolean } from './searchBoolean';

export type MatchCondition = (line: string) => boolean;
export type MatchConditionFactory = (query: string, caseInsensitive: boolean) => MatchCondition;

export function getMatchConditionAll(query: string, caseInsensitive: boolean): MatchCondition {
  const phrases = query.split(/\s+/);
  if (!caseInsensitive) {
    // case-sensitive
    return (line) => phrases.every((phrase) => line.includes(phrase));
  }

  // case-insensitive
  const lowercase = phrases.map((phrase) => phrase.toLowerCase());
  const uppercase = phrases.map((phrase) => phrase.toUpperCase());
  return (line) => {
    const lineLowercase = line.toLowerCase();
    const lineUppercase = line.toUpperCase();
    return phrases.every((_, i) => (lineLowercase.includes(lowercase[i]) || lineUppercase.includes(uppercase[i])));
  };
}

export function getMatchConditionExact(query: string, caseInsensitive: boolean): MatchCondition {
  if (!caseInsensitive) {
    // case-sensitive
    return (line) => line.includes(query);
  }

  // case-insensitive
  const lowercase = query.toLowerCase();
  const uppercase = query.toUpperCase();
  return (line) => line.toLowerCase().includes(lowercase) || line.toUpperCase().includes(uppercase); // case-insensitive
}

export function getMatchConditionRegex(query: string, caseInsensitive: boolean): MatchCondition {
  const re = new RegExp(query, caseInsensitive ? 'sui' : 'su');
  return (line) => convertWhitespace(line).match(re) !== null;
}

export function getMatchCondition(params: SearchParams): MatchCondition {
  switch (params.type) {
    case 'all':
      return getMatchConditionAll(params.query, params.caseInsensitive);
    case 'exact':
      return getMatchConditionExact(params.query, params.caseInsensitive);
    case 'regex':
      return getMatchConditionRegex(params.query, params.caseInsensitive);
    case 'boolean':
      return getMatchConditionBoolean(params.query, params.caseInsensitive);
    default:
      return () => false;
  }
}
