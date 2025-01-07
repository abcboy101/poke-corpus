import { BooleanStatus, BooleanError } from "../utils/Status";
import { MatchCondition } from "./searchWorker";
import { SearchParams } from "../utils/searchParams";

export type QueryParseResult = QueryParseResultSuccess | QueryParseResultError;

export interface QueryParseResultSuccess {
  readonly success: true,
  readonly postfix: string[],
}

export interface QueryParseResultError {
  readonly success: false,
  readonly message: BooleanError,
}

type Operator = 'NOT' | 'AND' | 'OR' | '"' | '(' | ')';
const queryParseResultSuccess = (result: string[]): QueryParseResultSuccess => ({success: true, postfix: result});
const queryParseResultError = (message: BooleanError): QueryParseResultError => ({success: false, message: message});

// Handle escaped quote marks and parentheses
const escapeQuery = (s: string) => s.replaceAll('\\\\', '\u{F0100}').replaceAll('\\(', '\u{F0108}').replaceAll('\\)', '\u{F0109}').replaceAll('\\"', '\u{F0180}');
const unescapeQuery = (s: string) => s.replaceAll('\u{F0108}', '(').replaceAll('\u{F0109}', ')').replaceAll('\u{F0180}', '"').replaceAll('\u{F0100}', '\\\\');

/**
 * Convert a boolean query string in infix notation to an array of tokens in postfix notation using the shunting yard algorithm.
 *
 * The supported operators are NOT, AND, and OR, with support for quotation marks to delimit exact phrases and parentheses to group terms.
 * Quotation marks have the highest precedence, followed by parentheses, NOT, AND, and OR.
 */
export function queryToPostfix(query: string): QueryParseResult {
  query = escapeQuery(query);
  const tokens = query.split(/(\b(?:NOT|AND|OR)\b|\\?["()])/u).filter((s) => s.length > 0);
  const operators: Operator[] = [];
  const output: string[] = [];
  let quote = false;
  for (const raw of tokens) {
    // In quote mode, concatenate any tokens until a literal quote is seen
    const t = raw.trim();
    if (quote && t !== '"') {
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
          output.push(operators.pop()!);
        }
        operators.push(t);
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
            output.push(operators.pop()!);
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
          output.push(operators.pop()!);
        }
        if (operators[operators.length - 1] !== '(')
          return queryParseResultError('parentheses');
        operators.pop();
        while (operators[operators.length - 1] === 'NOT')
          output.push(operators.pop()!);
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
    if (operators[operators.length - 1] === '"')
      return queryParseResultError('quote');
    output.push(operators.pop()!);
  }
  return queryParseResultSuccess(output);
}

/**
 * Convert an array of boolean keywords in postfix notation to a function that evaluates the match condition.
 */
export function postfixToMatchCondition(params: SearchParams, postfix: string[]): MatchCondition | undefined {
  const stack: MatchCondition[] = [];
  for (const keyword of postfix) {
    switch (keyword) {
      case "NOT":
      {
        const cond = stack.pop()!;
        stack.push((line: string) => !cond(line));
        break;
      }
      case "AND":
      {
        const cond2 = stack.pop()!;
        const cond1 = stack.pop()!;
        stack.push((line: string) => cond1(line) && cond2(line));
        break;
      }
      case "OR":
      {
        const cond2 = stack.pop()!;
        const cond1 = stack.pop()!;
        stack.push((line: string) => cond1(line) || cond2(line));
        break;
      }
      default:
      {
        if (keyword.startsWith('"') && keyword.endsWith('"')) {
          // exact match
          const phrase = unescapeQuery(keyword.substring(1, keyword.length - 1));
          if (!params.caseInsensitive) {
            stack.push((line) => line.includes(phrase)); // case-sensitive
          }
          else {
            const lowercase = phrase.toLowerCase();
            const uppercase = phrase.toUpperCase();
            stack.push((line) => line.toLowerCase().includes(lowercase) || line.toUpperCase().includes(uppercase)); // case-insensitive
          }
        }
        else {
          // all of these words
          const phrases = unescapeQuery(keyword).split(/\s+/);
          if (!params.caseInsensitive) {
            stack.push((line) => phrases.every((phrase) => line.includes(phrase))); // case-sensitive
          }
          else {
            const lowercase = phrases.map((phrase) => phrase.toLowerCase());
            const uppercase = phrases.map((phrase) => phrase.toUpperCase());
            stack.push((line) => phrases.every((_, i) => (line.toLowerCase().includes(lowercase[i]) || line.toUpperCase().includes(uppercase[i])))); // case-insensitive
          }
        }
      }
    }
  }
  while (stack.length > 1) {
    // AND all remaining terms
    const cond2 = stack.pop()!;
    const cond1 = stack.pop()!;
    stack.push((line: string) => cond1(line) && cond2(line));
  }
  return stack.pop();
}

/* Converts the given search parameters to the match condition function. */
export function getMatchConditionBoolean(params: SearchParams): MatchCondition {
  const result = queryToPostfix(params.query);
  if (result.success && result.postfix.length > 0) {
    console.debug(result.postfix);
    const stack = postfixToMatchCondition(params, result.postfix);
    if (stack)
      return stack;
  }
  return () => false;
}

/* Tests if the given search parameters are a valid Boolean query. */
export function isBooleanQueryValid(params: SearchParams): BooleanStatus {
  const result = queryToPostfix(params.query);
  if (!result.success) {
    // Error during parsing (mismatched parentheses or quotes)
    return result.message;
  }

  try {
    const matchCondition = postfixToMatchCondition(params, result.postfix);
    if (matchCondition === undefined) {
      // Empty stack (no keywords)
      return 'empty';
    }

    // Try evaluating it, will throw if an inner condition is undefined
    matchCondition('');
    return 'success';
  }
  catch {
    // Error during evaluation (missing operand)
    return 'operand';
  }
}
