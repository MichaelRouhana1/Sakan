import { GRANT_TARGETS, MOCK_TRANSACTIONS } from "./mockTransactions";
import {
  ANCHOR_ISO,
  canRefund,
  emptyOverview,
  personName,
  type AdjustmentDraft,
  type DateRangeId,
  type LedgerTx,
  type ListPaymentsParams,
  type ListPaymentsResult,
  type PaymentsOverview,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

let txStore: LedgerTx[] = clone(MOCK_TRANSACTIONS);

export function resetPaymentsMockStore(): void {
  txStore = clone(MOCK_TRANSACTIONS);
}

function findOrThrow(id: string): LedgerTx {
  const row = txStore.find((item) => item.id === id);
  if (!row) throw new Error(`Transaction not found: ${id}`);
  return row;
}

function matchesQuery(row: LedgerTx, needle: string): boolean {
  if (!needle) return true;
  const listing = row.listingId ?? "";
  const hay =
    `${personName(row.user)} ${row.user.email} ${row.referenceId} ${listing} ${row.id}`.toLowerCase();
  return hay.includes(needle);
}

function inRange(iso: string, range: DateRangeId): boolean {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date(ANCHOR_ISO).getTime() - days * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= cutoff;
}

function buildOverview(rows: LedgerTx[]): PaymentsOverview {
  const overview = emptyOverview();
  for (const row of rows) {
    if (row.kind === "purchase" && row.status === "completed") {
      overview.revenueCents += row.amountUsdCents;
      overview.creditsPurchased += row.postCredits + row.boostCredits;
    }
    if (row.kind === "spend" && row.status === "completed") {
      overview.creditsSpent += Math.abs(row.postCredits) + Math.abs(row.boostCredits);
    }
    if (row.status === "completed") overview.completed += 1;
    if (row.status === "failed") overview.failed += 1;
    if (row.status === "refunded") overview.refunded += 1;
    if (row.status === "disputed") overview.disputed += 1;
  }
  return overview;
}

export function overviewFromStore(): PaymentsOverview {
  return buildOverview(txStore);
}

export function listPaymentsFromStore(
  params: ListPaymentsParams = {},
): ListPaymentsResult {
  const pageSize = params.pageSize ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const needle = params.q?.trim().toLowerCase() ?? "";
  const kind = params.kind ?? "all";
  const status = params.status ?? "all";
  const channel = params.channel ?? "all";
  const range = params.range ?? "all";

  const filtered = txStore
    .filter((row) => (kind === "all" ? true : row.kind === kind))
    .filter((row) => (status === "all" ? true : row.status === status))
    .filter((row) => (channel === "all" ? true : row.channel === channel))
    .filter((row) => inRange(row.createdAt, range))
    .filter((row) => matchesQuery(row, needle))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((row) => clone(row));

  return {
    items,
    total,
    page,
    pageSize,
    overview: buildOverview(txStore),
  };
}

export function getPaymentFromStore(id: string): LedgerTx {
  return clone(findOrThrow(id));
}

export function refundInStore(id: string, note: string): LedgerTx {
  const row = findOrThrow(id);
  if (!canRefund(row)) throw new Error("Only completed purchases can be refunded");
  const trimmed = note.trim();
  if (!trimmed) throw new Error("Staff note required");
  const refund: LedgerTx = {
    id: `tx-${Date.now().toString(36)}`,
    referenceId: `RF-${row.referenceId.slice(-6)}`,
    kind: "refund",
    status: "refunded",
    channel: row.channel,
    bundleType: row.bundleType,
    amountUsdCents: -Math.abs(row.amountUsdCents),
    postCredits: -Math.abs(row.postCredits),
    boostCredits: -Math.abs(row.boostCredits),
    createdAt: ANCHOR_ISO,
    note: trimmed,
    user: row.user,
    listingId: row.listingId,
  };
  const next: LedgerTx = { ...row, status: "refunded", note: trimmed };
  txStore = [refund, ...txStore.map((item) => (item.id === id ? next : item))];
  return clone(refund);
}

export function adjustInStore(draft: AdjustmentDraft): LedgerTx {
  const user = GRANT_TARGETS.find((item) => item.id === draft.userId);
  if (!user) throw new Error("Poster not found");
  const post = Number(draft.postCredits);
  const boost = Number(draft.boostCredits);
  const trimmed = draft.note.trim();
  if (!trimmed) throw new Error("Staff note required");
  if (!Number.isFinite(post) || !Number.isFinite(boost)) {
    throw new Error("Credits must be numbers");
  }
  const postInt = Math.trunc(post);
  const boostInt = Math.trunc(boost);
  if (postInt === 0 && boostInt === 0) {
    throw new Error("Adjust at least one credit");
  }
  const row: LedgerTx = {
    id: `tx-${Date.now().toString(36)}`,
    referenceId: `AJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    kind: "adjustment",
    status: "completed",
    channel: "staff",
    bundleType: "custom",
    amountUsdCents: 0,
    postCredits: postInt,
    boostCredits: boostInt,
    createdAt: ANCHOR_ISO,
    note: trimmed,
    user,
    listingId: null,
  };
  txStore = [row, ...txStore];
  return clone(row);
}

export function listGrantTargets(): LedgerTx["user"][] {
  return GRANT_TARGETS.map((row) => clone(row));
}
