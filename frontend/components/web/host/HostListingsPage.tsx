import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { HostDraftModal, type DraftModalTarget } from './HostDraftModal';
import { HostListingsWorkspace } from './HostListingsWorkspace';
import { EditListingDrawer } from '@/components/listings/edit/EditListingDrawer';
import { hostEditSection } from '@/constants/hostRoutes';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { openListingEdit } from '@/features/listings/edit/openListingEdit';
import { useCreationDrafts, creationDraftTitle, creationDraftCover } from "@/features/listings/useCreationDrafts";
import { useMyListings } from '@/features/listings/useMyListings';

const first = (value: string | string[] | undefined) => typeof value === 'string' ? value.trim() : value?.[0]?.trim() ?? '';

/** Shared web/native host workspace; domain actions retain their existing flows. */
export function HostListingsPage() {
  const auth = useAuthSession();
  const draftQuery = useCreationDrafts();
  const query = useMyListings(auth.isSignedIn);
  const [draftModal, setDraftModal] = useState<DraftModalTarget | null>(null);
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ edit?: string | string[]; section?: string | string[] }>();
  const editId = Platform.OS === 'web' && focused ? first(params.edit) : '';
  const drafts = useMemo(() => (draftQuery.data ?? []).map(row => ({ key: row.id, title: creationDraftTitle(row), subtitle: [row.payload.place.data.area, row.payload.units.length + (row.payload.units.length === 1 ? " unit" : " units"), new Date(row.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })].filter(Boolean).join(" · "), coverUrl: creationDraftCover(row), onPress: () => setDraftModal(row) })), [draftQuery.data]);

  return <>
    <HostListingsWorkspace listings={query.data ?? []} drafts={drafts} loading={auth.isLoading || (auth.isSignedIn && (query.isLoading || draftQuery.isLoading))} failed={query.isError || draftQuery.isError} refreshing={query.isFetching || draftQuery.isFetching} signedIn={auth.isSignedIn} createDisabled={false} onRefresh={async () => { await Promise.all([query.refetch(), draftQuery.refetch()]); }} onEdit={listing => openListingEdit(router, listing.id)} />
    <HostDraftModal target={draftModal} onClose={() => setDraftModal(null)} onRemoved={() => { void draftQuery.refetch(); void query.refetch(); }} />
    {editId ? <EditListingDrawer listingId={editId} initialSection={hostEditSection(first(params.section))} onClose={() => router.setParams({ edit: '', section: '' })} /> : null}
  </>;
}
