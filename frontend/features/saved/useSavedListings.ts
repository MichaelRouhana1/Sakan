import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { api } from "@/lib/api";
import {
  getLocalSavedListingIds,
  hasMigratedLocalSaved,
  markLocalSavedMigrated,
} from "@/lib/savedListingsLocal";
import type { Listing } from "@/types/listing";
import { normalizeListing } from "@/features/listings/normalizeListing";
import { savedKeys } from "./keys";

type ListResponse = { data: unknown };
type ToggleResponse = { data: { saved: boolean; listingId: string } };

async function fetchSavedListings(): Promise<Listing[]> {
  const { data } = await api.get<ListResponse>("/api/saved");
  if (!Array.isArray(data.data)) return [];
  return data.data.map((row) =>
    normalizeListing(row as Record<string, unknown>),
  );
}

function isAuthStatusError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

let localSavedMigrationStarted = false;

/** One-time merge of device AsyncStorage IDs into the account shortlist. */
export function useMigrateLocalSaved() {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuthSession();

  useEffect(() => {
    if (!isSignedIn) {
      localSavedMigrationStarted = false;
      return;
    }
    if (localSavedMigrationStarted) return;
    localSavedMigrationStarted = true;

    void (async () => {
      try {
        if (await hasMigratedLocalSaved()) return;

        const ids = await getLocalSavedListingIds();
        if (ids.length > 0) {
          await api.post("/api/saved/import", { listingIds: ids });
        }
        await markLocalSavedMigrated();
        void queryClient.invalidateQueries({ queryKey: savedKeys.all });
      } catch {
        localSavedMigrationStarted = false;
      }
    })();
  }, [isSignedIn, queryClient]);
}

export function useSavedListings() {
  const { isSignedIn, isLoading: authLoading } = useAuthSession();
  useMigrateLocalSaved();

  return useQuery({
    queryKey: savedKeys.list(),
    queryFn: fetchSavedListings,
    enabled: isSignedIn && !authLoading,
    retry: (failureCount, error) => {
      if (isAuthStatusError(error)) return false;
      return failureCount < 1;
    },
  });
}

/** Heart state from the shortlist query — one GET /api/saved, not one per card. */
export function useIsSaved(id: string) {
  const { data: listings, isLoading, isFetching, isError } = useSavedListings();
  return {
    data: listings?.some((listing) => listing.id === id) ?? false,
    isLoading,
    isFetching,
    isError,
  };
}

export function useToggleSaved() {
  const queryClient = useQueryClient();
  const preMutationState = useRef(new Map<string, boolean>());

  return useMutation({
    mutationFn: async (listing: Listing) => {
      const currentlySaved =
        preMutationState.current.get(listing.id) ??
        queryClient
          .getQueryData<Listing[]>(savedKeys.list())
          ?.some((item) => item.id === listing.id) ??
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
      await queryClient.cancelQueries({ queryKey: savedKeys.list() });

      const previousList = queryClient.getQueryData<Listing[]>(
        savedKeys.list(),
      );

      const currentlySaved =
        previousList?.some((item) => item.id === listing.id) ?? false;

      preMutationState.current.set(listing.id, currentlySaved);

      const nextSaved = !currentlySaved;

      queryClient.setQueryData<Listing[]>(savedKeys.list(), (prev) => {
        const list = prev ?? [];
        if (nextSaved) {
          if (list.some((item) => item.id === listing.id)) return list;
          return [listing, ...list];
        }
        return list.filter((item) => item.id !== listing.id);
      });

      void Haptics.impactAsync(
        nextSaved
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);

      return { previousList, listingId: listing.id };
    },
    onError: (_err, listing, context) => {
      preMutationState.current.delete(listing.id);
      if (!context) return;
      queryClient.setQueryData(savedKeys.list(), context.previousList);
    },
    onSettled: (_data, _err, listing) => {
      preMutationState.current.delete(listing.id);
      void queryClient.invalidateQueries({ queryKey: savedKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: savedKeys.one(listing.id),
      });
    },
  });
}
