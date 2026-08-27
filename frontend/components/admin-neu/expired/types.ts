export type ExpiredListingStatus = "active" | "archived" | "removed";

/** Ops queues. `all` = no filter. Recent = past due still rescuable (pre-cron / past-due active). */
export type ExpiredQueue = "all" | "recent" | "archived" | "pending_deletion";

export type ExpiredActionKind =
  | "nudge"
  | "archive"
  | "queue_delete"
  | "purge"
  | "renew";

export type ExpiredSort = "expiresAt" | "daysSince" | "nudges" | "title";

export type ExpiredPhoto = {
  id: string;
  url: string;
  caption: string;
};

export type ExpiredHistoryEntry = {
  id: string;
  kind: ExpiredActionKind;
  note: string;
  at: string;
  actor: string;
};

export type ExpiredAsset = {
  id: string;
  title: string;
  listingType: string;
  area: string;
  monthlyRentUsd: number;
  expiresAt: string;
  /** Maps to listing.status for future API wiring. */
  listingStatus: ExpiredListingStatus;
  queue: Exclude<ExpiredQueue, "all">;
  nudgeCount: number;
  nudgedAt: string | null;
  lastNudgeMessage: string | null;
  poster: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  photos: ExpiredPhoto[];
  moderationHistory: ExpiredHistoryEntry[];
};

export type ExpiredQueueCounts = Record<ExpiredQueue, number>;

export type ListExpiredParams = {
  q?: string;
  queue?: ExpiredQueue;
  sort?: ExpiredSort;
  page?: number;
  pageSize?: number;
};

export type ListExpiredResult = {
  items: ExpiredAsset[];
  total: number;
  page: number;
  pageSize: number;
  counts: ExpiredQueueCounts;
  renewedSession: number;
  nudgedCount: number;
};

/**
 * Demo clock so “days since” stays stable in this build.
 * Nudge cooldown also measured against this anchor when comparing nudgedAt.
 */
export const ANCHOR_ISO = "2026-08-25T12:00:00.000Z";
export const ANCHOR_MS = Date.parse(ANCHOR_ISO);

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export const SORT_OPTIONS: { value: ExpiredSort; label: string }[] = [
  { value: "expiresAt", label: "Expiry" },
  { value: "daysSince", label: "Days since" },
  { value: "nudges", label: "Nudges" },
  { value: "title", label: "Title" },
];

export function posterName(asset: ExpiredAsset): string {
  return `${asset.poster.firstName} ${asset.poster.lastName}`.trim();
}

export function daysBetween(fromIso: string, toMs = ANCHOR_MS): number {
  const from = Date.parse(fromIso);
  if (Number.isNaN(from)) return 0;
  return Math.max(0, Math.floor((toMs - from) / 86_400_000));
}

export function daysSinceExpiry(asset: ExpiredAsset, now = ANCHOR_MS): number {
  return daysBetween(asset.expiresAt, now);
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function typeLabel(type: string): string {
  if (type === "entire_apartment") return "Entire apartment";
  if (type === "studio") return "Studio";
  if (type === "private_room") return "Private room";
  if (type === "shared_dorm_bed") return "Shared dorm bed";
  return type;
}

export function queueLabel(queue: ExpiredQueue): string {
  if (queue === "all") return "All";
  if (queue === "recent") return "Recently expired";
  if (queue === "archived") return "Archived";
  return "Pending deletion";
}

export function actionLabel(kind: ExpiredActionKind): string {
  if (kind === "nudge") return "Nudge sent";
  if (kind === "archive") return "Archived";
  if (kind === "queue_delete") return "Queued for deletion";
  if (kind === "purge") return "Permanently deleted";
  return "Marked renewed";
}

export function historyKindLabel(kind: ExpiredActionKind): string {
  return actionLabel(kind);
}

export function emptyCounts(): ExpiredQueueCounts {
  return {
    all: 0,
    recent: 0,
    archived: 0,
    pending_deletion: 0,
  };
}

export function countByQueue(assets: ExpiredAsset[]): ExpiredQueueCounts {
  const counts = emptyCounts();
  counts.all = assets.length;
  for (const row of assets) {
    counts[row.queue] += 1;
  }
  return counts;
}

export function canNudge(asset: ExpiredAsset): boolean {
  if (asset.queue === "pending_deletion") return false;
  if (!asset.nudgedAt) return true;
  return daysBetween(asset.nudgedAt) >= 3;
}

export function nudgeBlockedReason(asset: ExpiredAsset): string | null {
  if (asset.queue === "pending_deletion") {
    return "Nudges are off on the deletion queue";
  }
  if (!canNudge(asset)) {
    return "Wait 3 days since the last nudge";
  }
  return null;
}

export function canArchive(asset: ExpiredAsset): boolean {
  return asset.queue === "recent" || asset.queue === "pending_deletion";
}

export function canQueueDelete(asset: ExpiredAsset): boolean {
  return asset.queue === "recent" || asset.queue === "archived";
}

export function canPurge(asset: ExpiredAsset): boolean {
  return asset.queue === "pending_deletion";
}

export function canRenew(asset: ExpiredAsset): boolean {
  return asset.queue === "recent";
}

export function archiveButtonLabel(asset: ExpiredAsset): string {
  return asset.queue === "pending_deletion" ? "Return to archive" : "Archive";
}
