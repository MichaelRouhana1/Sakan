import { ANCHOR_TS, DATA_END, DATA_START, MOCK_DAYS, MOCK_DRAFTS } from "./mockConversion";
import {
  priorDays,
  sliceDays,
  type AbandonedDraft,
  type FunnelResult,
  type ListAbandonedParams,
  type ListFunnelParams,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

let days = clone(MOCK_DAYS);
let drafts = clone(MOCK_DRAFTS);

export function resetConversionMockStore(): void {
  days = clone(MOCK_DAYS);
  drafts = clone(MOCK_DRAFTS);
}

export function getFunnelFromStore(params: ListFunnelParams): FunnelResult {
  const current = sliceDays(days, params.range, params.customFrom, params.customTo);
  return {
    days: clone(current),
    prior: clone(priorDays(days, current)),
    dataStart: DATA_START,
    dataEnd: DATA_END,
  };
}

export function listAbandonedFromStore(
  params: ListAbandonedParams,
): AbandonedDraft[] {
  const step = params.step ?? "all";
  return drafts
    .filter((draft) => {
      const day = draft.lastActiveAt.slice(0, 10);
      return day >= params.from && day <= params.to;
    })
    .filter((draft) => (step === "all" ? true : draft.lastStepId === step))
    .map((row) => clone(row));
}

export function remindInStore(id: string): AbandonedDraft {
  const row = drafts.find((item) => item.id === id);
  if (!row) throw new Error(`Draft not found: ${id}`);
  if (row.reminderSentAt) throw new Error("Reminder already sent");
  const next = { ...row, reminderSentAt: ANCHOR_TS };
  drafts = drafts.map((item) => (item.id === id ? next : item));
  return clone(next);
}
