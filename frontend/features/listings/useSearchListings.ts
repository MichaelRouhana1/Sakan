import { useState } from 'react';
import { useListings } from './useListings';
import type { ListingListFilters } from './keys';

/** Rendering preserves server order. Map counts use every matching unit, not a page. */
export function useSearchListings(filters: ListingListFilters, mapOpen: boolean) {
  const key = JSON.stringify(filters);
  const [cursor, setCursor] = useState({ key, page: 1 });
  const page = cursor.key === key ? cursor.page : 1;
  if (cursor.key !== key) setCursor({ key, page: 1 });
  const query = useListings({ ...filters, page });
  const map = useListings({ ...filters, view: 'map' }, { enabled: mapOpen });
  const mapListings = map.data ? [...map.data.featured, ...map.data.listings] : [];
  return { ...query, page, setPage: (next: number) => setCursor({ key, page: next }),
    mapListings, mapLoading: map.isLoading, mapError: map.isError,
  };
}
