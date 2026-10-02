import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapDraftToBody } from "@/features/listings/create/mapDraftToBody";
import type { CreateListingDraft } from "@/features/listings/create/draft";
import { listingKeys } from "./keys";
import { normalizeListing } from "./normalizeListing";

type UpdateResponse = { data: Record<string, unknown> };

export function useUpdateListing(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: CreateListingDraft) => {
      const { publishNow: _publishNow, ...body } = mapDraftToBody(draft);
      const { data } = await api.patch<UpdateResponse>(
        `/api/listings/${listingId}`,
        body,
      );
      return normalizeListing(data.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["listings", "mine"] });
    },
  });
}
