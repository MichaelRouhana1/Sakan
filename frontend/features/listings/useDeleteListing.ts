import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { listingKeys } from "./keys";

export function useDeleteListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data } = await api.delete(`/api/listings/${listingId}`);
      return data.data as { id: string };
    },
    onSuccess: (_data, listingId) => {
      queryClient.removeQueries({ queryKey: listingKeys.detail(listingId) });
      void queryClient.invalidateQueries({ queryKey: listingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["listings", "mine"] });
    },
  });
}
