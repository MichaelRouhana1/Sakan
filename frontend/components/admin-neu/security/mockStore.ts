import {
  DEMO_EXPORT_ACTOR,
  DEMO_SAVE_ACTOR,
  MOCK_EVENTS,
  MOCK_MATRIX,
  trafficForRange,
} from "./mockSecurity";
import {
  buildSpikeAlerts,
  cloneMatrix,
  toCsv,
  type AuditEvent,
  type ChartRangeId,
  type RoleMatrix,
  type SpikeAlert,
  type TrafficPoint,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

let events = clone(MOCK_EVENTS);
let savedMatrix = cloneMatrix(MOCK_MATRIX);
const ackedSpikeIds = new Set<string>();

export function resetSecurityMockStore(): void {
  events = clone(MOCK_EVENTS);
  savedMatrix = cloneMatrix(MOCK_MATRIX);
  ackedSpikeIds.clear();
}

export function listEventsFromStore(): AuditEvent[] {
  return clone(events).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function appendEventInStore(
  partial: Omit<AuditEvent, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): AuditEvent {
  const row: AuditEvent = {
    id: partial.id ?? `aud_${Date.now().toString(16)}`,
    actor: partial.actor,
    action: partial.action,
    detail: partial.detail,
    target: partial.target,
    ip: partial.ip,
    createdAt: partial.createdAt ?? new Date().toISOString(),
  };
  events = [row, ...events];
  return clone(row);
}

export function getSavedMatrixFromStore(): RoleMatrix {
  return cloneMatrix(savedMatrix);
}

export function saveMatrixInStore(matrix: RoleMatrix): {
  matrix: RoleMatrix;
  event: AuditEvent;
} {
  savedMatrix = cloneMatrix(matrix);
  const event = appendEventInStore({
    actor: DEMO_SAVE_ACTOR,
    action: "rbac.update",
    detail: "Saved role permission matrix (demo · not enforced on desks)",
    target: "Role matrix",
    ip: DEMO_SAVE_ACTOR.id === "adm_rania" ? "185.112.44.18" : "0.0.0.0",
  });
  return { matrix: cloneMatrix(savedMatrix), event };
}

export function listTrafficFromStore(range: ChartRangeId): TrafficPoint[] {
  return clone(trafficForRange(range));
}

export function listSpikesFromStore(range: ChartRangeId): SpikeAlert[] {
  return buildSpikeAlerts(trafficForRange(range)).filter(
    (row) => !ackedSpikeIds.has(row.id),
  );
}

export function ackSpikeInStore(spikeId: string): void {
  ackedSpikeIds.add(spikeId);
}

export function exportLogsInStore(
  rows: AuditEvent[],
  rangeLabel: string,
): { csv: string; event: AuditEvent; filename: string } {
  const csv = toCsv(rows);
  const day = new Date().toISOString().slice(0, 10);
  const filename = `skoun-security-audit-${rangeLabel}-${day}.csv`;
  const event = appendEventInStore({
    actor: DEMO_EXPORT_ACTOR,
    action: "logs.export",
    detail: `CSV · ${rows.length} rows · ${rangeLabel}`,
    target: "Audit ledger",
    ip: "194.126.19.33",
  });
  return { csv, event, filename };
}
