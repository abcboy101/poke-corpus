import { SearchTaskResultLines } from "../webWorker/searchWorker";

export const initialResult = { status: 'initial' } as const;

export interface ParamsResult {
  readonly status: 'worker' | 'noLines' | 'done',
  readonly params: SearchTaskResultLines,
  readonly richText: boolean,
};

export type Result = typeof initialResult | ParamsResult;

export type SectionHeader = string | undefined;
