import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { api } from '@/lib/api';
import { CREATION_DRAFTS_KEY, type CreationDraftRecord } from './create/v2/useCreationWizard';

export function meaningfulCreationDraft(row: CreationDraftRecord) {
  return Boolean(row.payload.place.kind || row.payload.place.id || row.payload.units.some(u => u.data.title || u.data.photos?.length));
}
export function useCreationDrafts() {
  const { isSignedIn, session } = useAuthSession();
  return useQuery({ queryKey: [...CREATION_DRAFTS_KEY, session?.userId], enabled: isSignedIn,
    queryFn: async () => ((await api.get('/api/listings/creation-drafts')).data.data as CreationDraftRecord[]).filter(meaningfulCreationDraft), staleTime: 0 });
}
export function creationDraftTitle(row: CreationDraftRecord) {
  const title = row.payload.units[0]?.data.title?.trim();
  return row.payload.units.length === 1 && title ? title : row.payload.place.data.buildingName?.trim() || 'Your place in progress';
}
export function creationDraftCover(row: CreationDraftRecord) {
  const photo = row.payload.units.flatMap(u => u.data.photos ?? []).find(p => p.status === 'ready') ?? row.payload.place.photos.find(p => p.status === 'ready');
  return photo?.url || photo?.uri;
}
