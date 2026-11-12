import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { HostDraftModal, type DraftModalTarget } from './HostDraftModal';
import { HostListingsWorkspace, type WorkspaceDraft } from './HostListingsWorkspace';
import { EditListingDrawer } from '@/components/listings/edit/EditListingDrawer';
import { hostEditSection } from '@/constants/hostRoutes';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { checkpointDisplayTitle, checkpointLocationLine, draftHasMeaningfulProgress } from '@/features/listings/create/createDraftCheckpoint';
import { useCreateDraftMeta } from '@/features/listings/useHostingNavState';
import { openListingEdit } from '@/features/listings/edit/openListingEdit';
import { useMyListings } from '@/features/listings/useMyListings';

const first = (value: string | string[] | undefined) => typeof value === 'string' ? value.trim() : value?.[0]?.trim() ?? '';

/** Shared web/native host workspace; domain actions retain their existing flows. */
export function HostListingsPage() {
  const auth = useAuthSession();
  const { checkpoint, workingCheckpoint, refresh } = useCreateDraftMeta();
  const query = useMyListings(auth.isSignedIn);
  const [draftModal, setDraftModal] = useState<DraftModalTarget | null>(null);
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ edit?: string | string[]; section?: string | string[] }>();
  const editId = Platform.OS === 'web' && focused ? first(params.edit) : '';
  const hasMain = checkpoint != null && draftHasMeaningfulProgress(checkpoint);
  const hasWorking = workingCheckpoint != null && draftHasMeaningfulProgress(workingCheckpoint);
  const drafts = useMemo(() => {
    const result: WorkspaceDraft[] = [];
    if (hasMain && checkpoint) result.push({ key: 'local-main', title: checkpointDisplayTitle(checkpoint), subtitle: checkpointLocationLine(checkpoint), onPress: () => setDraftModal({ kind: 'local', checkpoint, slot: 'main' }) });
    if (hasWorking && workingCheckpoint) result.push({ key: 'local-working', title: checkpointDisplayTitle(workingCheckpoint), subtitle: checkpointLocationLine(workingCheckpoint), onPress: () => setDraftModal({ kind: 'local', checkpoint: workingCheckpoint, slot: 'working' }) });
    for (const listing of query.data ?? []) if (listing.status === 'draft') result.push({ key: listing.id, title: listing.title?.trim() || 'Your saved listing', subtitle: listing.area, onPress: () => setDraftModal({ kind: 'server', listing }) });
    return result;
  }, [hasMain, hasWorking, checkpoint, workingCheckpoint, query.data]);

  return <>
    <HostListingsWorkspace listings={query.data ?? []} drafts={drafts} loading={auth.isLoading || (auth.isSignedIn && query.isLoading)} failed={query.isError} refreshing={query.isFetching} signedIn={auth.isSignedIn} createDisabled={hasMain && hasWorking} onRefresh={() => { void query.refetch(); void refresh(); }} onEdit={listing => openListingEdit(router, listing.id)} />
    <HostDraftModal target={draftModal} onClose={() => setDraftModal(null)} onRemoved={() => { void refresh(); void query.refetch(); }} />
    {editId ? <EditListingDrawer listingId={editId} initialSection={hostEditSection(first(params.section))} onClose={() => router.setParams({ edit: '', section: '' })} /> : null}
  </>;
}
