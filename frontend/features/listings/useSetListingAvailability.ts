import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing, ListingAvailability } from "@/types/listing";
import { listingKeys } from "./keys";

type AvailabilityResponse = {
  data: { id: string; status: string; availability: ListingAvailability };
};

export function useSetListingAvailability(listingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availability: ListingAvailability) => {
      const { data } = await api.patch<AvailabilityResponse>(
        `/api/listings/${listingId}/availability`,
        { availability },
      );
      return data.data;
    },
    onMutate: async (availability) => {
      await queryClient.cancelQueries({ queryKey: listingKeys.detail(listingId) });
      const prevDetail = queryClient.getQueryData<Listing>(
        listingKeys.detail(listingId),
      );
      if (prevDetail) {
        queryClient.setQueryData<Listing>(listingKeys.detail(listingId), {
          ...prevDetail,
          availability,
        });
      }
      const prevMine = queryClient.getQueryData<Listing[]>(["listings", "mine"]);
      if (prevMine) {
        queryClient.setQueryData<Listing[]>(
          ["listings", "mine"],
          prevMine.map((row) =>
            row.id === listingId ? { ...row, availability } : row,
          ),
        );
      }
      return { prevDetail, prevMine };
    },
    onError: (_err, _availability, context) => {
      if (context?.prevDetail) {
        queryClient.setQueryData(listingKeys.detail(listingId), context.prevDetail);
      }
      if (context?.prevMine) {
        queryClient.setQueryData(["listings", "mine"], context.prevMine);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["listings", "mine"] });
    },
  });
}
