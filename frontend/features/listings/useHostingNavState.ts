import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  draftHasMeaningfulProgress,
  getCheckpointCache,
  getWorkingCheckpointCache,
  refreshCheckpointCache,
  refreshWorkingCheckpointCache,
  setActiveDraftUserId,
  setCheckpointCache,
  setWorkingCheckpointCache,
} from "@/features/listings/create/createDraftCheckpoint";
import type { DraftCheckpoint } from "@/features/listings/create/draft";
import { useMyListings } from "@/features/listings/useMyListings";

export type HostingNavState = {
  loading: boolean;
  showBecomeAHost: boolean;
  showSwitchToHosting: boolean;
  checkpoint: DraftCheckpoint | null;
};

export function useCreateDraftMeta(): {
  checkpoint: DraftCheckpoint | null;
  workingCheckpoint: DraftCheckpoint | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [checkpoint, setCheckpoint] = useState<DraftCheckpoint | null>(
    getCheckpointCache(),
  );
  const [workingCheckpoint, setWorkingCheckpoint] =
    useState<DraftCheckpoint | null>(getWorkingCheckpointCache());
  const [loading, setLoading] = useState(
    !getCheckpointCache() && !getWorkingCheckpointCache(),
  );
  const { session } = useAuthSession();
  const userId = session?.userId ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const [ownerId, setOwnerId] = useState(userId);
  if (ownerId !== userId) {
    setOwnerId(userId);
    setCheckpoint(null);
    setWorkingCheckpoint(null);
    setCheckpointCache(null);
    setWorkingCheckpointCache(null);
  }

  const refresh = useCallback(async () => {
    const requested = userId;
    setActiveDraftUserId(requested);
    setLoading(true);
    try {
      const [cp, working] = await Promise.all([
        refreshCheckpointCache(),
        refreshWorkingCheckpointCache(),
      ]);
      if (userIdRef.current !== requested) return;
      setCheckpoint(cp);
      setWorkingCheckpoint(working);
    } finally {
      if (userIdRef.current === requested) setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { checkpoint, workingCheckpoint, loading, refresh };
}

export function useHostingNavState(): HostingNavState {
  const { isSignedIn } = useAuthSession();
  const { checkpoint, loading: draftLoading } = useCreateDraftMeta();
  const mine = useMyListings(isSignedIn);

  const loading = draftLoading || (isSignedIn && mine.isLoading);
  const hasAnyListing = (mine.data?.length ?? 0) > 0;
  const hasWizardPastStep0 =
    draftHasMeaningfulProgress(checkpoint) &&
    (checkpoint?.committedStep ?? -1) >= 0;

  const showSwitchToHosting =
    isSignedIn && (hasAnyListing || hasWizardPastStep0);
  const showBecomeAHost =
    isSignedIn && !showSwitchToHosting && !loading;

  return {
    loading,
    showBecomeAHost,
    showSwitchToHosting,
    checkpoint,
  };
}
