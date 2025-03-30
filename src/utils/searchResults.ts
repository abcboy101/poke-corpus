import { SearchTaskResultLines } from "../webWorker/searchWorker";

export const initialResult = { status: 'initial' } as const;

interface ParamsResultInProgress {
  readonly status: 'worker' | 'noLines',
  readonly params: SearchTaskResultLines,
};

interface ParamsResultDone {
  readonly status: 'done',
  readonly params: SearchTaskResultLines,
  readonly richText: boolean,
};

export type ParamsResult = ParamsResultInProgress | ParamsResultDone;

export type Result = typeof initialResult | ParamsResult;

export type SectionHeader = string | undefined;
