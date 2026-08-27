import { MOCK_EXPIRED } from "./mockExpired";
import {
  ANCHOR_ISO,
  ANCHOR_MS,
  canArchive,
  canNudge,
  canPurge,
  canQueueDelete,
  canRenew,
  countByQueue,
  daysSinceExpiry,
  posterName,
  type ExpiredActionKind,
  type ExpiredAsset,
  type ExpiredHistoryEntry,
  type ExpiredQueue,
  type ExpiredSort,
  type ListExpiredParams,
  type ListExpiredResult,
} from "./types";

function cloneAssets(seed: ExpiredAsset[]): ExpiredAsset[] {
  return structuredClone(seed);
}

let store: ExpiredAsset[] = cloneAssets(MOCK_EXPIRED);
let renewedSession = 0;

export function resetExpiredMockStore(): void {
  store = cloneAssets(MOCK_EXPIRED);
  renewedSession = 0;
}

export function getExpiredStoreSnapshot(): ExpiredAsset[] {
  return store;
}

export function getRenewedSessionCount(): number {
  return renewedSession;
}

function historyEntry(
  kind: ExpiredActionKind,
  note: string,
): ExpiredHistoryEntry {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    note,
    at: ANCHOR_ISO,
    actor: "You",
  };
}

function findOrThrow(id: string): ExpiredAsset {
  const row = store.find((item) => item.id === id);
  if (!row) throw new Error(`Expired asset not found: ${id}`);
  return row;
}

function replace(id: string, next: ExpiredAsset): ExpiredAsset {
  store = store.map((row) => (row.id === id ? next : row));
  return next;
}

function remove(id: string): void {
  store = store.filter((row) => row.id !== id);
}

function matchesQuery(row: ExpiredAsset, needle: string): boolean {
  if (!needle) return true;
  const hay =
    `${row.title} ${row.area} ${posterName(row)} ${row.poster.email} ${row.id}`.toLowerCase();
  return hay.includes(needle);
}

function sortAssets(rows: ExpiredAsset[], sort: ExpiredSort): ExpiredAsset[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "nudges") return b.nudgeCount - a.nudgeCount;
    if (sort === "daysSince") {
      return daysSinceExpiry(b) - daysSinceExpiry(a);
    }
    return a.expiresAt < b.expiresAt ? -1 : 1;
  });
  return copy;
}

export function listFromStore(params: ListExpiredParams = {}): ListExpiredResult {
  const queue: ExpiredQueue = params.queue ?? "all";
  const sort: ExpiredSort = params.sort ?? "expiresAt";
  const pageSize = params.pageSize ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const needle = params.q?.trim().toLowerCase() ?? "";

  const counts = countByQueue(store);
  const filtered = sortAssets(
    store.filter((row) => {
      if (queue !== "all" && row.queue !== queue) return false;
      return matchesQuery(row, needle);
    }),
    sort,
  );
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    counts,
    renewedSession,
    nudgedCount: store.filter((row) => row.nudgeCount > 0).length,
  };
}

export function getFromStore(id: string): ExpiredAsset {
  return structuredClone(findOrThrow(id));
}

export function nudgeInStore(id: string, note: string): ExpiredAsset {
  const row = findOrThrow(id);
  if (!canNudge(row)) throw new Error("Cannot nudge this listing now");
  return replace(id, {
    ...row,
    nudgeCount: row.nudgeCount + 1,
    nudgedAt: ANCHOR_ISO,
    lastNudgeMessage: note,
    moderationHistory: [...row.moderationHistory, historyEntry("nudge", note)],
  });
}

export function archiveInStore(id: string, note: string): ExpiredAsset {
  const row = findOrThrow(id);
  if (!canArchive(row)) throw new Error("Cannot archive this listing");
  return replace(id, {
    ...row,
    queue: "archived",
    listingStatus: "archived",
    moderationHistory: [...row.moderationHistory, historyEntry("archive", note)],
  });
}

export function queueDeleteInStore(id: string, note: string): ExpiredAsset {
  const row = findOrThrow(id);
  if (!canQueueDelete(row)) throw new Error("Cannot queue this listing for deletion");
  return replace(id, {
    ...row,
    queue: "pending_deletion",
    listingStatus: "removed",
    moderationHistory: [
      ...row.moderationHistory,
      historyEntry("queue_delete", note),
    ],
  });
}

export function purgeInStore(id: string, note: string): ExpiredAsset {
  const row = findOrThrow(id);
  if (!canPurge(row)) throw new Error("Only pending deletion can be purged");
  const snapshot = {
    ...row,
    moderationHistory: [...row.moderationHistory, historyEntry("purge", note)],
  };
  remove(id);
  return snapshot;
}

export function renewInStore(id: string, note: string): ExpiredAsset {
  const row = findOrThrow(id);
  if (!canRenew(row)) throw new Error("Only recently expired can be renewed");
  const nextExpiry = new Date(ANCHOR_MS + 30 * 24 * 60 * 60 * 1000).toISOString();
  const snapshot: ExpiredAsset = {
    ...row,
    expiresAt: nextExpiry,
    listingStatus: "active",
    moderationHistory: [...row.moderationHistory, historyEntry("renew", note)],
  };
  remove(id);
  renewedSession += 1;
  return snapshot;
}

export function bulkInStore(
  ids: string[],
  kind: Extract<
    ExpiredActionKind,
    "nudge" | "archive" | "queue_delete" | "purge"
  >,
  note: string,
): ExpiredAsset[] {
  const results: ExpiredAsset[] = [];
  for (const id of ids) {
    try {
      if (kind === "nudge") results.push(nudgeInStore(id, note));
      else if (kind === "archive") results.push(archiveInStore(id, note));
      else if (kind === "queue_delete") results.push(queueDeleteInStore(id, note));
      else results.push(purgeInStore(id, note));
    } catch {
      // Skip rows that cannot accept this action.
    }
  }
  return results;
}
