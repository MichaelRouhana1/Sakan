import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { listingKeys } from "./keys";

export function useArchiveListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data } = await api.post(`/api/listings/${listingId}/archive`);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: listingKeys.all });
      void qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}
