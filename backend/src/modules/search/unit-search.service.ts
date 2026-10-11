import { randomUUID } from 'node:crypto';
import { listingsService } from '../listings/listings.service.js';
import { universitiesRepository } from '../universities/universities.repository.js';
import { enrichPlacements } from '../listing-activity/placement.service.js';
import { AREA_COORDINATES } from '../../constants/areaCoordinates.js';
import { NotFoundError } from '../../lib/errors.js';
import type { ListListingsQuery } from '../listings/listings.schemas.js';
import { extractMatchFacts } from './matcher.facts.js';
import { distanceKm, explainWidening, rankListings, type MatchListing } from './matcher.scoring.js';
import type { MatchPresentation } from './matcher.types.js';

type SearchUnit = MatchListing & Record<string, unknown> & {
  monthlyRentUsd: number; distanceMeters?: number;
  promotion?: { type: string; position: number; lastBumpedAt: string | null };
};
const time = (value: unknown) => value ? new Date(value as string).getTime() || 0 : 0;

/** Sort the full eligible population before taking a unit page. */
export function orderUnits(rows: SearchUnit[], sort: string, matches: Record<string, MatchPresentation>, now = Date.now()) {
  const fresh = (l: SearchUnit) => time(l.publishedAt ?? l.createdAt);
  const bumped = (l: SearchUnit) => Math.max(fresh(l), l.promotion?.type === 'bump' ? time(l.promotion.lastBumpedAt) : 0);
  const legacy = (l: SearchUnit) => process.env.PROMOTION_PLACEMENT_ENABLED !== 'true' && l.availability === 'available' && time(l.boostedUntil) > now ? time(l.boostedUntil) : 0;
  return [...rows].sort((a, b) => {
    let delta = 0;
    if (sort === 'price_asc') delta = a.monthlyRentUsd - b.monthlyRentUsd;
    else if (sort === 'price_desc') delta = b.monthlyRentUsd - a.monthlyRentUsd;
    else if (sort === 'distance') delta = (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
    else if (sort === 'match') delta = (matches[b.id]?.score ?? 0) - (matches[a.id]?.score ?? 0);
    else delta = legacy(b) - legacy(a) || bumped(b) - bumped(a);
    return delta || fresh(b) - fresh(a) || a.id.localeCompare(b.id);
  });
}

export async function searchUnits(query: ListListingsQuery, session?: string) {
  const prefs = query.matcher ? structuredClone(query.matcher) : undefined;
  // Resolve campus coordinates on the server, including preferences restored from URLs.
  if (prefs?.location) {
    const location = prefs.location.value;
    if (location.kind === 'campus') {
      const campus = location.campusId
        ? await universitiesRepository.findById(location.campusId)
        : await universitiesRepository.findBySlug(location.slug!);
      if (!campus?.active || campus.lat == null || campus.lng == null) throw new NotFoundError('Campus not found');
      location.center = { lat: campus.lat, lng: campus.lng };
      location.label = campus.name;
    } else {
      const center = AREA_COORDINATES[location.areas?.[0] as keyof typeof AREA_COORDINATES];
      location.center = center ? { lat: center.lat, lng: center.lng } : undefined;
    }
  }
  const result = await listingsService.list(query);
  const candidates = result.data.map(row => ({ ...row, matchFacts: extractMatchFacts(row) })) as unknown as SearchUnit[];
  // Distance sorting can use a preferred location without making it a radius requirement.
  for (const row of candidates) {
    const areaCenter = query.areas.length === 1 ? AREA_COORDINATES[query.areas[0] as keyof typeof AREA_COORDINATES] : undefined;
    const center = prefs?.location?.value.center ?? areaCenter;
    if (row.distanceMeters == null && center && row.matchFacts?.lat != null && row.matchFacts.lng != null) {
      row.distanceMeters = distanceKm(center, { lat: row.matchFacts.lat, lng: row.matchFacts.lng }) * 1000;
    }
  }
  const ranked = prefs ? rankListings(candidates, prefs) : { listings: candidates, matches: {} };
  const eligible = ranked.listings as SearchUnit[];
  const widening = explainWidening(eligible, prefs ?? { version: 1 });
  const placed = await enrichPlacements(eligible, query, session ?? randomUUID()) as SearchUnit[];
  const featured = placed.filter(l => l.promotion?.type === 'featured').sort((a, b) => a.promotion!.position - b.promotion!.position);
  const organic = orderUnits(placed.filter(l => l.promotion?.type !== 'featured'), query.sort, ranked.matches);
  if (query.sort !== 'newest') for (const row of organic) if (row.promotion?.type === 'bump') delete row.promotion;
  const total = organic.length;
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const data = query.view === 'map' ? organic : organic.slice((page - 1) * query.pageSize, page * query.pageSize);
  const shown = new Set([...data, ...featured].map(l => l.id));
  return {
    data, featured, campuses: result.campuses,
    matches: Object.fromEntries(Object.entries(ranked.matches).filter(([id]) => shown.has(id))), widening,
    pagination: { page, pageSize: query.pageSize, total, totalMatching: total + featured.length, hasNext: page * query.pageSize < total },
  };
}
