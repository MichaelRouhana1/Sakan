import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HostAnalyticsOverview } from "@/features/listings/hostAnalytics";
import { listingKeys } from "@/features/listings/keys";

type HostAnalyticsResponse = { data: HostAnalyticsOverview };

export function useHostAnalytics(enabled = true) {
  return useQuery({
    queryKey: listingKeys.hostAnalytics(),
    queryFn: async () => {
      const { data } = await api.get<HostAnalyticsResponse>(
        "/api/listings/mine/analytics",
      );
      return data.data;
    },
    enabled,
  });
}
