import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { useMyListings } from './useMyListings';
import { useCreationDrafts } from './useCreationDrafts';

export function useHostingNavState() {
  const { isSignedIn } = useAuthSession();
  const listings = useMyListings(isSignedIn);
  const drafts = useCreationDrafts();
  const loading = isSignedIn && (listings.isLoading || drafts.isLoading);
  const hasWork = Boolean(listings.data?.length || drafts.data?.length);
  return { loading, showSwitchToHosting: isSignedIn && hasWork, showBecomeAHost: isSignedIn && !hasWork && !loading };
}
