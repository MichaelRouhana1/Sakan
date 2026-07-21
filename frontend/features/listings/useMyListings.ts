import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";

type ListingsResponse = { data: Listing[] };

export function useMyListings(enabled = true) {
  return useQuery({
    queryKey: ["listings", "mine"],
    queryFn: async () => {
      const { data } = await api.get<ListingsResponse>("/api/listings/mine");
      return data.data;
    },
    enabled,
  });
}
