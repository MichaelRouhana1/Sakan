import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreatePromotionInput, PromotionCampaign, PromotionCatalog, PromotionOptions } from "@/types/promotions";

const base = "/api/promotions";
export const promotionKeys = {
  all: ["promotions"] as const,
  catalog: ["promotions", "catalog"] as const,
  options: (listingId: string) => ["promotions", "options", listingId] as const,
  listing: (listingId: string) => ["promotions", "listing", listingId] as const,
  analytics: (id: string) => ["promotions", "analytics", id] as const,
};

async function read<T>(path: string): Promise<T> {
  const result = await api.get<{ data: T }>(`${base}${path}`);
  return result.data.data;
}

export function usePromotionCatalog() {
  return useQuery({ queryKey: promotionKeys.catalog, queryFn: () => read<PromotionCatalog>("/catalog"), staleTime: 60_000 });
}

export function usePromotionOptions(listingId: string, enabled = true) {
  return useQuery({ queryKey: promotionKeys.options(listingId), queryFn: () => read<PromotionOptions>(`/listings/${encodeURIComponent(listingId)}/options`), enabled: enabled && Boolean(listingId), staleTime: 15_000, refetchInterval: enabled ? 60_000 : false });
}

export function useListingPromotions(listingId: string) {
  return useQuery({ queryKey: promotionKeys.listing(listingId), queryFn: () => read<PromotionCampaign[]>(`/listings/${encodeURIComponent(listingId)}`), enabled: Boolean(listingId), refetchInterval: 30_000 });
}

export function usePromotionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: "create"; body: CreatePromotionInput } | { kind: "pause" | "resume" | "stop" | "undo" | "cancel"; id: string } | { kind: "auto-renew"; id: string; enabled: boolean }) => {
      const result = input.kind === "create"
        ? await api.post<{ data: PromotionCampaign }>(base, input.body)
        : input.kind === "auto-renew"
          ? await api.patch<{ data: PromotionCampaign }>(`${base}/${encodeURIComponent(input.id)}/auto-renew`, { enabled: input.enabled })
          : await api.post<{ data: PromotionCampaign }>(`${base}/${encodeURIComponent(input.id)}/${input.kind}`, {});
      return result.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: promotionKeys.all }),
        client.invalidateQueries({ queryKey: ["credits"] }),
        client.invalidateQueries({ queryKey: ["listings"] }),
      ]);
    },
  });
}
