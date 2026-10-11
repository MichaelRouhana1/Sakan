import { useQuery } from "@tanstack/react-query";
import { promotionSession } from '@/features/promotions/activity';
import type { ListingSort } from "@/components/listings/ListingSortControl";
import { api } from "@/lib/api";
import type { CampusMeta, Listing } from "@/types/listing";
import { listingKeys, type ListingListFilters } from "./keys";
import { normalizeListingsPayload, normalizeListingsEnvelope } from "./normalizeListing";

type ListingsApiResponse = {
  data: unknown;
  campuses?: unknown;
  /** Legacy singular — dual-read in normalize. */
  campus?: unknown;
  featured?: unknown;
  matches?: ListingsQueryData["matches"];
  widening?: ListingsQueryData["widening"];
  pagination?: ListingsQueryData["pagination"];
};

export type ListingsQueryData = {
  listings: Listing[];
  campuses: CampusMeta[];
  featured: Listing[];
  matches: Record<string, import("@/features/matcher/types").MatchPresentation>;
  widening: import("@/features/matcher/types").MatchWidening;
  pagination: { page: number; pageSize: number; total: number; totalMatching: number; hasNext: boolean };
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
    refetchInterval: 60_000,
    queryFn: async (): Promise<ListingsQueryData> => {
      const params: Record<string, string> = {};
      params.promotionSession=(await promotionSession()).id;
      if (filters.areas && filters.areas.length > 0) {
        params.areas = filters.areas.join(",");
      }
      if (filters.universitySlugs && filters.universitySlugs.length > 0) {
        params.universitySlugs = filters.universitySlugs.join(",");
      }
      if (filters.campusId) {
        params.campusId = filters.campusId;
      }
      if (filters.q && filters.q.trim().length > 0) {
        params.q = filters.q.trim();
      }
      if (filters.lat != null && filters.lng != null) {
        params.lat = String(filters.lat);
        params.lng = String(filters.lng);
        params.radiusKm = String(filters.radiusKm ?? 2);
      } else if (filters.radiusKm != null && (filters.campusId || filters.universitySlugs?.length)) {
        params.radiusKm = String(filters.radiusKm);
      }
      if (filters.sort) params.sort = filters.sort;
      if (filters.matcher) params.matcher = JSON.stringify(filters.matcher);
      params.page = String(filters.page ?? 1);
      params.pageSize = String(filters.pageSize ?? 24);
      if (filters.view) params.view = filters.view;
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
      const normalized = normalizeListingsEnvelope(data);
      const featured = normalizeListingsPayload(data.featured);
      return { ...normalized, featured, matches: data.matches ?? {},
        widening: data.widening ?? { strictCount: 0, alternativeCount: 0, labels: [], shortfall: true },
        pagination: data.pagination ?? { page: 1, pageSize: 24, total: normalized.listings.length, totalMatching: normalized.listings.length + featured.length, hasNext: false },
      };
    },
  });
}

export type { ListingSort };
