import { ReadonlyExhaustiveArray } from "./utils";

/* SearchTask status codes: processing -> done (can raise error) */
export type SearchTaskResultError = 'error';
export type SearchTaskResultDone = 'done';
export type SearchTaskResultNotDone = 'processing' | SearchTaskResultError;
export type SearchTaskResultStatus = SearchTaskResultNotDone | SearchTaskResultDone;

export type BooleanError = 'parentheses' | 'regex' | 'slash' | 'quote' | 'operand' | 'empty' | 'where';
export type BooleanStatus = 'success' | BooleanError;

/* SearchResults status codes: loading -> processing -> collecting -> done (can raise regex/noMatch/error/network or propagate from SearchTask) */
export type SearchResultsInProgress = 'loading' | 'processing' | 'collecting';
export type SearchResultsError = SearchTaskResultError | 'regex' | 'noMatch' | 'network' | `boolean.${BooleanError}`;
export type SearchResultsComplete = 'done' | SearchResultsError;
export type SearchResultsStatus = SearchResultsInProgress | SearchResultsComplete;

/* Search status codes: initial -> waiting -> loading -> processing -> collecting -> done (or propagate from SearchResults) */
export type StatusInProgress = 'waiting' | SearchResultsInProgress;
export type StatusComplete = 'initial' | SearchResultsComplete;
export type Status = StatusInProgress | StatusComplete;

const statusError = ['error', 'regex', 'noMatch', 'network', 'boolean.parentheses', 'boolean.regex', 'boolean.slash', 'boolean.quote', 'boolean.operand', 'boolean.empty', 'boolean.where'] as const;
statusError satisfies ReadonlyExhaustiveArray<typeof statusError, SearchResultsError>;
export const isStatusError = (s: string): s is SearchResultsError => statusError.some((status) => s === status);

const statusInProgress = ['waiting', 'loading', 'processing', 'collecting'] as const;
statusInProgress satisfies ReadonlyExhaustiveArray<typeof statusInProgress, StatusInProgress>;
export const isStatusInProgress = (s: string): s is StatusInProgress => statusInProgress.some((status) => s === status);
