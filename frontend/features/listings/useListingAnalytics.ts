import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";
import type { HostAnalyticsListing } from "@/features/listings/hostAnalytics";
import { listingKeys } from "@/features/listings/keys";

type ListingAnalyticsResponse = { data: HostAnalyticsListing };

function errorStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  return error.response?.status ?? null;
}

export function useListingAnalytics(id: string, enabled = true) {
  return useQuery({
    queryKey: listingKeys.listingAnalytics(id),
    queryFn: async () => {
      const { data } = await api.get<ListingAnalyticsResponse>(
        `/api/listings/${id}/analytics`,
      );
      const listing = data.data;
      if (!listing) {
        throw new Error("Couldn't load analytics");
      }
      return listing;
    },
    enabled: enabled && Boolean(id),
    retry: (failureCount, error) => {
      const status = errorStatus(error);
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 1;
    },
  });
}
