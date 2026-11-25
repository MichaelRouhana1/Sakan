import { distanceKm } from "../search/matcher.scoring.js";

export const SIMILAR_RULES = {
  weights: {
    location: 40,
    rent: 30,
    unitType: 20,
    freshnessAndPhotos: 10,
  },
  localRadiusMeters: 5_000,
  minPlacesBeforeWiden: 4,
  defaultLimit: 10,
  maxLimit: 12,
} as const;

export type SimilarScoringListing = {
  id: string;
  placeId: string;
  status: string;
  availability?: string | null;
  hidden?: boolean | null;
  hiddenReason?: string | null;
  expiresAt?: string | Date | null;
  inventoryNeedsConfirmation?: boolean | null;
  bedsAvailable?: number | null;
  genderRestriction?: string | null;
  area?: string | null;
  city?: string | null;
  primaryCampusId?: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceFromSourceMeters?: number | null;
  monthlyRentUsd: number;
  listingType?: string | null;
  unitType?: string | null;
  photoCount?: number | null;
  photos?: readonly unknown[] | null;
  publishedAt?: string | Date | null;
  createdAt?: string | Date | null;
};

export type SimilarityBreakdown = {
  location: number;
  rent: number;
  unitType: number;
  freshnessAndPhotos: number;
};

export type ScoredSimilarListing<T extends SimilarScoringListing> = {
  listing: T;
  score: number;
  breakdown: SimilarityBreakdown;
  reason: string;
  distanceMeters: number | null;
};

type CanonicalUnitKind =
  | "entire_apartment"
  | "studio"
  | "private_room"
  | "shared_bed"
  | "pbsa_building";

const ADJACENT_UNIT_PAIRS = new Set<string>([
  "entire_apartment:studio",
  "studio:entire_apartment",
  "studio:private_room",
  "private_room:studio",
  "private_room:shared_bed",
  "shared_bed:private_room",
  "pbsa_building:studio",
  "studio:pbsa_building",
  "pbsa_building:private_room",
  "private_room:pbsa_building",
  "pbsa_building:shared_bed",
  "shared_bed:pbsa_building",
]);

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function normText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function canonicalUnitKind(item: SimilarScoringListing): CanonicalUnitKind | null {
  const lt = item.listingType;
  if (lt === "studio" || lt === "pbsa_building" || lt === "entire_apartment" || lt === "private_room") {
    return lt;
  }
  if (lt === "shared_dorm_bed") return "shared_bed";
  const ut = item.unitType;
  if (ut === "whole_apartment") return "entire_apartment";
  if (ut === "private_room" || ut === "shared_bed") return ut;
  return null;
}

function resolveDistanceKm(
  source: SimilarScoringListing,
  candidate: SimilarScoringListing,
): number | null {
  if (
    candidate.distanceFromSourceMeters != null &&
    Number.isFinite(candidate.distanceFromSourceMeters)
  ) {
    return Math.max(0, candidate.distanceFromSourceMeters) / 1000;
  }
  if (
    source.lat != null &&
    source.lng != null &&
    candidate.lat != null &&
    candidate.lng != null
  ) {
    return distanceKm(
      { lat: source.lat, lng: source.lng },
      { lat: candidate.lat, lng: candidate.lng },
    );
  }
  return null;
}

function locationDecay(km: number): number {
  if (km <= 0.5) return 1.0;
  if (km <= 2.0) return 1.0 - ((km - 0.5) / 1.5) * 0.22;
  if (km <= 5.0) return 0.78 - ((km - 2.0) / 3.0) * 0.43;
  if (km <= 10.0) return 0.35 - ((km - 5.0) / 5.0) * 0.35;
  return 0.0;
}

function rentCloseness(sourceRent: number, candidateRent: number): { factor: number; delta: number } {
  const denom = Math.max(sourceRent, 100);
  const delta = Math.abs(candidateRent - sourceRent) / denom;
  let factor = 0;
  if (delta <= 0.1) {
    factor = 1.0;
  } else if (delta <= 0.35) {
    factor = 1.0 - ((delta - 0.1) / 0.25) * 0.5;
  } else if (delta <= 0.7) {
    factor = 0.5 - ((delta - 0.35) / 0.35) * 0.5;
  }
  if (candidateRent < sourceRent && delta <= 0.25) {
    factor = clamp01(factor + 0.05);
  }
  return { factor: clamp01(factor), delta };
}

