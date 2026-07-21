import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { listingKeys } from "./keys";
import { normalizeListing } from "./normalizeListing";

type ListingResponse = { data: Record<string, unknown> };

export function useListing(id: string) {
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ListingResponse>(`/api/listings/${id}`);
      return normalizeListing(data.data);
    },
    enabled: Boolean(id),
  });
}
