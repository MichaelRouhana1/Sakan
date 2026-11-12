import type { Listing } from "@/types/listing";

export type HostListingStatusTone = "progress" | "action" | "live" | "muted";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function expiryTime(expiresAt: string | Date | null | undefined): number | null {
  if (expiresAt == null || expiresAt === "") return null;
  const time = new Date(expiresAt).getTime();
  return Number.isFinite(time) ? time : null;
}

/** True when the stored expiry instant is now or earlier. */
export function isPastExpiry(
  expiresAt: string | Date | null | undefined,
  now = Date.now(),
): boolean {
  const time = expiryTime(expiresAt);
  return time != null && time <= now;
}

/** True during the three days before expiry, while the unit is still in the future. */
export function isExpiringSoon(
  expiresAt: string | Date | null | undefined,
  now = Date.now(),
): boolean {
  const time = expiryTime(expiresAt);
  return time != null && time > now && time - now <= THREE_DAYS_MS;
}

type TimedListing = Pick<Listing, "status" | "expiresAt"> & { availability?: string };

export function offersRenewal(listing: TimedListing): boolean {
  return Boolean(expiryTime(listing.expiresAt) != null && listing.availability !== "rented" &&
    (listing.status === "active" || listing.status === "archived"));
}

export function hostListingStatus(listing: TimedListing, now = Date.now()): {
  label: string; tone: HostListingStatusTone;
} {
  if (listing.status === "draft") return { label: "In progress", tone: "progress" };
  if (listing.status === "removed") return { label: "Removed", tone: "muted" };
  if (listing.availability === "rented") return { label: "Rented", tone: "muted" };
  if (isPastExpiry(listing.expiresAt, now)) return { label: "Expired", tone: "action" };
  if (listing.status === "archived") return { label: "Archived", tone: "muted" };
  const time = expiryTime(listing.expiresAt);
  if (time == null) return { label: "Expiry unavailable", tone: "muted" };
  const remaining = time - now;
  if (remaining <= THREE_DAYS_MS) {
    const unit = remaining >= 86400000 ? "day" : remaining >= 3600000 ? "hour" : "minute";
    const size = unit === "day" ? 86400000 : unit === "hour" ? 3600000 : 60000;
    const count = Math.ceil(remaining / size);
    return { label: `Expiring in ${count} ${unit}${count === 1 ? "" : "s"}`, tone: "action" };
  }
  return { label: `Live · ${Math.ceil(remaining / 86400000)} days left`, tone: "live" };
}

export function isDraftListing(listing: Listing): boolean {
  return listing.status === "draft";
}
