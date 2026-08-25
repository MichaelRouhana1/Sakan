export type ListingStatus = "draft" | "active" | "archived" | "removed";
export type ListingQueue = "active" | "flagged" | "expired";
export type ListingActionKind = "archive" | "remove" | "restore";
export type ReportReason = "fake" | "inaccurate_utilities" | "already_rented";

export type ListingPhoto = {
  id: string;
  url: string;
  caption: string;
};

export type ListingReport = {
  id: string;
  reason: ReportReason;
  at: string;
};

export type AdminListing = {
  id: string;
  title: string;
  listingType: string;
  area: string;
  monthlyRentUsd: number;
  status: ListingStatus;
  expiresAt: string | null;
  publishedAt: string;
  poster: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  photos: ListingPhoto[];
  openReports: ListingReport[];
};

export function posterName(listing: AdminListing): string {
  return `${listing.poster.firstName} ${listing.poster.lastName}`.trim();
}

export function isExpired(listing: AdminListing, now = Date.now()): boolean {
  if (!listing.expiresAt) return false;
  return new Date(listing.expiresAt).getTime() < now;
}

export function listingQueue(listing: AdminListing): ListingQueue {
  if (listing.openReports.length > 0 && listing.status !== "removed") {
    return "flagged";
  }
  if (listing.status === "archived" || listing.status === "removed" || isExpired(listing)) {
    return "expired";
  }
  return "active";
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

export function reasonLabel(reason: ReportReason): string {
  if (reason === "fake") return "Fake listing";
  if (reason === "inaccurate_utilities") return "Utilities off";
  return "Already rented";
}

export function actionLabel(kind: ListingActionKind): string {
  if (kind === "archive") return "Archived";
  if (kind === "remove") return "Taken down";
  return "Restored";
}

export function typeLabel(type: string): string {
  if (type === "entire_apartment") return "Entire apartment";
  if (type === "studio") return "Studio";
  if (type === "private_room") return "Private room";
  if (type === "shared_dorm_bed") return "Shared dorm bed";
  return type;
}
