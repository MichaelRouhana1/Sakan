import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
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
import { requestSaveAuth } from "./saveAuthPrompt";

type ListResponse = { data: unknown };
type ToggleResponse = { data: { saved: boolean; listingId: string } };
type ToggleVars = { listing: Listing; wantSaved: boolean; seq: number };

/**
 * Overlapping heart taps share one cache. Only the newest tap may roll it
 * back, and only to the list from before this burst — never to another
 * tap's optimistic snapshot.
 */
let toggleEpoch = 0;
let pendingToggles = 0;
let confirmedList: Listing[] | null = null;

function applySavedToggle(
  list: Listing[],
  listing: Listing,
  wantSaved: boolean,
): Listing[] {
  if (wantSaved) {
    if (list.some((item) => item.id === listing.id)) return list;
    return [listing, ...list];
  }
  return list.filter((item) => item.id !== listing.id);
}

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
  const { isSignedIn, isLoading: authLoading } = useAuthSession();

  useEffect(() => {
    if (authLoading) return;
    if (!isSignedIn) {
      localSavedMigrationStarted = false;
      queryClient.removeQueries({ queryKey: savedKeys.all });
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
  }, [isSignedIn, authLoading, queryClient]);
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
  const { isSignedIn } = useAuthSession();
  const { data: listings, isLoading, isFetching, isError } = useSavedListings();
  return {
    data: Boolean(
      isSignedIn && listings?.some((listing) => listing.id === id),
    ),
    isLoading,
    isFetching,
    isError,
  };
}

export function useToggleSaved() {
  const queryClient = useQueryClient();
  const { isSignedIn, isLoading: authLoading } = useAuthSession();

  const mutation = useMutation<boolean, unknown, ToggleVars, { seq: number }>({
    mutationFn: async ({ listing, wantSaved }) => {
      if (wantSaved) {
        const { data } = await api.post<ToggleResponse>(
          `/api/saved/${listing.id}`,
        );
        return data.data.saved;
      }
      const { data } = await api.delete<ToggleResponse>(
        `/api/saved/${listing.id}`,
      );
      return data.data.saved;
    },
    onMutate: async ({ listing, wantSaved, seq }) => {
      await queryClient.cancelQueries({ queryKey: savedKeys.list() });
      if (seq === toggleEpoch) {
        queryClient.setQueryData<Listing[]>(savedKeys.list(), (prev) =>
          applySavedToggle(prev ?? [], listing, wantSaved),
        );
      }
      void Haptics.impactAsync(
        wantSaved
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);
      return { seq };
    },
    onError: (error, vars) => {
      if (vars.seq !== toggleEpoch) return;
      queryClient.setQueryData(savedKeys.list(), confirmedList ?? []);
      if (isAuthStatusError(error)) requestSaveAuth();
    },
    onSettled: (_data, _err, vars) => {
      pendingToggles = Math.max(0, pendingToggles - 1);
      if (pendingToggles === 0) confirmedList = null;
      if (vars.seq !== toggleEpoch) return;
      void queryClient.invalidateQueries({ queryKey: savedKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: savedKeys.one(vars.listing.id),
      });
    },
  });

  const mutate = (listing: Listing) => {
    if (authLoading) return;
    if (!isSignedIn) {
      requestSaveAuth();
      return;
    }

    const list =
      queryClient.getQueryData<Listing[]>(savedKeys.list()) ?? [];
    if (pendingToggles === 0) confirmedList = list;
    pendingToggles += 1;
    const wantSaved = !list.some((item) => item.id === listing.id);
    const seq = ++toggleEpoch;
    queryClient.setQueryData<Listing[]>(savedKeys.list(), (prev) =>
      applySavedToggle(prev ?? [], listing, wantSaved),
    );
    mutation.mutate({ listing, wantSaved, seq });
  };

  return { ...mutation, mutate };
}
