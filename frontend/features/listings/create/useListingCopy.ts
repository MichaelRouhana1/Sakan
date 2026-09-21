import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { api } from "@/lib/api";
import { generateListingCopy, replaceDescriptionBrief, selectCopy, type CopyFacts, type CopyMode, type CopyResult } from "./listingCopyTemplates";

type ActionMode = Exclude<CopyMode, "all">;
type Pending = { mode: ActionMode; result: CopyResult; revision: number; original: string };

function usableResult(raw: unknown, mode: ActionMode): raw is CopyResult {
  if (!raw || typeof raw !== "object") return false;
  const result = raw as CopyResult;
  const text = result[mode];
  if (result.source !== "template" && result.source !== "gemini") return false;
  if (typeof text !== "string" || !text.trim()) return false;
  return mode === "title" ? text.length >= 10 && text.length <= 60
    : mode === "brief" ? text.length <= 700 && !/[\r\n]/.test(text)
    : text.length >= 20 && text.length <= 4000;
}

export function useListingCopy(facts: CopyFacts, title: string, description: string, patch: (p: { title?: string; description?: string }) => void) {
  const { session, isSignedIn, isLoading } = useAuthSession();
  const [busy, setBusy] = useState<ActionMode | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiValues, setAiValues] = useState<{ title?: string; description?: string }>({});
  const key = JSON.stringify([facts, title, description, session?.userId, isSignedIn, isLoading]);
  const state = useRef({ key, session, revision: 0 });
  if (state.current.key !== key || state.current.session !== session) {
    state.current = { key, session, revision: state.current.revision + 1 };
  }
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setBusy(null);
    setPending(null);
    setNotice(null);
  }, [key, session]);

  function apply(suggestion: Pending) {
    if (suggestion.revision !== state.current.revision) return;
    const { mode, result, original } = suggestion;
    const value = result[mode]!;
    const field = mode === "title" ? "title" : "description";
    const next = mode === "brief" ? replaceDescriptionBrief(original, value) : value;
    if (field === "description" && next.length > 4000) {
      setNotice("This would exceed 4,000 characters. Shorten the description before replacing its first paragraph.");
      return;
    }
    patch({ [field]: next });
    setAiValues((previous) => ({ ...previous, [field]: result.source === "gemini" ? next : undefined }));
    setPending(null);
  }

  async function suggest(mode: ActionMode) {
    if (request.current || !isSignedIn || isLoading) return;
    const controller = new AbortController();
    request.current = controller;
    const revision = state.current.revision;
    const original = mode === "title" ? title : description;
    setBusy(mode);
    setPending(null);
    setNotice(null);
    let result = selectCopy(generateListingCopy(facts), mode, "template");
    try {
      const response = await api.post<{ data: CopyResult }>("/api/listings/copy-suggest", { mode, facts }, { signal: controller.signal, timeout: 10000 });
      if (usableResult(response.data?.data, mode)) result = response.data.data;
    } catch {
      // Local templates also cover an unreachable API or expired backend session.
    }
    if (!mounted.current || controller.signal.aborted || revision !== state.current.revision) return;
    request.current = null;
    setBusy(null);
    const suggestion = { mode, result, revision, original };
    if (original.trim()) setPending(suggestion);
    else apply(suggestion);
  }

  return {
    busy, pending: pending?.revision === state.current.revision ? pending : null,
    notice, suggest, apply: () => pending && apply(pending),
    cancel: () => { setPending(null); setNotice(null); },
    disabled: Boolean(busy) || !isSignedIn || isLoading,
    titleIsAi: Boolean(aiValues.title && aiValues.title === title),
    descriptionIsAi: Boolean(aiValues.description && aiValues.description === description),
  };
}
