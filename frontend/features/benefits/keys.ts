import type { BenefitFilters } from "./types";

/**
 * `authed` is part of the key because the API withholds `redemptionData` and
 * flips `redemptionLocked` for anonymous callers — signing in mid-session has
 * to produce a different cache entry, not a stale locked one.
 */
export const benefitKeys = {
  all: ["benefits"] as const,
  list: (filters: BenefitFilters, authed: boolean) =>
    [
      ...benefitKeys.all,
      "list",
      filters.university ?? null,
      filters.category ?? null,
      filters.isGlobal ?? null,
      authed,
    ] as const,
  detail: (id: string, authed: boolean) =>
    [...benefitKeys.all, "detail", id, authed] as const,
  redemption: (id: string) =>
    [...benefitKeys.all, "redemption", id] as const,
};
