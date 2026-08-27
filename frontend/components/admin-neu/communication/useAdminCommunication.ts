import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveAdminFeedback,
  getAdminFeedback,
  listAdminBroadcasts,
  listAdminFeedback,
  listAdminNudges,
  queueAdminBroadcast,
  readAdminFeedback,
  replyAdminFeedback,
  toggleAdminNudge,
  unarchiveAdminFeedback,
  unreadAdminFeedback,
} from "./communicationSource";
import {
  actionLabel,
  actionNeedsNote,
  emptyCounts,
  emptyOverview,
  personName,
  type BroadcastDraft,
  type BroadcastJob,
  type CommsOverview,
  type FeedbackActionKind,
  type FeedbackCategory,
  type FeedbackItem,
  type FeedbackQueue,
  type FeedbackQueueCounts,
  type LifecycleNudge,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

type PendingAction =
  | { mode: "feedback"; itemId: string; kind: Extract<FeedbackActionKind, "archive" | "unarchive"> }
  | { mode: "reply"; itemId: string }
  | { mode: "blast" };

export function useAdminCommunication() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<FeedbackQueueCounts>(emptyCounts);
  const [overview, setOverview] = useState<CommsOverview>(emptyOverview);
  const [queue, setQueue] = useState<FeedbackQueue>("unread");
  const [category, setCategory] = useState<FeedbackCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<FeedbackItem | null>(
    null,
  );
  const [nudges, setNudges] = useState<LifecycleNudge[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastJob[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const [result, nudgeRows, jobs] = await Promise.all([
        listAdminFeedback({
          q: query,
          queue,
          category,
          page,
          pageSize,
        }),
        listAdminNudges(),
        listAdminBroadcasts(),
      ]);
      setItems(result.items);
      setTotal(result.total);
      setCounts(result.counts);
      setOverview(result.overview);
      setNudges(nudgeRows);
      setBroadcasts(jobs);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load communication",
      );
    }
  }, [query, queue, category, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    setPage(1);
  }, [queue, query, category, pageSize]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void getAdminFeedback(selectedId)
      .then((row) => {
        if (!cancelled) setSelectedDetail(row);
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedDetail(null);
          setSelectedId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadToken]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const pendingItem = useMemo(() => {
    if (!pending || pending.mode === "blast") return null;
    return (
      items.find((row) => row.id === pending.itemId) ??
      (selectedDetail?.id === pending.itemId ? selectedDetail : null)
    );
  }, [pending, items, selectedDetail]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasQuery = query.trim().length > 0;

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function requestAction(item: FeedbackItem, kind: FeedbackActionKind) {
    if (kind === "read" || kind === "unread") {
      void runImmediate(item.id, kind);
      return;
    }
    if (kind === "reply") {
      setPending({ mode: "reply", itemId: item.id });
      setReply("");
      setSelectedId(item.id);
      return;
    }
    setPending({ mode: "feedback", itemId: item.id, kind });
    setNote("");
    setSelectedId(item.id);
  }

  function requestBlast() {
    setPending({ mode: "blast" });
  }

  async function runImmediate(itemId: string, kind: "read" | "unread") {
    if (busy) return;
    setBusy(true);
    try {
      const updated =
        kind === "read"
          ? await readAdminFeedback(itemId)
          : await unreadAdminFeedback(itemId);
      setFlash(`${actionLabel(kind)}: ${personName(updated.user)}.`);
      setQueue(updated.queue);
      setSelectedId(itemId);
      setReloadToken((n) => n + 1);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending(draft?: BroadcastDraft): Promise<boolean> {
    if (!pending || busy) return false;
    if (pending.mode === "reply" && reply.trim().length === 0) return false;
    if (pending.mode === "feedback" && actionNeedsNote(pending.kind)) {
      if (note.trim().length === 0) return false;
    }
    if (pending.mode === "blast" && !draft) return false;
    setBusy(true);
    try {
      if (pending.mode === "reply") {
        const updated = await replyAdminFeedback(pending.itemId, reply.trim());
        setFlash(`${actionLabel("reply")}: ${personName(updated.user)}.`);
        setPending(null);
        setReply("");
        setQueue(updated.queue);
        setSelectedId(pending.itemId);
        setReloadToken((n) => n + 1);
      } else if (pending.mode === "feedback") {
        const updated =
          pending.kind === "archive"
            ? await archiveAdminFeedback(pending.itemId, note.trim())
            : await unarchiveAdminFeedback(pending.itemId, note.trim());
        setFlash(`${actionLabel(pending.kind)}: ${personName(updated.user)}.`);
        setPending(null);
        setNote("");
        setQueue(updated.queue);
        setSelectedId(pending.itemId);
        setReloadToken((n) => n + 1);
      } else {
        const job = await queueAdminBroadcast(draft!);
        setFlash(`Queued “${job.subject}” to ${job.reach.toLocaleString("en-GB")} (demo).`);
        setPending(null);
        setReloadToken((n) => n + 1);
      }
      return true;
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function toggleNudge(id: string, enabled: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await toggleAdminNudge(id, enabled);
      setFlash(`${enabled ? "Armed" : "Paused"} “${updated.title}”.`);
      setReloadToken((n) => n + 1);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    errorMessage,
    items,
    total,
    counts,
    overview,
    queue,
    setQueue,
    category,
    setCategory,
    query,
    setQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    hasQuery,
    selectedId,
    setSelectedId,
    selected: selectedDetail,
    nudges,
    broadcasts,
    pending,
    pendingItem,
    note,
    setNote,
    reply,
    setReply,
    cancelPending: () => {
      setPending(null);
      setNote("");
      setReply("");
    },
    requestAction,
    requestBlast,
    confirmPending,
    toggleNudge,
    busy,
    flash,
    clearFlash: () => setFlash(null),
    retry,
  };
}
