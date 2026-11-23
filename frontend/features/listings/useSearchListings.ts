import { useRef, useState } from 'react';
import type { PriceHistogram } from '@/types/priceHistogram';
import { useListings } from './useListings';
import type { ListingListFilters } from './keys';

export function nonPriceFiltersKey(filters: ListingListFilters): string {
  const matcher = filters.matcher
    ? { ...filters.matcher, budget: undefined }
    : undefined;
  return JSON.stringify({
    city: filters.city ?? null,
    placeId: filters.placeId ?? null,
    locationId: filters.locationId ?? null,
    locationKind: filters.locationKind ?? null,
    areas: filters.areas ? [...filters.areas].sort() : [],
    universitySlugs: filters.universitySlugs
      ? [...filters.universitySlugs].sort()
      : [],
    campusId: filters.campusId ?? null,
    q: filters.q?.trim() || null,
    lat: filters.lat ?? null,
    lng: filters.lng ?? null,
    radiusKm: filters.radiusKm ?? null,
    electricity: filters.electricity ? [...filters.electricity].sort() : [],
    water: filters.water ? [...filters.water].sort() : [],
    wifiIncluded: Boolean(filters.wifiIncluded),
    listingTypes: filters.listingTypes ? [...filters.listingTypes].sort() : [],
    studentsOnly: Boolean(filters.studentsOnly),
    genderRestrictions: filters.genderRestrictions
      ? [...filters.genderRestrictions].sort()
      : [],
    matcher: matcher ?? null,
  });
}

/**
 * Rendering preserves server order. Map counts use every matching unit, not a page.
 * Keeps a stable priceHistogram snapshot across budget-only refetches for both web and native.
 */
export function useSearchListings(filters: ListingListFilters, mapOpen: boolean) {
  const key = JSON.stringify(filters);
  const [cursor, setCursor] = useState({ key, page: 1 });
  const page = cursor.key === key ? cursor.page : 1;
  if (cursor.key !== key) setCursor({ key, page: 1 });
  const query = useListings({ ...filters, page });
  const map = useListings({ ...filters, view: 'map' }, { enabled: mapOpen });
  const mapListings = map.data ? [...map.data.featured, ...map.data.listings] : [];

  const histKey = nonPriceFiltersKey(filters);
  const histSnapshot = useRef<{ key: string; histogram: PriceHistogram | null }>({
    key: histKey,
    histogram: null,
  });
  if (query.data !== undefined) {
    histSnapshot.current = {
      key: histKey,
      histogram: query.data.priceHistogram ?? null,
    };
  } else if (histSnapshot.current.key !== histKey) {
    histSnapshot.current = { key: histKey, histogram: null };
  }
  const priceHistogram = histSnapshot.current.histogram;

  return {
    ...query,
    page,
    setPage: (next: number) => setCursor({ key, page: next }),
    mapListings,
    mapLoading: map.isLoading,
    mapError: map.isError,
    priceHistogram,
  };
}
