import { BooleanStatus, BooleanError } from "../utils/Status";
import { isValidRegex } from "../utils/utils";
import { MatchCondition, getMatchConditionAll, getMatchConditionExact, getMatchConditionRegex } from './searchCondition';

export type QueryParseResult = QueryParseResultSuccess | QueryParseResultError;

export interface QueryParseResultSuccess {
  readonly success: true,
  readonly postfix: readonly string[],
}

export interface QueryParseResultError {
  readonly success: false,
  readonly message: BooleanError,
}

type Operator = 'NOT' | 'AND' | 'OR' | '/' | '"' | '(' | ')';
const queryParseResultSuccess = (result: readonly string[]): QueryParseResultSuccess => ({success: true, postfix: result});
const queryParseResultError = (message: BooleanError): QueryParseResultError => ({success: false, message: message});

// Handle escaped quote marks and parentheses
const escapeQuery = (s: string) => s.replaceAll('\\\\', '\u{F0100}').replaceAll('\\/', '\u{F0101}').replaceAll('\\(', '\u{F0108}').replaceAll('\\)', '\u{F0109}').replaceAll('\\"', '\u{F0180}');
const unescapeQuery = (s: string) => s.replaceAll('\u{F0108}', '(').replaceAll('\u{F0109}', ')').replaceAll('\u{F0180}', '"').replaceAll('\u{F0101}', '/').replaceAll('\u{F0100}', '\\\\');
const unescapeQueryRegex = (s: string) => s.replaceAll('\u{F0108}', '\\(').replaceAll('\u{F0109}', '\\)').replaceAll('\u{F0180}', '\\"').replaceAll('\u{F0101}', '/').replaceAll('\u{F0100}', '\\\\');

/**
 * Convert a boolean query string in infix notation to an array of tokens in postfix notation using the shunting yard algorithm.
 *
 * The supported operators are NOT, AND, and OR, with support for slashes to delimit regular expressions, quotation marks to delimit exact phrases,
 * and parentheses to group terms. Slashes have the highest precedence, followed by quotation marks, parentheses, NOT, AND, and OR.
 */
