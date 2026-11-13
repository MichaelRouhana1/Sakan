import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { placeToDraft } from '../placeToDraft';
import { exampleWizard, type Example } from './examples';
import { newWizard, persistable, readSaved, reduceWizard, storageKey, type Action, type WizardV2Draft } from './model';

export function useWizardV2({ userId, placeId, fresh, example }: {
  userId: string | null; placeId?: string; fresh: boolean; example?: Example;
}) {
  const key = storageKey(userId, placeId, example);
  const [state, setState] = useState<WizardV2Draft | null>(null);
  const current = useRef<WizardV2Draft | null>(null);
  const alive = useRef(true);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const persist = useCallback((draft = current.current): boolean => {
    if (!draft) return false;
    try {
      localStorage.setItem(key, JSON.stringify(persistable(draft)));
      if (alive.current) setSaveState('saved');
      return true;
    } catch {
      if (alive.current) setSaveState('error');
      return false;
    }
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    setLoadError(null);
    async function load() {
      const saved = fresh ? null : readSaved(localStorage.getItem(key));
      let next = saved ?? (example ? exampleWizard(example, window.location.origin) : newWizard(crypto.randomUUID(), placeId));
      if (placeId && !saved && !example) {
        const { data } = await api.get(`/api/listings/places/${encodeURIComponent(placeId)}`);
        next = reduceWizard(next, { type: 'loadedPlace', data: placeToDraft(data.data) });
      }
      if (cancelled) return;
      current.current = next;
      setState(next);
      persist(next);
    }
    void load().catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load this prototype draft.'); });
    return () => { cancelled = true; alive.current = false; };
    // fresh is consumed once by the entry route, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retry, persist]);

  const send = useCallback((action: Action) => {
    if (!alive.current || !current.current) return;
    const next = reduceWizard(current.current, action);
    if (next === current.current) return;
    current.current = next;
    setState(next);
    setSaveState('saving');
    // Navigation is a checkpoint: do not wait for the debounce before leaving a screen.
    if (['next', 'back', 'review', 'add', 'editUnit', 'editPlace', 'remove', 'success'].includes(action.type)) persist(next);
  }, [persist]);

  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => persist(state), 700);
    return () => clearTimeout(timer);
  }, [state, persist]);

  useEffect(() => {
    const flush = () => { persist(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      persist();
    };
  }, [persist]);

  return { state, send, persist, saveState, loadError, retryLoad: () => setRetry(n => n + 1) };
}
