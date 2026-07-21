import { useQuery } from "@tanstack/react-query";
import type { ListingSort } from "@/components/listings/ListingSortControl";
import { api } from "@/lib/api";
import type { CampusMeta, Listing } from "@/types/listing";
import { listingKeys, type ListingListFilters } from "./keys";
import { normalizeListingsEnvelope } from "./normalizeListing";

type ListingsApiResponse = {
  data: unknown;
  campuses?: unknown;
  /** Legacy singular — dual-read in normalize. */
  campus?: unknown;
};

export type ListingsQueryData = {
  listings: Listing[];
  campuses: CampusMeta[];
};

/**
 * Wire format (locked): comma-separated query params only.
 *   ?areas=Hamra,Verdun&universitySlugs=aub&electricity=solar,scheduled_cuts
 * Do NOT pass JS arrays to Axios — that produces areas[]= and fights the backend contract.
 */
export function useListings(
  filters: ListingListFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: listingKeys.list(filters),
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<ListingsQueryData> => {
      const params: Record<string, string> = {};
      if (filters.areas && filters.areas.length > 0) {
        params.areas = filters.areas.join(",");
      }
      if (filters.universitySlugs && filters.universitySlugs.length > 0) {
        params.universitySlugs = filters.universitySlugs.join(",");
      }
      // Cities mode only — ignored by API when universitySlugs present.
      if (
        !(filters.universitySlugs && filters.universitySlugs.length > 0) &&
        filters.sort
      ) {
        params.sort = filters.sort;
      }
      if (filters.electricity && filters.electricity.length > 0) {
        params.electricity = filters.electricity.join(",");
      }
      if (filters.water && filters.water.length > 0) {
        params.water = filters.water.join(",");
      }
      if (filters.listingTypes && filters.listingTypes.length > 0) {
        params.listingTypes = filters.listingTypes.join(",");
      }
      if (filters.wifiIncluded) {
        params.wifiIncluded = "true";
      }
      if (filters.minRentUsd != null) {
        params.minRentUsd = String(filters.minRentUsd);
      }
      if (filters.maxRentUsd != null) {
        params.maxRentUsd = String(filters.maxRentUsd);
      }
      if (filters.studentsOnly) {
        params.studentsOnly = "true";
      }
      if (filters.genderRestrictions && filters.genderRestrictions.length > 0) {
        params.genderRestrictions = filters.genderRestrictions.join(",");
      }
      const { data } = await api.get<ListingsApiResponse>("/api/listings", {
        params,
      });
      return normalizeListingsEnvelope(data);
    },
  });
}

export type { ListingSort };
