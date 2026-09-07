import type { University } from "@/features/universities/useUniversities";
import type { Listing } from "@/types/listing";

export type NearbyCampus = {
  campusSlug: string;
  name: string;
  shortName: string;
  institutionSlug: string | null;
  logoUrl: string | null;
  meters: number | null;
};

const RADIUS_M = 8000;
const LIMIT = 5;

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function campusBySlug(
  universities: University[],
  slug?: string | null,
): University | undefined {
  if (!slug) return undefined;
  const target = slug.toLowerCase();
  return universities.find((u) => u.slug.toLowerCase() === target);
}

function toRow(uni: University, meters: number | null): NearbyCampus {
  return {
    campusSlug: uni.slug,
    name: uni.displayName ?? uni.name,
    shortName: uni.institutionShortName ?? uni.name.slice(0, 3),
    institutionSlug: uni.institutionSlug ?? null,
    logoUrl: uni.logoUrl ?? null,
    meters,
  };
}

function instKey(uni: University): string {
  return (uni.institutionSlug ?? uni.slug).toLowerCase();
}

/**
 * Closest campuses to a listing pin. Dedupes by institution so AUB/LAU/USJ
 * each appear once. Always leads with the listing's nearest campus when known.
 */
export function nearbyCampusesForListing(
  listing: Pick<
    Listing,
    "lat" | "lng" | "nearestCampusSlug" | "nearestCampusName" | "distanceMeters"
  >,
  universities: University[],
): NearbyCampus[] {
  const origin =
    listing.lat != null && listing.lng != null
      ? { lat: listing.lat, lng: listing.lng }
      : null;

  const ranked: NearbyCampus[] = [];
  const seen = new Set<string>();

  if (origin) {
    const scored = universities
      .filter((u) => u.lat != null && u.lng != null)
      .map((u) => ({
        uni: u,
        meters: haversineMeters(origin, { lat: u.lat!, lng: u.lng! }),
      }))
      .filter((x) => x.meters <= RADIUS_M)
      .sort((a, b) => a.meters - b.meters);

    for (const { uni, meters } of scored) {
      const key = instKey(uni);
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push(toRow(uni, meters));
      if (ranked.length >= LIMIT) break;
    }
  }

  const nearestUni = campusBySlug(universities, listing.nearestCampusSlug);
  if (nearestUni) {
    const key = instKey(nearestUni);
    const existing = ranked.findIndex((r) => r.campusSlug === nearestUni.slug);
    const row = toRow(
      nearestUni,
      listing.distanceMeters ??
        ranked.find((r) => r.campusSlug === nearestUni.slug)?.meters ??
        null,
    );
    if (existing >= 0) {
      ranked.splice(existing, 1);
      ranked.unshift(row);
    } else if (!seen.has(key)) {
      ranked.unshift(row);
      if (ranked.length > LIMIT) ranked.pop();
    }
  } else if (listing.nearestCampusName && ranked.length === 0) {
    ranked.push({
      campusSlug: listing.nearestCampusSlug ?? "nearest",
      name: listing.nearestCampusName,
      shortName: listing.nearestCampusName.slice(0, 3),
      institutionSlug: listing.nearestCampusSlug ?? null,
      logoUrl: null,
      meters: listing.distanceMeters ?? null,
    });
  }

  return ranked;
}
