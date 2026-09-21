import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";

export type ExpiryOutcome = "rented" | "renewed" | "archived" | "unknown";
export type ExpiryDecision =
  | "rented"
  | "still_available"
  | "improve"
  | "archive";

export type ExpiryDecisionView = {
  listing: Listing;
  cycleExpiresAt: string;
  outcome: ExpiryOutcome | null;
  outcomeAt: string | null;
  outcomeSource: "host" | "system" | "admin" | null;
  intent: "still_available" | "improve" | null;
  intentAt: string | null;
  postCredits: number;
  canRenew: boolean;
  recommendImprove: boolean;
  priceGuide: {
    n: number;
    medianUsd: number;
    lowUsd: number;
    highUsd: number;
  } | null;
  checklist: {
    id: string;
    label: string;
    complete: boolean;
    editable: boolean;
  }[];
};

const key = (id: string) => ["listings", id, "expiry-decision"] as const;

export function useExpiryDecision(id: string) {
  return useQuery({
    queryKey: key(id),
    queryFn: async () => {
      const { data } = await api.get<{ data: ExpiryDecisionView }>(
        `/api/listings/${encodeURIComponent(id)}/expiry-decision`,
      );
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useSubmitExpiryDecision(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      cycleExpiresAt: string;
      decision: ExpiryDecision;
    }) => {
      const { data } = await api.post<{ data: ExpiryDecisionView }>(
        `/api/listings/${encodeURIComponent(id)}/expiry-decision`,
        input,
      );
      return data.data;
    },
    onSuccess: (data) => {
      client.setQueryData(key(id), data);
      void client.invalidateQueries({ queryKey: ["listings", "mine"] });
    },
  });
}

export function useRenewListing(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (cycleExpiresAt: string) => {
      const { data } = await api.post<{ data: ExpiryDecisionView }>(
        `/api/listings/${encodeURIComponent(id)}/renew`,
        { cycleExpiresAt },
      );
      return data.data;
    },
    onSuccess: (data) => {
      client.setQueryData(key(id), data);
      void client.invalidateQueries({ queryKey: ["listings", "mine"] });
      void client.invalidateQueries({ queryKey: ["credits"] });
      void client.invalidateQueries({ queryKey: ["credits", "me"] });
    },
  });
}
