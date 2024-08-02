/* SearchTask status codes: processing -> done (can raise error) */
export type SearchTaskResultError = 'error';
export type SearchTaskResultDone = 'done';
export type SearchTaskResultNotDone = 'processing' | SearchTaskResultError;
export type SearchTaskResultStatus = SearchTaskResultNotDone | SearchTaskResultDone;

/* SearchResults status codes: loading -> processing -> collecting -> done (can raise regex/noMatch/error/network or propagate from SearchTask) */
export type SearchResultsInProgress = 'loading' | 'processing' | 'collecting';
export type SearchResultsError = SearchTaskResultError | 'regex' | 'noMatch' | 'network';
export type SearchResultsComplete = 'done' | SearchResultsError;
export type SearchResultsStatus = SearchResultsInProgress | SearchResultsComplete;
export const statusError: readonly Status[] & readonly SearchResultsError[] = ['error', 'regex', 'noMatch', 'network'];

/* Search status codes: initial -> waiting -> loading -> processing -> collecting -> rendering -> done (or propagate from SearchResults) */
export type StatusInProgress = 'waiting' | SearchResultsInProgress | 'rendering';
export type StatusComplete = 'initial' | SearchResultsComplete;
export type Status = StatusInProgress | StatusComplete;
export const statusInProgress: readonly Status[] & readonly StatusInProgress[] = ['waiting', 'loading', 'processing', 'collecting', 'rendering'];
