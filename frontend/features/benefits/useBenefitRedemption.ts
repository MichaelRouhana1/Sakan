import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { benefitKeys } from "./keys";
import type { BenefitRedemption } from "./types";

type Response = { data: BenefitRedemption };

/**
 * Auth-gated reveal. Fetched on demand (`enabled: false` + `refetch()`) rather
 * than read off the cached list, so the payoff is always fresh for the current
 * session instead of whatever the list held when it was first loaded.
 */
export function useBenefitRedemption(id: string) {
  return useQuery({
    queryKey: benefitKeys.redemption(id),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data } = await api.get<Response>(
        `/api/benefits/${id}/redemption`,
      );
      return data.data;
    },
  });
}
