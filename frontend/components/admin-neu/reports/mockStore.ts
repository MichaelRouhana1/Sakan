import { MOCK_REPORTS } from "./mockReports";
import {
  ANCHOR_ISO,
  canBan,
  canClaim,
  canDismiss,
  canRemove,
  canReopen,
  canRestrict,
  canUnclaim,
  canWarn,
  countByQueue,
  isOpenQueue,
  personName,
  type AdminReport,
  type ListReportsParams,
  type ListReportsResult,
  type ModerationHistoryEntry,
  type ReportActionKind,
  type ReportQueue,
  type ReportSort,
  type ReportTicketQueue,
} from "./types";

function cloneReports(seed: AdminReport[]): AdminReport[] {
  return structuredClone(seed);
}

let store: AdminReport[] = cloneReports(MOCK_REPORTS);

export function resetReportsMockStore(): void {
  store = cloneReports(MOCK_REPORTS);
}

export function getReportsStoreSnapshot(): AdminReport[] {
  return store;
}

function historyEntry(
  kind: ReportActionKind,
  note: string,
): ModerationHistoryEntry {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    note,
    at: ANCHOR_ISO,
    actor: "You",
  };
}

function findOrThrow(id: string): AdminReport {
  const row = store.find((item) => item.id === id);
  if (!row) throw new Error(`Report not found: ${id}`);
  return row;
}

function matchesQuery(row: AdminReport, needle: string): boolean {
  if (!needle) return true;
  const hay =
    `${row.listing.title} ${row.listing.area} ${personName(row.reporter)} ${row.reporter.email} ${personName(row.poster)} ${row.poster.email} ${row.id} ${row.listing.id}`.toLowerCase();
  return hay.includes(needle);
}

function sortReports(rows: AdminReport[], sort: ReportSort): AdminReport[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "reason") return a.reason.localeCompare(b.reason);
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  return copy;
}

function syncPoster(
  posterId: string,
  patch: Partial<AdminReport["poster"]>,
) {
  store = store.map((row) =>
    row.poster.id === posterId
      ? { ...row, poster: { ...row.poster, ...patch } }
      : row,
  );
}

export function listFromStore(params: ListReportsParams = {}): ListReportsResult {
  const queue: ReportQueue = params.queue ?? "all";
  const sort: ReportSort = params.sort ?? "createdAt";
  const pageSize = params.pageSize ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const needle = params.q?.trim().toLowerCase() ?? "";

  const counts = countByQueue(store);
  const filtered = sortReports(
    store.filter((row) => {
      if (queue !== "all" && row.queue !== queue) return false;
      return matchesQuery(row, needle);
    }),
    sort,
  );
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered
    .slice(start, start + pageSize)
    .map((row) => structuredClone(row));

  return {
    items,
    total,
    page,
    pageSize,
    counts,
    openCount: counts.pending + counts.in_review,
  };
}

export function getFromStore(id: string): AdminReport {
  return structuredClone(findOrThrow(id));
}

export function relatedFromStore(
  listingId: string,
  excludeId: string,
): AdminReport[] {
  return store
    .filter((row) => row.listing.id === listingId && row.id !== excludeId)
    .map((row) => structuredClone(row));
}

export function findByListingId(listingId: string): AdminReport | null {
  const open = store.find(
    (row) => row.listing.id === listingId && isOpenQueue(row.queue),
  );
  if (open) return structuredClone(open);
  const any = store.find((row) => row.listing.id === listingId);
  return any ? structuredClone(any) : null;
}

export function claimInStore(id: string, note = ""): AdminReport {
  const row = findOrThrow(id);
  if (!canClaim(row)) throw new Error("Only pending tickets can be claimed");
  const next: AdminReport = {
    ...row,
    queue: "in_review",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    moderationHistory: [
      ...row.moderationHistory,
      historyEntry("claim", note || "Started review"),
    ],
  };
  store = store.map((item) => (item.id === id ? next : item));
  return next;
}

export function unclaimInStore(id: string, note = ""): AdminReport {
  const row = findOrThrow(id);
  if (!canUnclaim(row)) throw new Error("Only in-review tickets can be unclaimed");
  const next: AdminReport = {
    ...row,
    queue: "pending",
    reviewer: null,
    reviewedAt: null,
    moderationHistory: [
      ...row.moderationHistory,
      historyEntry("unclaim", note || "Released claim"),
    ],
  };
  store = store.map((item) => (item.id === id ? next : item));
  return next;
}

export function dismissInStore(id: string, note: string): AdminReport {
  const row = findOrThrow(id);
  if (!canDismiss(row)) throw new Error("Ticket is already closed");
  const next: AdminReport = {
    ...row,
    queue: "dismissed",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note,
    moderationHistory: [...row.moderationHistory, historyEntry("dismiss", note)],
  };
  store = store.map((item) => (item.id === id ? next : item));
  return next;
}

