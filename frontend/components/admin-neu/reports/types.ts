export type ReportQueue = "pending" | "in_review" | "resolved" | "dismissed";
export type ReportReason = "fake" | "inaccurate_utilities" | "already_rented";
export type ReportActionKind = "dismiss" | "remove" | "warn" | "restrict" | "claim";
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

export type AdminReport = {
  id: string;
  reason: ReportReason;
  queue: ReportQueue;
  createdAt: string;
  reviewedAt: string | null;
  reviewer: string | null;
  note: string | null;
  reporter: ReportPerson & { campus: string };
  listing: ReportListing;
  poster: ReportPerson & { accountStatus: AccountStatus };
};

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
