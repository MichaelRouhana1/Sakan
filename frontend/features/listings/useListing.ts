import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";
import { listingKeys } from "./keys";

type ListingResponse = { data: Listing };

export function useListing(id: string) {
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ListingResponse>(`/api/listings/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}
