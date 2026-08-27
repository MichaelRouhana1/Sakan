export type ReportQueue =
  | "all"
  | "pending"
  | "in_review"
  | "resolved"
  | "dismissed";

export type ReportTicketQueue = Exclude<ReportQueue, "all">;

export type ReportReason = "fake" | "inaccurate_utilities" | "already_rented";

/**
 * Staff actions on a ticket.
 * claim / in_review = mock staff overlay (backend open has no claim yet).
 * dismiss = one ticket; dismiss_listing = all open on listing (matches current API).
 */
export type ReportActionKind =
  | "claim"
  | "unclaim"
  | "dismiss"
  | "dismiss_listing"
  | "remove"
  | "warn"
  | "restrict"
  | "ban"
  | "reopen";

export type ReportSort = "createdAt" | "reason";

export type AccountStatus = "active" | "restricted" | "banned";
export type ListingStatus = "draft" | "active" | "archived" | "removed";

export type ReportPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ReportListing = {
  id: string;
  title: string;
  area: string;
  monthlyRentUsd: number;
  status: ListingStatus;
  coverUrl: string;
  photos: { id: string; url: string; caption: string }[];
};

export type ReportPoster = ReportPerson & {
  accountStatus: AccountStatus;
  warningCount: number;
};

export type ModerationHistoryEntry = {
  id: string;
  kind: ReportActionKind;
  note: string;
  at: string;
  actor: string;
};

export type AdminReport = {
  id: string;
  reason: ReportReason;
  queue: ReportTicketQueue;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: string | null;
  note: string | null;
  /** Free-text from reporter for triage. */
  reporterNote: string | null;
  reporter: ReportPerson & { campus: string };
  listing: ReportListing;
  poster: ReportPoster;
  moderationHistory: ModerationHistoryEntry[];
};

export type ReportQueueCounts = Record<ReportQueue, number>;

export type ListReportsParams = {
  q?: string;
  queue?: ReportQueue;
  sort?: ReportSort;
  page?: number;
  pageSize?: number;
};

export type ListReportsResult = {
  items: AdminReport[];
  total: number;
  page: number;
  pageSize: number;
  counts: ReportQueueCounts;
  openCount: number;
};

export const ANCHOR_ISO = "2026-08-25T12:00:00.000Z";

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export const SORT_OPTIONS: { value: ReportSort; label: string }[] = [
  { value: "createdAt", label: "Newest" },
  { value: "reason", label: "Reason" },
];

export function personName(person: ReportPerson): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(person: ReportPerson): string {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
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

export function reasonLabel(reason: ReportReason): string {
  if (reason === "fake") return "Fake listing";
  if (reason === "inaccurate_utilities") return "Utilities off";
  return "Already rented";
}

export function queueLabel(queue: ReportQueue): string {
  if (queue === "all") return "All";
  if (queue === "pending") return "Pending";
  if (queue === "in_review") return "In review";
  if (queue === "resolved") return "Resolved";
  return "Dismissed";
}

export function listingStatusLabel(status: ListingStatus): string {
  if (status === "active") return "Live";
  if (status === "archived") return "Archived";
  if (status === "removed") return "Removed";
  return "Draft";
}

export function accountStatusLabel(status: AccountStatus): string {
  if (status === "restricted") return "Suspended";
  if (status === "banned") return "Banned";
  return "Active";
}

export function actionLabel(kind: ReportActionKind): string {
  if (kind === "claim") return "Claimed";
  if (kind === "unclaim") return "Unclaimed";
  if (kind === "dismiss") return "Dismissed";
  if (kind === "dismiss_listing") return "Dismissed listing reports";
  if (kind === "remove") return "Listing taken down";
  if (kind === "warn") return "Warning sent";
  if (kind === "restrict") return "Poster suspended";
  if (kind === "ban") return "Poster banned";
  return "Reopened";
}

export function historyKindLabel(kind: ReportActionKind): string {
  return actionLabel(kind);
}

export function emptyCounts(): ReportQueueCounts {
  return {
    all: 0,
    pending: 0,
    in_review: 0,
    resolved: 0,
    dismissed: 0,
  };
}

export function countByQueue(reports: AdminReport[]): ReportQueueCounts {
  const counts = emptyCounts();
  counts.all = reports.length;
  for (const row of reports) {
    counts[row.queue] += 1;
  }
  return counts;
}

export function isOpenQueue(queue: ReportTicketQueue): boolean {
  return queue === "pending" || queue === "in_review";
}

export function isClosedQueue(queue: ReportTicketQueue): boolean {
  return queue === "resolved" || queue === "dismissed";
}

export function canClaim(report: AdminReport): boolean {
  return report.queue === "pending";
}

export function canUnclaim(report: AdminReport): boolean {
  return report.queue === "in_review";
}

export function canDismiss(report: AdminReport): boolean {
  return isOpenQueue(report.queue);
}

export function canDismissListing(report: AdminReport): boolean {
  return isOpenQueue(report.queue);
}

export function canRemove(report: AdminReport): boolean {
  return (
    isOpenQueue(report.queue) && report.listing.status !== "removed"
  );
}

export function canWarn(report: AdminReport): boolean {
  return isOpenQueue(report.queue);
}

export function canRestrict(report: AdminReport): boolean {
  return isOpenQueue(report.queue) && report.poster.accountStatus === "active";
}

export function canBan(report: AdminReport): boolean {
  return (
    isOpenQueue(report.queue) && report.poster.accountStatus !== "banned"
  );
}

export function canReopen(report: AdminReport): boolean {
  return isClosedQueue(report.queue);
}

export function actionNeedsNote(kind: ReportActionKind): boolean {
  return kind !== "claim" && kind !== "unclaim";
}