export function dismissListingInStore(
  listingId: string,
  note: string,
  focusId?: string,
): AdminReport[] {
  const open = store.filter(
    (row) => row.listing.id === listingId && isOpenQueue(row.queue),
  );
  if (open.length === 0) throw new Error("No open reports on this listing");
  const updated: AdminReport[] = [];
  store = store.map((row) => {
    if (row.listing.id !== listingId || !isOpenQueue(row.queue)) return row;
    const next: AdminReport = {
      ...row,
      queue: "dismissed",
      reviewer: "You",
      reviewedAt: ANCHOR_ISO,
      note: row.id === focusId || !focusId ? note : row.note ?? note,
      moderationHistory: [
        ...row.moderationHistory,
        historyEntry("dismiss_listing", note),
      ],
    };
    updated.push(next);
    return next;
  });
  return updated;
}

export function removeInStore(id: string, note: string): AdminReport {
  const row = findOrThrow(id);
  if (!canRemove(row)) throw new Error("Cannot take down from a closed ticket");

  const listingId = row.listing.id;
  store = store.map((item) => {
    if (item.listing.id !== listingId) return item;
    const listing = { ...item.listing, status: "removed" as const };
    if (!isOpenQueue(item.queue)) {
      return { ...item, listing };
    }
    return {
      ...item,
      listing,
      queue: "resolved" as ReportTicketQueue,
      reviewer: item.id === id ? "You" : item.reviewer ?? "You",
      reviewedAt: ANCHOR_ISO,
      note: item.id === id ? note : item.note,
      moderationHistory: [
        ...item.moderationHistory,
        historyEntry("remove", note),
      ],
    };
  });
  return findOrThrow(id);
}

export function warnInStore(id: string, note: string): AdminReport {
  const row = findOrThrow(id);
  if (!canWarn(row)) throw new Error("Cannot warn on a closed ticket");
  const warningCount = row.poster.warningCount + 1;
  const next: AdminReport = {
    ...row,
    queue: "resolved",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note,
    poster: { ...row.poster, warningCount },
    moderationHistory: [...row.moderationHistory, historyEntry("warn", note)],
  };
  store = store.map((item) => (item.id === id ? next : item));
  syncPoster(row.poster.id, { warningCount });
  return findOrThrow(id);
}

export function restrictInStore(id: string, note: string): AdminReport {
  const row = findOrThrow(id);
  if (!canRestrict(row)) throw new Error("Cannot suspend this poster");
  const next: AdminReport = {
    ...row,
    queue: "resolved",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note,
    poster: { ...row.poster, accountStatus: "restricted" },
    moderationHistory: [
      ...row.moderationHistory,
      historyEntry("restrict", note),
    ],
  };
  store = store.map((item) => (item.id === id ? next : item));
  syncPoster(row.poster.id, { accountStatus: "restricted" });
  return findOrThrow(id);
}

export function banInStore(id: string, note: string): AdminReport {
  const row = findOrThrow(id);
  if (!canBan(row)) throw new Error("Cannot ban this poster");
  const next: AdminReport = {
    ...row,
    queue: "resolved",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note,
    poster: { ...row.poster, accountStatus: "banned" },
    moderationHistory: [...row.moderationHistory, historyEntry("ban", note)],
  };
  store = store.map((item) => (item.id === id ? next : item));
  syncPoster(row.poster.id, { accountStatus: "banned" });
  return findOrThrow(id);
}

export function reopenInStore(id: string, note: string): AdminReport {
  const row = findOrThrow(id);
  if (!canReopen(row)) throw new Error("Only closed tickets can be reopened");
  const next: AdminReport = {
    ...row,
    queue: "pending",
    reviewer: null,
    reviewedAt: null,
    note: null,
    moderationHistory: [...row.moderationHistory, historyEntry("reopen", note)],
  };
  store = store.map((item) => (item.id === id ? next : item));
  return next;
}

export function bulkInStore(
  ids: string[],
  kind: Extract<ReportActionKind, "claim" | "dismiss" | "remove">,
  note: string,
): AdminReport[] {
  const results: AdminReport[] = [];
  if (kind === "remove") {
    const seenListings = new Set<string>();
    for (const id of ids) {
      try {
        const row = findOrThrow(id);
        if (seenListings.has(row.listing.id)) continue;
        seenListings.add(row.listing.id);
        results.push(removeInStore(id, note));
      } catch {
        // skip
      }
    }
    return results;
  }
  for (const id of ids) {
    try {
      if (kind === "claim") results.push(claimInStore(id, note || "Bulk claim"));
      else results.push(dismissInStore(id, note));
    } catch {
      // skip
    }
  }
  return results;
}
