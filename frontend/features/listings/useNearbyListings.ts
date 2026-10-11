import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";
import { listingKeys } from "./keys";
import { normalizeListing } from "./normalizeListing";

type NearbyResponse = { data: unknown };

/**
 * Public units with the same place ID. Coordinates are not membership evidence.
 */
export function useNearbyListings(
  listingId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: listingKeys.nearby(listingId),
    enabled: Boolean(listingId) && (options?.enabled ?? true),
    queryFn: async (): Promise<Listing[]> => {
      const { data } = await api.get<NearbyResponse>(
        `/api/listings/${listingId}/nearby`,
      );
      const rows = Array.isArray(data.data) ? data.data : [];
      return rows
        .filter((row): row is Record<string, unknown> =>
          Boolean(row && typeof row === "object"),
        )
        .map((row) => normalizeListing(row));
    },
  });
}
