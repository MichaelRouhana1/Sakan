import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveExpiredAsset,
  bulkExpiredAction,
  getExpiredAsset,
  listExpiredAssets,
  nudgeExpiredAsset,
  purgeExpiredAsset,
  queueDeleteExpiredAsset,
  renewExpiredAsset,
} from "./expiredSource";
import {
  actionLabel,
  emptyCounts,
  type ExpiredActionKind,
  type ExpiredAsset,
  type ExpiredQueue,
  type ExpiredQueueCounts,
  type ExpiredSort,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

type PendingAction =
  | {
      mode: "single";
      assetId: string;
      kind: ExpiredActionKind;
    }
  | {
      mode: "bulk";
      assetIds: string[];
      kind: Extract<
        ExpiredActionKind,
        "nudge" | "archive" | "queue_delete" | "purge"
      >;
    };

export function useAdminExpired() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<ExpiredAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ExpiredQueueCounts>(emptyCounts);
  const [renewedSession, setRenewedSession] = useState(0);
  const [nudgedCount, setNudgedCount] = useState(0);
  const [queue, setQueue] = useState<ExpiredQueue>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ExpiredSort>("expiresAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ExpiredAsset | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const result = await listExpiredAssets({
        q: query,
        queue,
        sort,
        page,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
      setCounts(result.counts);
      setRenewedSession(result.renewedSession);
      setNudgedCount(result.nudgedCount);
      setStatus("ready");
      setSelectedIds((current) => {
        const next = new Set<string>();
        for (const id of current) {
          if (result.items.some((row) => row.id === id)) next.add(id);
        }
        return next;
      });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load expired assets",
      );
    }
  }, [query, queue, sort, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [queue, query, sort, pageSize]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void getExpiredAsset(selectedId)
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

  const pendingAsset = useMemo(() => {
    if (!pending || pending.mode !== "single") return null;
    return (
      items.find((row) => row.id === pending.assetId) ??
      (selectedDetail?.id === pending.assetId ? selectedDetail : null)
    );
  }, [pending, items, selectedDetail]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasQuery = query.trim().length > 0;

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function requestAction(asset: ExpiredAsset, kind: ExpiredActionKind) {
    setPending({ mode: "single", assetId: asset.id, kind });
    setNote("");
  }

  function requestBulk(
    kind: Extract<
      ExpiredActionKind,
      "nudge" | "archive" | "queue_delete" | "purge"
    >,
  ) {
    if (selectedIds.size === 0) return;
    setPending({ mode: "bulk", assetIds: [...selectedIds], kind });
    setNote("");
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const allSelected =
        items.length > 0 && items.every((row) => current.has(row.id));
      if (allSelected) return new Set();
      return new Set(items.map((row) => row.id));
    });
  }

  function patchLocal(updated: ExpiredAsset) {
    setItems((current) =>
      current.map((row) => (row.id === updated.id ? updated : row)),
    );
    setSelectedDetail((current) =>
      current?.id === updated.id ? updated : current,
    );
  }

  async function confirmPending() {
    if (!pending || note.trim().length === 0 || busy) return;
    setBusy(true);
    try {
      if (pending.mode === "single") {
        const { assetId, kind } = pending;
        let updated: ExpiredAsset;
        if (kind === "nudge") {
          updated = await nudgeExpiredAsset(assetId, note.trim());
          patchLocal(updated);
        } else if (kind === "archive") {
          updated = await archiveExpiredAsset(assetId, note.trim());
          patchLocal(updated);
        } else if (kind === "queue_delete") {
          updated = await queueDeleteExpiredAsset(assetId, note.trim());
          patchLocal(updated);
        } else if (kind === "purge") {
          updated = await purgeExpiredAsset(assetId, note.trim());
          if (selectedId === assetId) setSelectedId(null);
        } else {
          updated = await renewExpiredAsset(assetId, note.trim());
          if (selectedId === assetId) setSelectedId(null);
        }
        setFlash(`${actionLabel(kind)}: ${updated.title}.`);
        setPending(null);
        setNote("");
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(assetId);
          return next;
        });
        setReloadToken((n) => n + 1);
      } else {
        await bulkExpiredAction(pending.assetIds, pending.kind, note.trim());
        setFlash(
          `${actionLabel(pending.kind)} on ${pending.assetIds.length} listings.`,
        );
        setPending(null);
        setNote("");
        setSelectedIds(new Set());
        if (selectedId && pending.assetIds.includes(selectedId)) {
          setSelectedId(null);
        }
        setReloadToken((n) => n + 1);
      }
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
    renewedSession,
    nudgedCount,
    queue,
    setQueue,
    query,
    setQuery,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    hasQuery,
    selectedId,
    setSelectedId,
    selected: selectedDetail,
    selectedIds,
    toggleSelect,
    toggleSelectAllVisible,
    pending,
    pendingAsset,
    note,
    setNote,
    cancelPending: () => {
      setPending(null);
      setNote("");
    },
    requestAction,
    requestBulk,
    confirmPending,
    busy,
    flash,
    clearFlash: () => setFlash(null),
    retry,
  };
}
