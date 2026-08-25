export type ExpiredQueue = "recent" | "archived" | "pending_deletion";
export type ExpiredActionKind = "nudge" | "archive" | "remove";

export type ExpiredPhoto = {
  id: string;
  url: string;
  caption: string;
};

export type ExpiredAsset = {
  id: string;
  title: string;
  listingType: string;
  area: string;
  monthlyRentUsd: number;
  expiresAt: string;
  queue: ExpiredQueue;
  nudgeCount: number;
  nudgedAt: string | null;
  poster: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  photos: ExpiredPhoto[];
};

/** Demo clock so “days since” stays stable in this build. */
export const ANCHOR_ISO = "2026-08-25T12:00:00.000Z";
export const ANCHOR_MS = Date.parse(ANCHOR_ISO);

/** Posters who renewed after a nudge and left this queue. */
export const SEED_RENEWED = 5;

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

export function typeLabel(type: string): string {
  if (type === "entire_apartment") return "Entire apartment";
  if (type === "studio") return "Studio";
  if (type === "private_room") return "Private room";
  if (type === "shared_dorm_bed") return "Shared dorm bed";
  return type;
}

export function queueLabel(queue: ExpiredQueue): string {
  if (queue === "recent") return "Recently expired";
  if (queue === "archived") return "Archived";
  return "Pending deletion";
}

export function actionLabel(kind: ExpiredActionKind): string {
  if (kind === "nudge") return "Nudge sent";
  if (kind === "archive") return "Kept archived";
  return "Deleted";
}

export function canNudge(asset: ExpiredAsset): boolean {
  if (asset.queue === "pending_deletion") return false;
  if (!asset.nudgedAt) return true;
  return daysBetween(asset.nudgedAt) >= 3;
}

export function canArchive(asset: ExpiredAsset): boolean {
  return asset.queue !== "archived";
}

export function reactivationRate(
  assets: ExpiredAsset[],
  seedRenewed = SEED_RENEWED,
): number {
  const nudgedHere = assets.filter((row) => row.nudgeCount > 0).length;
  const denom = seedRenewed + nudgedHere;
  if (denom === 0) return 0;
  return (seedRenewed / denom) * 100;
}

export function formatPct(value: number): string {
  return `${value.toFixed(0)}%`;
}
