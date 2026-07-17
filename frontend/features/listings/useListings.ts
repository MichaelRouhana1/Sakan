import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";
import { listingKeys } from "./keys";

type ListingsResponse = { data: Listing[] };

export function useListings(filters: {
  area?: string;
  universitySlug?: string;
}) {
  return useQuery({
    queryKey: listingKeys.list(filters),
    queryFn: async () => {
      const { data } = await api.get<ListingsResponse>("/api/listings", {
        params: filters,
      });
      return data.data;
    },
  });
}
