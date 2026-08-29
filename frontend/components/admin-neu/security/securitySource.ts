/**
 * API-shaped security source.
 * Today: in-memory mock store + 150ms delay.
 *
 * Mapping to current backend (honest):
 * - GET /api/admin/audit exists (actorKind, actorClerkId, action, entityType,
 *   entityId, payload, createdAt). Demo enriches with name/email/tier/IP.
 * - Staff gate is binary requireAdmin — no RBAC tiers API.
 * - No traffic / scrape / sessions / IP-ban APIs.
 * - Demo matrix does not gate other admin desks.
 *
 * Later, keep these signatures and swap bodies to:
 * - GET /api/admin/audit (+ enrich Clerk profiles)
 * - PUT /api/admin/rbac (if tiers ship)
 * - GET /api/admin/security/traffic (if metrics ship)
 */
import {
  ackSpikeInStore,
  exportLogsInStore,
  getSavedMatrixFromStore,
  listEventsFromStore,
  listSpikesFromStore,
  listTrafficFromStore,
  saveMatrixInStore,
} from "./mockStore";
import type {
  AuditEvent,
  ChartRangeId,
  RoleMatrix,
  SpikeAlert,
  TrafficPoint,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type SecuritySnapshot = {
  events: AuditEvent[];
  matrix: RoleMatrix;
};

export async function loadAdminSecurity(): Promise<SecuritySnapshot> {
  await delay();
  return {
    events: listEventsFromStore(),
    matrix: getSavedMatrixFromStore(),
  };
}

export async function listAdminAuditEvents(): Promise<AuditEvent[]> {
  await delay();
  return listEventsFromStore();
}

export async function getAdminRoleMatrix(): Promise<RoleMatrix> {
  await delay();
  return getSavedMatrixFromStore();
}

export async function saveAdminRoleMatrix(
  matrix: RoleMatrix,
): Promise<{ matrix: RoleMatrix; event: AuditEvent }> {
  await delay();
  return saveMatrixInStore(matrix);
}

export async function listAdminTraffic(
  range: ChartRangeId,
): Promise<TrafficPoint[]> {
  await delay();
  return listTrafficFromStore(range);
}

export async function listAdminSpikeAlerts(
  range: ChartRangeId,
): Promise<SpikeAlert[]> {
  await delay();
  return listSpikesFromStore(range);
}

export async function acknowledgeAdminSpike(spikeId: string): Promise<void> {
  await delay();
  ackSpikeInStore(spikeId);
}

export async function exportAdminAuditLogs(
  rows: AuditEvent[],
  rangeLabel: string,
): Promise<{ csv: string; event: AuditEvent; filename: string }> {
  await delay();
  return exportLogsInStore(rows, rangeLabel);
}
