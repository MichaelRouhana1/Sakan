import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveAdminListing,
  bulkAdminListingAction,
  dismissAdminListingReports,
  getAdminListing,
  listAdminListings,
  removeAdminListing,
  restoreAdminListing,
  setAdminListingPhotoFlag,
  updateAdminListing,
} from "./listingsSource";
import {
  actionLabel,
  emptyCounts,
  type AdminListing,
  type ListingActionKind,
  type ListingEditPatch,
  type ListingQueue,
  type ListingQueueCounts,
  type ListingSort,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

type PendingAction =
  | {
      mode: "single";
      listingId: string;
      kind: ListingActionKind;
    }
  | {
      mode: "bulk";
      listingIds: string[];
      kind: Extract<ListingActionKind, "archive" | "remove" | "dismiss_reports">;
    };

export function useAdminListings() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<AdminListing[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ListingQueueCounts>(emptyCounts);
  const [queue, setQueue] = useState<ListingQueue>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ListingSort>("publishedAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AdminListing | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<AdminListing | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const result = await listAdminListings({
        q: query,
        queue,
        sort,
        page,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
      setCounts(result.counts);
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
        err instanceof Error ? err.message : "Failed to load listings",
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
    void getAdminListing(selectedId)
      .then((row) => {
        if (!cancelled) setSelectedDetail(row);
      })
      .catch(() => {
        if (!cancelled) setSelectedDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadToken]);

  useEffect(() => {
    if (!editingId) {
      setEditingDetail(null);
      return;
    }
    const fromItems = items.find((row) => row.id === editingId);
    if (fromItems) {
      setEditingDetail(fromItems);
      return;
    }
    let cancelled = false;
    void getAdminListing(editingId)
      .then((row) => {
        if (!cancelled) setEditingDetail(row);
      })
      .catch(() => {
        if (!cancelled) setEditingDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [editingId, items, reloadToken]);

  const pendingListing = useMemo(() => {
    if (!pending || pending.mode !== "single") return null;
    return (
      items.find((row) => row.id === pending.listingId) ??
      (selectedDetail?.id === pending.listingId ? selectedDetail : null)
    );
  }, [pending, items, selectedDetail]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasQuery = query.trim().length > 0;

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function openEdit(listing: AdminListing) {
    if (listing.status === "removed") return;
    setEditingId(listing.id);
  }

  function requestAction(listing: AdminListing, kind: ListingActionKind) {
    setPending({ mode: "single", listingId: listing.id, kind });
    setNote("");
  }

  function requestBulk(
    kind: Extract<ListingActionKind, "archive" | "remove" | "dismiss_reports">,
  ) {
    if (selectedIds.size === 0) return;
    setPending({ mode: "bulk", listingIds: [...selectedIds], kind });
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

  function patchLocal(updated: AdminListing) {
    setItems((current) =>
      current.map((row) => (row.id === updated.id ? updated : row)),
    );
    setSelectedDetail((current) =>
      current?.id === updated.id ? updated : current,
    );
    setEditingDetail((current) =>
      current?.id === updated.id ? updated : current,
    );
  }

  async function confirmPending() {
    if (!pending || note.trim().length === 0 || busy) return;
    setBusy(true);
    try {
      if (pending.mode === "single") {
        const { listingId, kind } = pending;
        let updated: AdminListing;
        if (kind === "archive") {
          updated = await archiveAdminListing(listingId, note.trim());
        } else if (kind === "remove") {
          updated = await removeAdminListing(listingId, note.trim());
        } else if (kind === "restore") {
          updated = await restoreAdminListing(listingId, note.trim());
        } else {
          updated = await dismissAdminListingReports(listingId, note.trim());
        }
        setFlash(`${actionLabel(kind)}: ${updated.title}.`);
        setPending(null);
        setNote("");
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(listingId);
          return next;
        });
        patchLocal(updated);
        setReloadToken((n) => n + 1);
      } else {
        await bulkAdminListingAction(
          pending.listingIds,
          pending.kind,
          note.trim(),
        );
        setFlash(
          `${actionLabel(pending.kind)} on ${pending.listingIds.length} listings.`,
        );
        setPending(null);
        setNote("");
        setSelectedIds(new Set());
        setReloadToken((n) => n + 1);
      }
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEdit(patch: ListingEditPatch) {
    if (!editingDetail || busy) return;
    setBusy(true);
    try {
      const updated = await updateAdminListing(editingDetail.id, patch);
      patchLocal(updated);
      setFlash(`Saved details: ${updated.title}.`);
      setEditingId(null);
      setReloadToken((n) => n + 1);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function togglePhotoFlag(
    listingId: string,
    photoId: string,
    flagged: boolean,
  ) {
    setBusy(true);
    try {
      const updated = await setAdminListingPhotoFlag(
        listingId,
        photoId,
        flagged,
        flagged ? "Flagged photo for review" : "Cleared photo flag",
      );
      patchLocal(updated);
      setFlash(flagged ? "Photo flagged." : "Photo flag cleared.");
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Photo update failed");
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
    pendingListing,
    note,
    setNote,
    cancelPending: () => {
      setPending(null);
      setNote("");
    },
    requestAction,
    requestBulk,
    confirmPending,
    editing: editingDetail,
    openEdit,
    closeEdit: () => setEditingId(null),
    confirmEdit,
    togglePhotoFlag,
    busy,
    flash,
    clearFlash: () => setFlash(null),
    retry,
  };
}
