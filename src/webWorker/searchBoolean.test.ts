import { queryToPostfix, isBooleanQueryValid, QueryParseResultSuccess, QueryParseResultError } from "./searchBoolean";
import { SearchParams } from "./searchWorker";

const defaultParams: SearchParams = {
  query: '',
  type: 'boolean',
  caseInsensitive: true,
  common: true,
  script: true,
  collections: [],
  languages: [],
};

test('queryToPostfix, NOT', () => {
  const {success, postfix} = queryToPostfix('NOT foo bar') as QueryParseResultSuccess;
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo bar', 'NOT']);
});

test('queryToPostfix, AND', () => {
  const {success, postfix} = queryToPostfix('abc def AND (ghi jkl)') as QueryParseResultSuccess;
  expect(success).toBe(true);
  expect(postfix).toEqual(['abc def', 'ghi jkl', 'AND']);
});

test('queryToPostfix, OR', () => {
  const {success, postfix} = queryToPostfix('abc def OR ghi jkl') as QueryParseResultSuccess;
  expect(success).toBe(true);
  expect(postfix).toEqual(['abc def', 'ghi jkl', 'OR']);
});

test('queryToPostfix, quotation marks', () => {
  const {success, postfix} = queryToPostfix(' "  foo \\"bar\\" (AND)  baz  " OR "" ') as QueryParseResultSuccess;
  expect(success).toBe(true);
  expect(postfix).toEqual(['"  foo \\"bar\\" (AND)  baz  "', '""', 'OR']);
});

test('queryToPostfix, precedence', () => {
  const {success, postfix} = queryToPostfix('foo OR bar AND baz') as QueryParseResultSuccess;
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo', 'bar', 'baz', 'AND', 'OR']);
});

test('queryToPostfix, parentheses', () => {
  const {success, postfix} = queryToPostfix('(foo OR bar) AND baz') as QueryParseResultSuccess;
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo', 'bar', 'OR', 'baz', 'AND']);
});

test('queryToPostfix, complex', () => {
  const {success, postfix} = queryToPostfix('NOT (foo OR (bar AND (baz OR qux))) AND (NOT a OR NOT b) AND c') as QueryParseResultSuccess;
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo', 'bar', 'baz', 'qux', 'OR', 'AND', 'OR', 'NOT', 'a', 'NOT', 'b', 'NOT', 'OR', 'AND', 'c', 'AND']);
});

test('queryToPostfix, mismatched quotation marks', () => {
  const {success, message} = queryToPostfix('"open but no close') as QueryParseResultError;
  expect(success).toBe(false);
  expect(message).toBe('quote');
});

test('queryToPostfix, mismatched parentheses 1', () => {
  const {success, message} = queryToPostfix('((missing one close)') as QueryParseResultError;
  expect(success).toBe(false);
  expect(message).toBe('parentheses');
});

test('queryToPostfix, mismatched parentheses 2', () => {
  const {success, message} = queryToPostfix('(missing one open))') as QueryParseResultError;
  expect(success).toBe(false);
  expect(message).toBe('parentheses');
});

test('isBooleanQueryValid, no keywords', () => {
  const status = isBooleanQueryValid({...defaultParams, query: '   ()   '});
  expect(status).toBe('empty');
});

test('isBooleanQueryValid, missing operand', () => {
  const status = isBooleanQueryValid({...defaultParams, query: 'foo OR'});
  expect(status).toBe('operand');
});
