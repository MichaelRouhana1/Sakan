import {
  labelListingType,
} from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

export type ListingAmberPill = {
  key: string;
  label: string;
};

/** Bold Amber-style title — prefer landmark when seeded as a short name. */
export function listingCardTitle(listing: Listing): string {
  const landmark = listing.landmark?.trim();
  if (landmark) return landmark;
  return `${labelListingType(listing.listingType)} in ${listing.area}`;
}

export function listingCardSubtitle(listing: Listing): string {
  return listing.area;
}

/**
 * Map schema fields → Amber-style pill labels.
 * Skips Direct Owner (no `posted_by` field). `anyone` → no gender pill.
 */
export function listingAmberPills(listing: Listing): ListingAmberPill[] {
  const pills: ListingAmberPill[] = [];

  if (listing.genderRestriction === "girls_only") {
    pills.push({ key: "girls_foyer", label: "👧 Girls Foyer" });
  } else if (listing.genderRestriction === "boys_only") {
    pills.push({ key: "boys_foyer", label: "👦 Boys Foyer" });
  }

  if (listing.electricity === "generator_24_7") {
    pills.push({ key: "power_24", label: "⚡ 24/7 Power" });
  } else if (listing.electricity === "solar") {
    pills.push({ key: "solar", label: "☀️ Solar Power" });
  } else if (listing.electricity === "scheduled_cuts") {
    pills.push({ key: "cuts", label: "⚡ Scheduled Cuts" });
  }

  if (listing.routerUps) {
    pills.push({ key: "ups_wifi", label: "📶 UPS Wi-Fi" });
  } else if (listing.wifiIncluded) {
    pills.push({ key: "wifi", label: "📶 Wi-Fi" });
  }

  if (listing.water === "state_well_24_7") {
    pills.push({ key: "water_24", label: "🚿 24/7 Water" });
  } else if (listing.water === "tank_delivery") {
    pills.push({ key: "tank", label: "🚿 Tank Delivery" });
  }

  if (listing.elevator24_7) {
    pills.push({ key: "elevator", label: "🛗 Elevator 24/7" });
  }

  if (listing.targetAudience === "students_only") {
    pills.push({ key: "students", label: "🎓 Students Only" });
  }

  return pills;
}

/**
 * PostGIS crow-flies meters → human line with walk estimate (~80 m/min).
 * e.g. "📍 350m from AUB • 🚶 ~4 min walk"
 */
export function formatCampusWalkLine(
  meters?: number | null,
  campusName?: string | null,
): string | null {
  const campus = campusName?.trim() || null;
  if (meters == null || !Number.isFinite(meters)) {
    return campus ? `📍 Near ${campus}` : null;
  }

  const dist =
    meters < 1000
      ? `${Math.round(meters)}m`
      : `${(meters / 1000).toFixed(1)} km`;
  const walkMin = Math.max(1, Math.round(meters / 80));
  const place = campus ?? "campus";
  return `📍 ${dist} from ${place} • 🚶 ~${walkMin} min walk`;
}
