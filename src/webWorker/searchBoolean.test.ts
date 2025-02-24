import { queryToPostfix, isBooleanQueryValid } from "./searchBoolean";
import { SearchParams } from "../utils/searchParams";

const defaultParams: SearchParams = {
  query: '',
  type: 'boolean',
  caseInsensitive: true,
  common: true,
  script: true,
  showAllLanguages: true,
  collections: [],
  languages: [],
};

function queryToPostfixExpectSuccess(query: string) {
  const result = queryToPostfix(query);
  if (!result.success)
    fail();
  return result;
}

function queryToPostfixExpectError(query: string) {
  const result = queryToPostfix(query);
  if (result.success)
    fail();
  return result;
}

test('queryToPostfix, NOT', () => {
  const {success, postfix} = queryToPostfixExpectSuccess('NOT foo bar');
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo bar', 'NOT']);
});

test('queryToPostfix, AND', () => {
  const {success, postfix} = queryToPostfixExpectSuccess('abc def AND (ghi jkl)');
  expect(success).toBe(true);
  expect(postfix).toEqual(['abc def', 'ghi jkl', 'AND']);
});

test('queryToPostfix, OR', () => {
  const {success, postfix} = queryToPostfixExpectSuccess('abc def OR ghi jkl');
  expect(success).toBe(true);
  expect(postfix).toEqual(['abc def', 'ghi jkl', 'OR']);
});

test('queryToPostfix, regex', () => {
  const {success, postfix} = queryToPostfixExpectSuccess(' / foo.*(bar) "\\d\\"  / OR /\\// ');
  expect(success).toBe(true);
  expect(postfix).toEqual(['/ foo.*(bar) "\\d\u{F0180}  /', '/\u{F0101}/', 'OR']);
});

test('queryToPostfix, quotation marks', () => {
  const {success, postfix} = queryToPostfixExpectSuccess(' "  foo \\"bar\\" (AND)  /baz/  " OR "" ');
  expect(success).toBe(true);
  expect(postfix).toEqual(['"  foo \u{F0180}bar\u{F0180} (AND)  /baz/  "', '""', 'OR']);
});

test('queryToPostfix, precedence', () => {
  const {success, postfix} = queryToPostfixExpectSuccess('foo OR bar AND baz');
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo', 'bar', 'baz', 'AND', 'OR']);
});

test('queryToPostfix, parentheses', () => {
  const {success, postfix} = queryToPostfixExpectSuccess('(foo OR bar) AND baz');
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo', 'bar', 'OR', 'baz', 'AND']);
});

test('queryToPostfix, complex', () => {
  const {success, postfix} = queryToPostfixExpectSuccess('NOT (foo OR (bar AND (baz OR qux))) AND (NOT a OR NOT b) AND c');
  expect(success).toBe(true);
  expect(postfix).toEqual(['foo', 'bar', 'baz', 'qux', 'OR', 'AND', 'OR', 'NOT', 'a', 'NOT', 'b', 'NOT', 'OR', 'AND', 'c', 'AND']);
});

test('queryToPostfix, mismatched slashes', () => {
  const {success, message} = queryToPostfixExpectError('/open but no close');
  expect(success).toBe(false);
  expect(message).toBe('slash');
});

test('queryToPostfix, mismatched quotation marks', () => {
  const {success, message} = queryToPostfixExpectError('"open but no close');
  expect(success).toBe(false);
  expect(message).toBe('quote');
});

test('queryToPostfix, mismatched parentheses 1', () => {
  const {success, message} = queryToPostfixExpectError('((missing one close)');
  expect(success).toBe(false);
  expect(message).toBe('parentheses');
});

test('queryToPostfix, mismatched parentheses 2', () => {
  const {success, message} = queryToPostfixExpectError('(missing one open))');
  expect(success).toBe(false);
  expect(message).toBe('parentheses');
});

test('isBooleanQueryValid, no keywords', () => {
  const status = isBooleanQueryValid('   ()   ', defaultParams.caseInsensitive);
  expect(status).toBe('empty');
});

test('isBooleanQueryValid, missing operand', () => {
  const status = isBooleanQueryValid('foo OR', defaultParams.caseInsensitive);
  expect(status).toBe('operand');
});