export function queryToPostfix(query: string): QueryParseResult {
  query = escapeQuery(query);
  const tokens = query.split(/(\b(?:NOT|AND|OR)\b|\\?[/"()])/u).filter((s) => s.length > 0);
  const operators: Operator[] = [];
  const output: string[] = [];
  let regex = false;
  let quote = false;
  for (const raw of tokens) {
    // In regex or quote mode, concatenate any tokens until a literal slash/quote is seen
    const t = raw.trim();
    if ((regex && t !== '/') || (quote && t !== '"')) {
      output[output.length - 1] += raw;
      continue;
    }

    switch (t) {
      // Unary operators
      case "NOT":
        operators.push(t);
        break;

      // Binary operators
      // NOT has precedence over AND and OR and AND has precedence over OR, so we should pop off these pending operators first
      // If both operators are the same, left has precedence over right
      case "AND":
      case "OR":
        while (operators[operators.length - 1] !== '(' && (operators[operators.length - 1] === 'NOT' || (operators[operators.length - 1] === 'AND' && t === 'OR') || t === operators[operators.length - 1])) {
          output.push(operators.pop()!); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
        }
        operators.push(t);
        break;

      // Slash
      // Triggers regex mode or ends regex mode. When it ends, pop any unary operators.
      case '/':
        if (!regex) {
          operators.push(t);
          regex = true;
          output.push(''); // push an empty string to concatenate onto
        }
        else if (operators[operators.length - 1] === '/') {
          operators.pop();
          const pattern = output.pop()!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- pattern was pushed when the previous '/' was pushed

          // Ensure the regex is valid.
          // If it's invalid, return with that error immediately.
          if (!isValidRegex(pattern))
            return queryParseResultError('regex');

          output.push(`/${pattern}/`);
          regex = false;
          while (operators[operators.length - 1] === 'NOT')
            output.push(operators.pop()!); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
        }
        break;

      // Quotation mark
      // Triggers quote mode or ends quote mode. When it ends, pop any unary operators.
      case '"':
        if (!quote) {
          operators.push(t);
          quote = true;
          output.push(''); // push an empty string to concatenate onto
        }
        else if (operators[operators.length - 1] === '"') {
          operators.pop();
          output.push(`"${output.pop()}"`);
          quote = false;
          while (operators[operators.length - 1] === 'NOT')
            output.push(operators.pop()!); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
        }
        break;

      // Opening parentheses
      // Add to stack
      case "(":
        operators.push(t);
        break;

      // Closing parentheses
      // Pop any pending operators until the left parentheses is reached. Then, pop any unary operators.
      case ")":
        while (operators[operators.length - 1] !== '(') {
          if (operators.length === 0)
            return queryParseResultError('parentheses');
          output.push(operators.pop()!); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
        }
        if (operators[operators.length - 1] !== '(')
          return queryParseResultError('parentheses');
        operators.pop();
        while (operators[operators.length - 1] === 'NOT')
          output.push(operators.pop()!); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
        break;

      // All other strings are treated as search keywords
      default:
        if (t.length > 0)
          output.push(t);
    }
  }

  // Pop off any remaining operators.
  while (operators.length > 0) {
    if (operators[operators.length - 1] === '(')
      return queryParseResultError('parentheses');
    if (operators[operators.length - 1] === '/')
      return queryParseResultError('slash');
    if (operators[operators.length - 1] === '"')
      return queryParseResultError('quote');
    output.push(operators.pop()!); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
  }
  return queryParseResultSuccess(output);
}

/**
 * Convert an array of boolean keywords in postfix notation to a function that evaluates the match condition.
 *
 * Returns the match condition. If the array is empty, undefined is returned. If an operand is missing, null is returned.
 */
export function postfixToMatchCondition(caseInsensitive: boolean, postfix: readonly string[]): MatchCondition | undefined | null {
  const stack: MatchCondition[] = [];
  for (const keyword of postfix) {
    switch (keyword) {
      case "NOT":
      {
        const cond = stack.pop();
        if (cond === undefined)
          return null;
        stack.push((line: string) => !cond(line));
        break;
      }
      case "AND":
      {
        const cond2 = stack.pop();
        const cond1 = stack.pop();
        if (cond2 === undefined || cond1 === undefined)
          return null;
        stack.push((line: string) => cond1(line) && cond2(line));
        break;
      }
      case "OR":
      {
        const cond2 = stack.pop();
        const cond1 = stack.pop();
        if (cond2 === undefined || cond1 === undefined)
          return null;
        stack.push((line: string) => cond1(line) || cond2(line));
        break;
      }
      default:
      {
        if (keyword.startsWith('/') && keyword.endsWith('/')) { // regex
          stack.push(getMatchConditionRegex(unescapeQueryRegex(keyword.substring(1, keyword.length - 1)), caseInsensitive));
        }
        else if (keyword.startsWith('"') && keyword.endsWith('"')) { // exact match
          stack.push(getMatchConditionExact(unescapeQuery(keyword.substring(1, keyword.length - 1)), caseInsensitive));
        }
        else { // all of these words
          stack.push(getMatchConditionAll(unescapeQuery(keyword), caseInsensitive));
        }
      }
    }
  }
  while (stack.length >= 2) {
    // AND all remaining terms
    const cond2 = stack.pop()!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
    const cond1 = stack.pop()!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- checked in while loop
    stack.push((line: string) => cond1(line) && cond2(line));
  }
  return stack.pop();
}

/* Converts the given search parameters to the match condition function. */
export function getMatchConditionBoolean(query: string, caseInsensitive: boolean): MatchCondition {
  const result = queryToPostfix(query);
  if (result.success && result.postfix.length > 0) {
    console.debug(result.postfix);
    const stack = postfixToMatchCondition(caseInsensitive, result.postfix);
    if (stack)
      return stack;
  }
  return () => false;
}

/* Tests if the given search parameters are a valid Boolean query. */
export function isBooleanQueryValid(query: string, caseInsensitive: boolean): BooleanStatus {
  const result = queryToPostfix(query);
  if (!result.success) {
    // Error during parsing (mismatched parentheses/quotes/slashes, invalid regex)
    return result.message;
  }

  const matchCondition = postfixToMatchCondition(caseInsensitive, result.postfix);
  if (matchCondition === null) {
    // Missing operand
    return 'operand';
  }
  if (matchCondition === undefined) {
    // Empty stack (no keywords)
    return 'empty';
  }
  return 'success';
}

export function parseWhereClause(query: string) {
  return /(.*)\bWHERE\s+([0-9A-Za-z-]+)\s*(=|==|<>|!=)\s*([0-9A-Za-z-]+)/u.exec(query);
}
