import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptionalAuthSession } from "@/features/auth/AuthSessionProvider";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";
import { listingKeys } from "./keys";
import { normalizeListing } from "./normalizeListing";
import {
  prependRecentlyViewed,
  recentlyViewedStorageKey,
  visibleRecentlyViewedIds,
  type RecentlyViewedEntry,
} from "./recentlyViewed";
import { readRecentlyViewed, writeRecentlyViewed } from "./recentlyViewedStorage";

type BatchResponse = { data: unknown };

function useRecentlyViewedScope(): string {
  const auth = useOptionalAuthSession();
  const userId = auth?.isSignedIn
    ? (auth.user?.id ?? auth.session?.userId ?? null)
    : null;
  return userId ? `account:${userId}` : "guest";
}

/**
 * Records a listing view into local recently-viewed storage (cap 12, newest first).
 */
export function useRecordRecentlyViewed(listingId: string, enabled = true) {
  const scope = useRecentlyViewedScope();
  const queryClient = useQueryClient();
  const recordedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !listingId) return;
    const token = `${scope}:${listingId}`;
    if (recordedKey.current === token) return;
    recordedKey.current = token;

    let cancelled = false;
    void (async () => {
      const current = await readRecentlyViewed(scope);
      if (cancelled) return;
      const updated = prependRecentlyViewed(current, listingId);
      await writeRecentlyViewed(scope, updated);
      if (cancelled) return;
      queryClient.setQueryData<RecentlyViewedEntry[]>(
        listingKeys.recentlyViewedIds(scope),
        updated,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, listingId, queryClient, scope]);
}

/**
 * Reads local recently viewed listing IDs (excluding the currently open listing)
 * and hydrates live listing cards via GET /api/listings/batch.
 */
export function useRecentlyViewedListings(excludeListingId?: string) {
  const scope = useRecentlyViewedScope();
  const queryClient = useQueryClient();

  const idsQuery = useQuery({
    queryKey: listingKeys.recentlyViewedIds(scope),
    staleTime: Infinity,
    queryFn: () => readRecentlyViewed(scope),
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const storageKey = recentlyViewedStorageKey(scope);
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        void queryClient.invalidateQueries({
          queryKey: listingKeys.recentlyViewedIds(scope),
        });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient, scope]);

  const ids = useMemo(
    () => visibleRecentlyViewedIds(idsQuery.data ?? [], excludeListingId),
    [excludeListingId, idsQuery.data],
  );

  const batchQuery = useQuery({
    queryKey: listingKeys.batch(ids),
    enabled: idsQuery.isFetched && ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Listing[]> => {
      const { data } = await api.get<BatchResponse>("/api/listings/batch", {
        params: { ids: ids.join(",") },
      });
      const rows = Array.isArray(data.data) ? data.data : [];
      return rows
        .filter((row): row is Record<string, unknown> =>
          Boolean(row && typeof row === "object"),
        )
        .map((row) => normalizeListing(row));
    },
  });

  return {
    ids,
    listings: ids.length > 0 ? (batchQuery.data ?? []) : [],
    isLoading: idsQuery.isLoading || (ids.length > 0 && batchQuery.isLoading),
    isFetched: idsQuery.isFetched && (ids.length === 0 || batchQuery.isFetched),
    isError: batchQuery.isError,
    refetch: batchQuery.refetch,
  };
}
