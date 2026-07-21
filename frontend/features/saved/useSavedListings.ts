import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import {
  getLocalSavedListingIds,
  hasMigratedLocalSaved,
  markLocalSavedMigrated,
} from "@/lib/savedListingsLocal";
import { getSession } from "@/lib/session";
import type { Listing } from "@/types/listing";
import { normalizeListing } from "@/features/listings/normalizeListing";
import { savedKeys } from "./keys";

type ListResponse = { data: unknown };
type SavedFlagResponse = { data: { saved: boolean } };
type ToggleResponse = { data: { saved: boolean; listingId: string } };

async function fetchSavedListings(): Promise<Listing[]> {
  const { data } = await api.get<ListResponse>("/api/saved");
  if (!Array.isArray(data.data)) return [];
  return data.data.map((row) =>
    normalizeListing(row as Record<string, unknown>),
  );
}

async function fetchIsSaved(id: string): Promise<boolean> {
  const { data } = await api.get<SavedFlagResponse>(`/api/saved/${id}`);
  return Boolean(data.data?.saved);
}

/** One-time merge of device AsyncStorage IDs into the account shortlist. */
export function useMigrateLocalSaved() {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        const session = await getSession();
        if (!session || session.role !== "renter") return;
        if (await hasMigratedLocalSaved()) return;

        const ids = await getLocalSavedListingIds();
        if (ids.length > 0) {
          await api.post("/api/saved/import", { listingIds: ids });
        }
        await markLocalSavedMigrated();
        void queryClient.invalidateQueries({ queryKey: savedKeys.all });
      } catch {
        ran.current = false;
      }
    })();
  }, [queryClient]);
}

export function useSavedListings() {
  useMigrateLocalSaved();

  return useQuery({
    queryKey: savedKeys.list(),
    queryFn: fetchSavedListings,
  });
}

export function useIsSaved(id: string) {
  return useQuery({
    queryKey: savedKeys.one(id),
    queryFn: () => fetchIsSaved(id),
    enabled: Boolean(id),
  });
}

export function useToggleSaved() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listing: Listing) => {
      const currentlySaved =
        queryClient.getQueryData<boolean>(savedKeys.one(listing.id)) ??
        false;

      if (currentlySaved) {
        const { data } = await api.delete<ToggleResponse>(
          `/api/saved/${listing.id}`,
        );
        return data.data.saved;
      }

      const { data } = await api.post<ToggleResponse>(
        `/api/saved/${listing.id}`,
      );
      return data.data.saved;
    },
    onMutate: async (listing) => {
      await queryClient.cancelQueries({ queryKey: savedKeys.one(listing.id) });
      await queryClient.cancelQueries({ queryKey: savedKeys.list() });

      const previousOne = queryClient.getQueryData<boolean>(
        savedKeys.one(listing.id),
      );
      const previousList = queryClient.getQueryData<Listing[]>(
        savedKeys.list(),
      );
      const nextSaved = !(previousOne ?? false);

      queryClient.setQueryData(savedKeys.one(listing.id), nextSaved);
      queryClient.setQueryData<Listing[]>(savedKeys.list(), (prev) => {
        const list = prev ?? [];
        if (nextSaved) {
          if (list.some((l) => l.id === listing.id)) return list;
          return [listing, ...list];
        }
        return list.filter((l) => l.id !== listing.id);
      });

      void Haptics.impactAsync(
        nextSaved
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);

      return { previousOne, previousList, listingId: listing.id };
    },
    onError: (_err, _listing, context) => {
      if (!context) return;
      queryClient.setQueryData(
        savedKeys.one(context.listingId),
        context.previousOne,
      );
      queryClient.setQueryData(savedKeys.list(), context.previousList);
    },
    onSettled: (_data, _err, listing) => {
      void queryClient.invalidateQueries({ queryKey: savedKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: savedKeys.one(listing.id),
      });
    },
  });
}
