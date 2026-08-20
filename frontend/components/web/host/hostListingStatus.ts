import { daysUntil } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

export type HostListingStatusTone = "progress" | "action" | "live" | "muted";

export function hostListingStatus(listing: Listing): {
  label: string;
  tone: HostListingStatusTone;
} {
  if (listing.status === "active") {
    const days = daysUntil(listing.expiresAt);
    if (days != null && days >= 0 && days <= 5) {
      return { label: "Action required", tone: "action" };
    }
    return { label: "Live", tone: "live" };
  }
  if (listing.status === "draft") {
    return { label: "In progress", tone: "progress" };
  }
  if (listing.status === "archived") {
    return { label: "Archived", tone: "muted" };
  }
  return { label: "Removed", tone: "muted" };
}

export function isDraftListing(listing: Listing): boolean {
  return listing.status === "draft";
}