function unitTypeCloseness(
  source: SimilarScoringListing,
  candidate: SimilarScoringListing,
): number {
  const a = canonicalUnitKind(source);
  const b = canonicalUnitKind(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (ADJACENT_UNIT_PAIRS.has(`${a}:${b}`)) return 0.5;
  return 0.0;
}

function listingTimestampMs(item: SimilarScoringListing): number {
  const raw = item.publishedAt ?? item.createdAt;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function resolvePhotoCount(item: SimilarScoringListing): number {
  if (item.photoCount != null && Number.isFinite(item.photoCount)) {
    return Math.max(0, Math.floor(item.photoCount));
  }
  return Array.isArray(item.photos) ? item.photos.length : 0;
}

export function isGenderCompatible(
  sourceGender: string | null | undefined,
  candidateGender: string | null | undefined,
): boolean {
  if (sourceGender === "girls_only" && candidateGender === "boys_only") return false;
  if (sourceGender === "boys_only" && candidateGender === "girls_only") return false;
  return true;
}

export function isSimilarCandidateEligible(
  source: SimilarScoringListing,
  candidate: SimilarScoringListing,
  now = Date.now(),
): boolean {
  if (candidate.id === source.id) return false;
  if (candidate.placeId && source.placeId && candidate.placeId === source.placeId) return false;
  if (candidate.status !== "active") return false;
  if (candidate.availability === "rented") return false;
  if (candidate.hidden || Boolean(candidate.hiddenReason)) return false;
  if (candidate.inventoryNeedsConfirmation) return false;
  if (!candidate.expiresAt) return false;
  const expiresMs = new Date(candidate.expiresAt).getTime();
  if (!Number.isFinite(expiresMs) || expiresMs <= now) return false;
  if (!isGenderCompatible(source.genderRestriction, candidate.genderRestriction)) return false;
  return true;
}

export function scoreSimilarListing<T extends SimilarScoringListing>(
  source: SimilarScoringListing,
  candidate: T,
  now = Date.now(),
): ScoredSimilarListing<T> {
  const km = resolveDistanceKm(source, candidate);
  const sameArea = normText(source.area) !== "" && normText(source.area) === normText(candidate.area);
  const sameCity = normText(source.city) !== "" && normText(source.city) === normText(candidate.city);
  const sameCampus =
    Boolean(source.primaryCampusId) && source.primaryCampusId === candidate.primaryCampusId;

  let locationFactor = km != null ? locationDecay(km) : 0;
  if (sameArea) locationFactor = Math.max(locationFactor, 0.8);
  else if (sameCity) locationFactor = Math.max(locationFactor, 0.25);
  if (sameCampus) locationFactor = clamp01(locationFactor + 0.15);
  const locationScore = locationFactor * SIMILAR_RULES.weights.location;

  const rent = rentCloseness(source.monthlyRentUsd, candidate.monthlyRentUsd);
  const rentScore = rent.factor * SIMILAR_RULES.weights.rent;

  const unitFactor = unitTypeCloseness(source, candidate);
  const unitScore = unitFactor * SIMILAR_RULES.weights.unitType;

  const photos = resolvePhotoCount(candidate);
  const photoScore = photos >= 3 ? 4 : photos >= 1 ? 2 : 0;
  const publishedMs = listingTimestampMs(candidate);
  const ageDays = publishedMs > 0 ? Math.max(0, (now - publishedMs) / 86_400_000) : 90;
  const freshnessScore = 6 * Math.exp(-ageDays / 30);
  const freshnessAndPhotosScore = photoScore + freshnessScore;

  const totalScore = Number(
    (locationScore + rentScore + unitScore + freshnessAndPhotosScore).toFixed(4),
  );

  let reason = "Similar place";
  if (sameArea) reason = "Same area";
  else if (sameCampus) reason = "Same campus";
  else if (km != null && km <= 2) reason = "Nearby";
  else if (rent.delta <= 0.15) reason = "Similar price";
  else if (unitFactor === 1) reason = "Same unit type";
  else if (km != null && km <= 5) reason = "Nearby";

  return {
    listing: candidate,
    score: totalScore,
    breakdown: {
      location: Number(locationScore.toFixed(4)),
      rent: Number(rentScore.toFixed(4)),
      unitType: Number(unitScore.toFixed(4)),
      freshnessAndPhotos: Number(freshnessAndPhotosScore.toFixed(4)),
    },
    reason,
    distanceMeters: km != null ? Math.round(km * 1000) : null,
  };
}

function compareScored<T extends SimilarScoringListing>(
  a: ScoredSimilarListing<T>,
  b: ScoredSimilarListing<T>,
): number {
  return (
    b.score - a.score ||
    (a.distanceMeters ?? Number.POSITIVE_INFINITY) -
      (b.distanceMeters ?? Number.POSITIVE_INFINITY) ||
    listingTimestampMs(b.listing) - listingTimestampMs(a.listing) ||
    a.listing.id.localeCompare(b.listing.id)
  );
}

/**
 * Filter, score, deduplicate to one best unit per place, and rank similar listings.
 */
export function rankSimilarListings<T extends SimilarScoringListing>(
  source: SimilarScoringListing,
  candidates: T[],
  opts?: { limit?: number; now?: number },
): ScoredSimilarListing<T>[] {
  const limit = Math.max(
    1,
    Math.min(SIMILAR_RULES.maxLimit, opts?.limit ?? SIMILAR_RULES.defaultLimit),
  );
  const now = opts?.now ?? Date.now();

  const bestByPlace = new Map<string, ScoredSimilarListing<T>>();

  for (const candidate of candidates) {
    if (!isSimilarCandidateEligible(source, candidate, now)) continue;
    const scored = scoreSimilarListing(source, candidate, now);
    const placeKey = candidate.placeId || candidate.id;
    const existing = bestByPlace.get(placeKey);
    if (!existing || compareScored(scored, existing) < 0) {
      bestByPlace.set(placeKey, scored);
    }
  }

  return Array.from(bestByPlace.values()).sort(compareScored).slice(0, limit);
}
