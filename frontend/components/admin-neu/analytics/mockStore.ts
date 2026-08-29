import { DATA_END, DATA_START, MOCK_DAYS } from "./mockTrends";
import {
  priorSlice,
  retentionFromSlice,
  sliceRange,
  weekSignupsOf,
  type ListTrendsParams,
  type TrendsResult,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

let days = clone(MOCK_DAYS);

export function resetAnalyticsMockStore(): void {
  days = clone(MOCK_DAYS);
}

export function getTrendsFromStore(params: ListTrendsParams): TrendsResult {
  const points = sliceRange(days, params.range, params.customFrom, params.customTo);
  const prior = priorSlice(days, points);
  return {
    points: clone(points),
    prior: clone(prior),
    retention: retentionFromSlice(points),
    dataStart: DATA_START,
    dataEnd: DATA_END,
    weekSignups: weekSignupsOf(points),
    priorWeekSignups: weekSignupsOf(prior),
  };
}
