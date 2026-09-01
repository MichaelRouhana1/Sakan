import type { Listing } from "@/types/listing";

/**
 * Campus-hub list tiers (UI only — browse query is still unbounded).
 * First value is “near campus”; later values are commute bands.
 */
export const CAMPUS_DISTANCE_TIERS_KM = [2, 5, 10] as const;
export const CAMPUS_NEAR_RADIUS_KM = CAMPUS_DISTANCE_TIERS_KM[0];
export const CAMPUS_NEAR_RADIUS_M = CAMPUS_NEAR_RADIUS_KM * 1000;
export const CAMPUS_DISTANCE_TIERS_M = CAMPUS_DISTANCE_TIERS_KM.map(
  (km) => km * 1000,
);

export const CAMPUS_FAR_SEPARATOR_KEY = "campus-far-separator";

export type MixedListingRow =
  | { kind: "listing"; listing: Listing }
  | { kind: "separator"; km: number; label: string };

export function campusFarSeparatorKey(km: number): string {
  return `${CAMPUS_FAR_SEPARATOR_KEY}-${km}`;
}

export function formatCampusNearThresholdKm(
  km: number = CAMPUS_NEAR_RADIUS_KM,
): string {
  return `${km} km`;
}

/** Commute-band copy when the sorted list crosses `km`. */
export function campusFarSeparatorLabel(
  km: number,
  universityLabel: string,
): string {
  const where = universityLabel.trim() || "campus";
  if (km <= 2) return `Over ${km} km from ${where} — a short commute`;
  if (km <= 5) return `Over ${km} km from ${where} — a longer commute`;
  return `Further than ${km} km from ${where}`;
}

/** Highest tier this distance has crossed, or -1 if still within the near band. */
function distanceBandIndex(meters: number): number {
  let band = -1;
  for (let i = 0; i < CAMPUS_DISTANCE_TIERS_M.length; i++) {
    if (meters > CAMPUS_DISTANCE_TIERS_M[i]!) band = i;
    else break;
  }
  return band;
}

export function withCampusDistanceSeparator(
  listings: Listing[],
  opts: { enabled: boolean; universityLabel: string },
): MixedListingRow[] {
  const label = opts.universityLabel.trim();
  if (!opts.enabled || !label) {
    return listings.map((listing) => ({ kind: "listing" as const, listing }));
  }

  const rows: MixedListingRow[] = [];
  let lastEmittedBand = -1;

  for (const listing of listings) {
    const meters = listing.distanceMeters ?? Number.POSITIVE_INFINITY;
    const band = distanceBandIndex(meters);
    if (band > lastEmittedBand) {
      const km = CAMPUS_DISTANCE_TIERS_KM[band]!;
      rows.push({
        kind: "separator",
        km,
        label: campusFarSeparatorLabel(km, label),
      });
      lastEmittedBand = band;
    }
    rows.push({ kind: "listing", listing });
  }

  return rows;
}

function placeWord(count: number): string {
  return count === 1 ? "place" : "places";
}

function optionWord(count: number): string {
  return count === 1 ? "option" : "options";
}

export function campusResultsHeading(opts: {
  listings: Array<{ distanceMeters?: number }>;
}): string {
  const nearCount = opts.listings.filter(
    (listing) =>
      (listing.distanceMeters ?? Number.POSITIVE_INFINITY) <=
      CAMPUS_NEAR_RADIUS_M,
  ).length;
  const farCount = opts.listings.length - nearCount;

  if (nearCount === 0 && farCount > 0) {
    return `No places found immediately near campus. Showing ${farCount} ${optionWord(farCount)} further away.`;
  }
  if (nearCount > 0 && farCount > 0) {
    return `Showing ${nearCount} ${placeWord(nearCount)} near campus, and ${farCount} other ${optionWord(farCount)} further away.`;
  }
  if (nearCount > 0) {
    return `Showing ${nearCount} ${placeWord(nearCount)} near campus.`;
  }
  return `No places found immediately near campus.`;
}
