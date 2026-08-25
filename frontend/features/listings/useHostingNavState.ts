import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  draftHasMeaningfulProgress,
  getCheckpointCache,
  getWorkingCheckpointCache,
  refreshCheckpointCache,
  refreshWorkingCheckpointCache,
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

  const refresh = useCallback(async () => {
    setLoading(true);
    const [cp, working] = await Promise.all([
      refreshCheckpointCache(),
      refreshWorkingCheckpointCache(),
    ]);
    setCheckpoint(cp);
    setWorkingCheckpoint(working);
    setLoading(false);
  }, []);

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
