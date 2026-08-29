/**
 * API-shaped conversion source.
 * Today: in-memory mock store + 150ms delay.
 *
 * Mapping to current backend (honest):
 * - GET /api/admin/overview is an ops snapshot, not a wizard funnel.
 * - listings.status=draft exists; there is no lastStepId / wizard event log.
 * - No abandoned-draft remind endpoint or notification send.
 *
 * Later, keep these signatures and swap bodies to:
 * - GET  /api/admin/analytics/funnel?from=&to=
 * - GET  /api/admin/analytics/abandoned?from=&to=&step=
 * - POST /api/admin/analytics/abandoned/:id/remind
 */
import {
  getFunnelFromStore,
  listAbandonedFromStore,
  remindInStore,
} from "./mockStore";
import type {
  AbandonedDraft,
  FunnelResult,
  ListAbandonedParams,
  ListFunnelParams,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAdminFunnel(
  params: ListFunnelParams,
): Promise<FunnelResult> {
  await delay();
  return getFunnelFromStore(params);
}

export async function listAdminAbandoned(
  params: ListAbandonedParams,
): Promise<AbandonedDraft[]> {
  await delay();
  return listAbandonedFromStore(params);
}

export async function remindAdminDraft(id: string): Promise<AbandonedDraft> {
  await delay();
  return remindInStore(id);
}
