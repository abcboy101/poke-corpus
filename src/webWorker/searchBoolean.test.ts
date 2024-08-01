import { queryToPostfix, QueryParseResultSuccess, QueryParseResultError } from "./searchBoolean";

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
  const {success} = queryToPostfix('"open but no close');
  expect(success).toBe(false);
});

test('queryToPostfix, mismatched parentheses 1', () => {
  const {success} = queryToPostfix('((missing one close)');
  expect(success).toBe(false);
});

test('queryToPostfix, mismatched parentheses 2', () => {
  const {success} = queryToPostfix('(missing one open))');
  expect(success).toBe(false);
});
