/**
 * API-shaped analytics source.
 * Today: in-memory mock store + 150ms delay.
 *
 * Mapping to current backend (honest):
 * - GET /api/admin/overview exists — 7 ops snapshots (pending txs, active
 *   listings, new posters this week). Not this time-series UI. Do not wire it here.
 * - No DAU / MAU / session / lastActive events.
 * - No retention cohort tables.
 * - users.createdAt + role could feed signups later; not exposed as a series API.
 *
 * Later, keep these signatures and swap bodies to:
 * - GET /api/admin/analytics/trends?from=&to=
 * - GET /api/admin/analytics/retention?from=&to=
 */
import { getTrendsFromStore } from "./mockStore";
import type { ListTrendsParams, TrendsResult } from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAdminTrends(
  params: ListTrendsParams,
): Promise<TrendsResult> {
  await delay();
  return getTrendsFromStore(params);
}
