/* SearchTask status codes: loading -> processing -> done (can raise error/network) */
export type SearchTaskResultError = 'error' | 'network';
export type SearchTaskResultDone = 'done';
export type SearchTaskResultStatus = 'loading' | 'processing' | SearchTaskResultDone | SearchTaskResultError;

/* SearchResults status codes: loading -> processing -> collecting -> done (can raise regex/noMatch/error or propagate from SearchTask) */
export type SearchResultsInProgress = 'loading' | 'processing' | 'collecting';
export type SearchResultsError = SearchTaskResultError | 'regex' | 'noMatch';
export type SearchResultsComplete = 'done' | SearchResultsError;
export type SearchResultsStatus = SearchResultsInProgress | SearchResultsComplete;

/* Search status codes: initial -> waiting -> loading -> processing -> collecting -> rendering -> done (or propagate from SearchResults) */
export type StatusInProgress = 'waiting' | SearchResultsInProgress | 'rendering';
export type StatusComplete = 'initial' | SearchResultsComplete;
export type Status = StatusInProgress | StatusComplete;
export const statusInProgress: readonly Status[] & readonly StatusInProgress[] = ['waiting', 'loading', 'processing', 'collecting', 'rendering'];
