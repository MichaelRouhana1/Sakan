import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";
import { listingKeys } from "./keys";

type ViewResponse = {
  data: { id: string; viewCount: number; counted: boolean };
};

/**
 * Record one view when a listing detail opens (renter feed).
 * Dedupes remounts/refetches for the same id in this screen lifetime.
 */
export function useRecordListingView(listingId: string, enabled = true) {
  const queryClient = useQueryClient();
  const recordedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !listingId) return;
    if (recordedFor.current === listingId) return;
    recordedFor.current = listingId;

    let cancelled = false;

    void (async () => {
      try {
        const { data } = await api.post<ViewResponse>(
          `/api/listings/${listingId}/view`,
        );
        if (cancelled || !data.data.counted) return;

        queryClient.setQueryData<Listing>(
          listingKeys.detail(listingId),
          (prev) =>
            prev
              ? { ...prev, viewCount: data.data.viewCount }
              : prev,
        );
        void queryClient.invalidateQueries({
          queryKey: ["listings", "mine"],
        });
        void queryClient.invalidateQueries({
          queryKey: listingKeys.lists(),
        });
      } catch {
        // Allow a later remount to retry if the request failed.
        if (recordedFor.current === listingId) {
          recordedFor.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, listingId, queryClient]);
}
