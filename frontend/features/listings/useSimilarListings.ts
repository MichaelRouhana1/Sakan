import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";
import { listingKeys } from "./keys";
import { normalizeListing } from "./normalizeListing";

type SimilarResponse = { data: unknown };

export const SIMILAR_MIN_RESULTS = 3;
export const SIMILAR_DEFAULT_LIMIT = 10;

export function useSimilarListings(
  listingId: string,
  options?: { enabled?: boolean; limit?: number },
) {
  const limit = options?.limit ?? SIMILAR_DEFAULT_LIMIT;
  return useQuery({
    queryKey: listingKeys.similar(listingId, limit),
    enabled: Boolean(listingId) && (options?.enabled ?? true),
    staleTime: 60_000,
    queryFn: async (): Promise<Listing[]> => {
      const { data } = await api.get<SimilarResponse>(
        `/api/listings/${listingId}/similar`,
        { params: { limit } },
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
