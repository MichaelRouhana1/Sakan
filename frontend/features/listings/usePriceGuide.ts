import { useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import type { CreateListingDraft } from "@/features/listings/create/draft";
import { api } from "@/lib/api";
import { listingKeys } from "./keys";

export type PriceGuide = {
  n: number;
  medianUsd: number;
  lowUsd: number;
  highUsd: number;
  match: "area_space_beds_basis";
};

type PriceGuideDraft = Pick<CreateListingDraft,
  "area" | "spaceType" | "propertyType" | "bedrooms" | "priceBasis">;

/** Only mounted by Pricing; never retain guidance for a different draft/session. */
export function usePriceGuide(draft: PriceGuideDraft): PriceGuide | null {
  const { session, isSignedIn, isLoading } = useAuthSession();
  const { area, spaceType, propertyType, bedrooms, priceBasis } = draft;
  const params = { area, spaceType, propertyType, bedrooms, priceBasis };
  const enabled = !isLoading && isSignedIn && Boolean(session?.userId) &&
    Boolean(area && spaceType && propertyType && priceBasis) &&
    Number.isInteger(bedrooms) && bedrooms >= 0 && bedrooms <= 12;
  const query = useQuery({
    queryKey: [...listingKeys.all, "price-guide", session?.userId, params],
    queryFn: async ({ signal }) => {
      const response = await api.get<{ data?: PriceGuide | null }>(
        "/api/listings/price-guide", { params, signal },
      );
      return response.data?.data ?? null;
    },
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  // An error may coexist with cached data after a failed refetch. Fail closed.
  return enabled && query.isSuccess && !query.isFetching ? query.data ?? null : null;
}
