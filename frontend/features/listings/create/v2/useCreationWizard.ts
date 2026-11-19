import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { eventId } from '@/features/promotions/activity';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { placeToDraft } from '../placeToDraft';
import { mapDraftToBody } from '../mapDraftToBody';
import { ensureWizardUnit, formDraft, newWizard, persistable, reduceWizard, type Action, type WizardV2Draft } from './model';

export type PublishedResult = { placeId: string; listingIds: string[]; credits: number[]; total: number };
export type CreationDraftRecord = { id: string; revision: number; status: 'active' | 'published' | 'discarded'; payload: WizardV2Draft; result: PublishedResult | null; updatedAt: string };
export type PublishQuote = { units: { index: number; credits: number }[]; total: number; balance: number };
export const CREATION_DRAFTS_KEY = ['creation-drafts'];
export function errorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.error?.message ?? fallback : error instanceof Error ? error.message : fallback;
}

export function useCreationWizard({ userId, draftId, placeId, fresh = false }: { userId: string; draftId?: string; placeId?: string; fresh?: boolean }) {
  const [state, setState] = useState<WizardV2Draft | null>(null);
  const [record, setRecord] = useState<CreationDraftRecord | null>(null);
  const current = useRef<WizardV2Draft | null>(null);
  const stored = useRef<CreationDraftRecord | null>(null);
  const dirty = useRef(false);
  const tail = useRef<Promise<CreationDraftRecord | null>>(Promise.resolve(null));
  const alive = useRef(true);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const publishLock = useRef(false);
  const [changedElsewhere, setChangedElsewhere] = useState(false);
  const [retry, setRetry] = useState(0);
  const client = useQueryClient();
  const { refreshUser } = useAuthSession();
  const invalidate = useCallback(() => {
    for (const key of [CREATION_DRAFTS_KEY, ['listings'], ['credits'], ['publish-quote']]) void client.invalidateQueries({ queryKey: key });
  }, [client]);
  const apply = useCallback((row: CreationDraftRecord) => {
    stored.current = row;
    const payload = row.status === 'published' ? { ...row.payload, position: { ...row.payload.position, screen: 'success' as const } } : row.payload;
    current.current = payload; dirty.current = false;
    if (alive.current) { setRecord(row); setState(payload); setSaveState('saved'); }
  }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (draftId && stored.current?.id === draftId && !fresh) return;
    let cancelled = false;
    setLoadError(null);
    async function load() {
      let row: CreationDraftRecord;
      if (draftId) row = (await api.get(`/api/listings/creation-drafts/${draftId}`)).data.data;
      else {
        let payload = newWizard(eventId(), placeId);
        if (placeId) {
          const place = (await api.get(`/api/listings/places/${placeId}`)).data.data;
          payload = reduceWizard(payload, { type: 'loadedPlace', data: { ...placeToDraft(place), expectedPlaceUpdatedAt: new Date(place.updatedAt).toISOString() } });
        }
        if (cancelled) return;
        row = (await api.post('/api/listings/creation-drafts', { id: eventId(), payload })).data.data;
      }
      if (cancelled) return;
      apply(row); router.setParams({ draftId: row.id, placeId: undefined, new: undefined }); invalidate();
    }
    void load().catch(e => { if (!cancelled) setLoadError(errorMessage(e, 'Couldn’t open your draft. Try again.')); });
    return () => { cancelled = true; };
  }, [draftId, placeId, fresh, retry, userId, apply, invalidate]);

  const persist = useCallback(async () => {
    const work = tail.current.catch(() => null).then(async () => {
      if (!dirty.current || !stored.current || !current.current || stored.current.status !== 'active') return stored.current;
      const repaired = ['review', 'success'].includes(current.current.position.screen) ? current.current : ensureWizardUnit(current.current);
      if (repaired !== current.current) { current.current = repaired; if (alive.current) setState(repaired); }
      const snapshot = current.current;
      if (alive.current) setSaveState('saving');
      try {
        const { data } = await api.put(`/api/listings/creation-drafts/${stored.current.id}`, { payload: persistable(snapshot), revision: stored.current.revision });
        const row = data.data as CreationDraftRecord & { updatedElsewhere?: boolean };
        stored.current = row;
        if (current.current === snapshot) dirty.current = false;
        if (alive.current) { setRecord(row); setSaveState(dirty.current ? 'saving' : 'saved'); if (row.updatedElsewhere) setChangedElsewhere(true); }
        void client.invalidateQueries({ queryKey: CREATION_DRAFTS_KEY });
        return row;
      } catch(e) {
        if (alive.current) { setSaveState('error'); if (axios.isAxiosError(e) && e.response?.status === 409) setChangedElsewhere(true); }
        throw e;
      }
    });
    tail.current = work;
    return work;
  }, [client]);
  const send = useCallback((action: Action) => {
    if (!current.current || stored.current?.status !== 'active' || (current.current.pendingAttempt && action.type !== 'attempt')) return;
    const next = reduceWizard(current.current, action);
    if (next === current.current) return;
    current.current = next; dirty.current = true; setState(next); setSaveState('saving');
    if (['next','back','review','add','editUnit','editPlace','remove'].includes(action.type)) void persist().catch(() => {});
  }, [persist]);
  useEffect(() => {
    if (!state || !dirty.current) return;
    const timer = setTimeout(() => { void persist().catch(() => {}); }, 700);
    return () => clearTimeout(timer);
  }, [state, persist]);
  const reload = useCallback(async () => {
    if (!stored.current) { setRetry(n => n + 1); return; }
    try {
      let row: CreationDraftRecord = (await api.get(`/api/listings/creation-drafts/${stored.current.id}`)).data.data;
      if (row.status === 'active' && row.payload.place.id && !row.payload.pendingAttempt) {
        const place = (await api.get(`/api/listings/places/${row.payload.place.id}`)).data.data;
        row = { ...row, payload: reduceWizard(row.payload, { type: 'loadedPlace', data: { ...placeToDraft(place), expectedPlaceUpdatedAt: new Date(place.updatedAt).toISOString() } }) };
      }
      apply(row); setChangedElsewhere(false); setLoadError(null); setPublishError(null);
    } catch(e) { setPublishError(errorMessage(e, 'Couldn’t reload. Try again.')); }
  }, [apply]);
  useEffect(() => {
    const check = async () => {
      if (!stored.current || stored.current.status !== 'active' || publishing) return;
      try {
        const row: CreationDraftRecord = (await api.get(`/api/listings/creation-drafts/${stored.current.id}`)).data.data;
        if (alive.current && row.revision > stored.current.revision) { setChangedElsewhere(true); if (row.status === 'published') { apply(row); invalidate(); } }
      } catch { /* A failed save, rather than a background check, shows the retry state. */ }
    };
    const sub = AppState.addEventListener('change', value => { if (value === 'active') void check(); else void persist().catch(() => {}); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void check(); }, 15000);
    const focus = () => { void check(); };
    if (typeof window !== 'undefined') window.addEventListener('focus', focus);
    return () => { sub.remove(); clearInterval(timer); if (typeof window !== 'undefined') window.removeEventListener('focus', focus); };
  }, [publishing, persist, apply, invalidate]);
  const finish = useCallback((result: PublishedResult) => {
    if (!stored.current || stored.current.status === 'published') return;
    apply({ ...stored.current, revision: stored.current.revision + 1, status: 'published', result });
    invalidate(); void refreshUser();
  }, [apply, invalidate, refreshUser]);
  useEffect(() => {
    if (!record?.payload.pendingAttempt || record.status !== 'active') return;
    let cancelled = false;
    void api.get(`/api/listings/publish-units/${record.payload.pendingAttempt.requestId}`).then(({data}) => { if (!cancelled && data.data) finish(data.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [record?.id, record?.status, record?.payload.pendingAttempt?.requestId, finish]);

  const publish = useCallback(async (quote: PublishQuote) => {
    if (publishLock.current || !current.current || !stored.current || stored.current.status !== 'active') return;
    publishLock.current = true; setPublishing(true); setPublishError(null);
    try {
      let attempt = current.current.pendingAttempt;
      if (!attempt) {
        await persist();
        const snapshot = current.current;
        const requestId = eventId();
        attempt = { requestId, body: {
          requestId, expectedTotal: quote.total, placeId: snapshot.place.id, kind: snapshot.place.kind,
          expectedPlaceUpdatedAt: snapshot.place.data.expectedPlaceUpdatedAt,
          shared: mapDraftToBody(formDraft(snapshot)),
          sharedPhotos: snapshot.place.photos.map(p => ({ url: p.url ?? p.uri, caption: p.caption ?? '' })),
          units: snapshot.units.map(u => { const d = formDraft(snapshot, u.id); return { details: mapDraftToBody(d),
            differentFields: d.differentFields ?? [], bathroomPrivacy: d.bathroomPrivacy,
            bedsAvailable: d.spaceType === 'shared_room' ? d.bedsAvailable : undefined }; }),
        } };
        send({ type: 'attempt', attempt }); await persist();
      }
      const receipt = (await api.get(`/api/listings/publish-units/${attempt.requestId}`)).data.data;
      if (receipt) { finish(receipt); return; }
      const result = (await api.post('/api/listings/publish-units', { ...attempt.body, draftId: stored.current.id, expectedDraftRevision: stored.current.revision })).data.data;
      finish(result);
    } catch(e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      setPublishError(errorMessage(e, 'We couldn’t confirm publishing. Retry safely to check the result.'));
      if (status && status >= 400 && status < 500) {
        send({ type: 'attempt', attempt: undefined }); await persist().catch(() => {});
        if (status === 409) setChangedElsewhere(true);
      }
      invalidate();
    } finally { publishLock.current = false; if (alive.current) setPublishing(false); }
  }, [persist, send, finish, invalidate]);
  return { state, record, send, persist, saveState, loadError, publishError, publishing, publish, reload,
    changedElsewhere, dismissNotice: () => setChangedElsewhere(false), retryLoad: () => setRetry(n => n + 1) };
}
