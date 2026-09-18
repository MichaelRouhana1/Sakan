import { labelListingType } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

export type { ListingAmberPill } from "@/lib/listingCardBadges";
export {
  GRID_TAG_LIMIT,
  defaultCardBadgeKeys,
  isHighlightCardBadge,
  listingAmberPillGroups,
  listingAmberPills,
  listingCardPills,
} from "@/lib/listingCardBadges";

/** Bold Amber-style title — prefer landmark when seeded as a short name. */
export function listingCardTitle(listing: Listing): string {
  const title = listing.title?.trim();
  if (title) return title;
  const landmark = listing.landmark?.trim();
  if (landmark) return landmark;
  return `${labelListingType(listing.listingType)} in ${listing.area}`;
}

export function listingCardSubtitle(listing: Listing): string {
  return listing.area;
}

/**
 * PostGIS crow-flies meters → human line with walk estimate (~80 m/min).
 * e.g. "350m from AUB • ~4 min walk"
 */
export function formatCampusWalkLine(
  meters?: number | null,
  campusName?: string | null,
): string | null {
  const campus = campusName?.trim() || null;
  if (meters == null || !Number.isFinite(meters)) {
    return campus ? `Near ${campus}` : null;
  }

  const dist =
    meters < 1000
      ? `${Math.round(meters)}m`
      : `${(meters / 1000).toFixed(1)} km`;
  const walkMin = Math.max(1, Math.round(meters / 80));
  const place = campus ?? "campus";
  return `${dist} from ${place} • ~${walkMin} min walk`;
}
