export type ListingStatus = "draft" | "active" | "archived" | "removed";

/** Inventory queues on Listings. `all` = no status filter. Past-due is a badge — Expired page owns renew/nudge. */
export type ListingQueue =
  | "all"
  | "active"
  | "flagged"
  | "draft"
  | "archived"
  | "removed";

export type ListingActionKind =
  | "archive"
  | "remove"
  | "restore"
  | "dismiss_reports";

export type ListingSort =
  | "publishedAt"
  | "expiresAt"
  | "rent"
  | "flags";

export type ReportReason = "fake" | "inaccurate_utilities" | "already_rented";

export type ElectricityStatus = "solar" | "generator_24_7" | "scheduled_cuts";
export type WaterStatus = "state_well_24_7" | "tank_delivery";

export type ListingPhoto = {
  id: string;
  url: string;
  caption: string;
  /** Soft staff flag — mock only; not a hard delete. */
  flagged?: boolean;
};

export type ListingReport = {
  id: string;
  reason: ReportReason;
  at: string;
};

export type ModerationHistoryEntry = {
  id: string;
  kind: ListingActionKind | "edit" | "flag_photo" | "clear_photo_flag";
  note: string;
  at: string;
  actor: string;
};

export type AdminListing = {
  id: string;
  title: string;
  description: string;
  listingType: string;
  area: string;
  landmark: string;
  monthlyRentUsd: number;
  status: ListingStatus;
  /**
   * Past expiresAt while status stays active is intentional in mock
   * (cron would archive in prod). Shown as Past due badge + link to /admin/expired.
   */
  expiresAt: string | null;
  publishedAt: string | null;
  boostedUntil: string | null;
  viewCount: number;
  contactName: string;
  contactPhone: string;
  whatsappNumber: string;
  electricity: ElectricityStatus;
  water: WaterStatus;
  wifiIncluded: boolean;
  bedrooms: number;
  bathrooms: number;
  poster: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  photos: ListingPhoto[];
  openReports: ListingReport[];
  moderationHistory: ModerationHistoryEntry[];
};

/** Staff edit patch — subset of listing fields, mirrors future admin PATCH. */
export type ListingEditPatch = {
  title: string;
  description: string;
  area: string;
  landmark: string;
  monthlyRentUsd: number;
  listingType: string;
  contactName: string;
  contactPhone: string;
  whatsappNumber: string;
  electricity: ElectricityStatus;
  water: WaterStatus;
  wifiIncluded: boolean;
  bedrooms: number;
  bathrooms: number;
};

export type ListingQueueCounts = Record<ListingQueue, number>;

export type ListListingsParams = {
  q?: string;
  queue?: ListingQueue;
  sort?: ListingSort;
  page?: number;
  pageSize?: number;
};

export type ListListingsResult = {
  items: AdminListing[];
  total: number;
  page: number;
  pageSize: number;
  counts: ListingQueueCounts;
};

export function posterName(listing: AdminListing): string {
  return `${listing.poster.firstName} ${listing.poster.lastName}`.trim();
}

/** True when expiresAt is in the past. Independent of queue (badge only). */
export function isPastDue(listing: AdminListing, now = Date.now()): boolean {
  if (!listing.expiresAt) return false;
  if (listing.status !== "active" && listing.status !== "draft") return false;
  return new Date(listing.expiresAt).getTime() < now;
}

/** @deprecated Use isPastDue — kept for call-site migration. */
export function isExpired(listing: AdminListing, now = Date.now()): boolean {
  return isPastDue(listing, now);
}

export function listingQueue(
  listing: AdminListing,
): Exclude<ListingQueue, "all"> {
  if (listing.status === "removed") return "removed";
  if (listing.status === "draft") return "draft";
  if (listing.openReports.length > 0) return "flagged";
  if (listing.status === "archived") return "archived";
  return "active";
}

export function emptyCounts(): ListingQueueCounts {
  return {
    all: 0,
    active: 0,
    flagged: 0,
    draft: 0,
    archived: 0,
    removed: 0,
  };
}

export function countByQueue(listings: AdminListing[]): ListingQueueCounts {
  const counts = emptyCounts();
  counts.all = listings.length;
  for (const row of listings) {
    counts[listingQueue(row)] += 1;
  }
  return counts;
}

export function formatDay(iso: string | null): string {
  if (!iso) return "—";
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

export function statusLabel(status: ListingStatus): string {
  if (status === "active") return "Live";
  if (status === "archived") return "Archived";
  if (status === "removed") return "Removed";
  return "Draft";
}

export function queueLabel(queue: ListingQueue): string {
  if (queue === "all") return "All";
  if (queue === "active") return "Active";
  if (queue === "flagged") return "Flagged";
  if (queue === "draft") return "Draft";
  if (queue === "archived") return "Archived";
  return "Removed";
}

export function reasonLabel(reason: ReportReason): string {
  if (reason === "fake") return "Fake listing";
  if (reason === "inaccurate_utilities") return "Utilities off";
  return "Already rented";
}

export function actionLabel(kind: ListingActionKind): string {
  if (kind === "archive") return "Archived";
  if (kind === "remove") return "Taken down";
  if (kind === "dismiss_reports") return "Reports dismissed";
  return "Restored";
}

export function typeLabel(type: string): string {
  if (type === "entire_apartment") return "Entire apartment";
  if (type === "studio") return "Studio";
  if (type === "private_room") return "Private room";
  if (type === "shared_dorm_bed") return "Shared dorm bed";
  return type;
}

export function electricityLabel(value: ElectricityStatus): string {
  if (value === "solar") return "Solar";
  if (value === "generator_24_7") return "Generator 24/7";
  return "Scheduled cuts";
}

export function waterLabel(value: WaterStatus): string {
  if (value === "state_well_24_7") return "State / well 24/7";
  return "Tank delivery";
}

export function historyKindLabel(
  kind: ModerationHistoryEntry["kind"],
): string {
  if (kind === "edit") return "Edited";
  if (kind === "flag_photo") return "Photo flagged";
  if (kind === "clear_photo_flag") return "Photo flag cleared";
  return actionLabel(kind);
}

export const LISTING_TYPE_OPTIONS = [
  "entire_apartment",
  "studio",
  "private_room",
  "shared_dorm_bed",
] as const;

export const ELECTRICITY_OPTIONS: ElectricityStatus[] = [
  "solar",
  "generator_24_7",
  "scheduled_cuts",
];

export const WATER_OPTIONS: WaterStatus[] = [
  "state_well_24_7",
  "tank_delivery",
];

export const SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "publishedAt", label: "Published" },
  { value: "expiresAt", label: "Expiry" },
  { value: "rent", label: "Rent" },
  { value: "flags", label: "Flags" },
];

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
