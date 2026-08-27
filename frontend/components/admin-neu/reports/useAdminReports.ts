import { useCallback, useEffect, useMemo, useState } from "react";
import {
  banPosterFromReport,
  bulkReportAction,
  claimAdminReport,
  dismissAdminReport,
  dismissListingReports,
  getAdminReport,
  getRelatedReports,
  listAdminReports,
  removeListingFromReport,
  reopenAdminReport,
  restrictPosterFromReport,
  unclaimAdminReport,
  warnPosterFromReport,
} from "./reportsSource";
import {
  actionLabel,
  actionNeedsNote,
  emptyCounts,
  type AdminReport,
  type ReportActionKind,
  type ReportQueue,
  type ReportQueueCounts,
  type ReportSort,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

type BulkKind = Extract<ReportActionKind, "claim" | "dismiss" | "remove">;

type PendingAction =
  | {
      mode: "single";
      reportId: string;
      kind: ReportActionKind;
    }
  | {
      mode: "bulk";
      reportIds: string[];
      kind: BulkKind;
    };

export function useAdminReports() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ReportQueueCounts>(emptyCounts);
  const [openCount, setOpenCount] = useState(0);
  const [queue, setQueue] = useState<ReportQueue>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ReportSort>("createdAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AdminReport | null>(
    null,
  );
  const [related, setRelated] = useState<AdminReport[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const result = await listAdminReports({
        q: query,
        queue,
        sort,
        page,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
      setCounts(result.counts);
      setOpenCount(result.openCount);
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
        err instanceof Error ? err.message : "Failed to load reports",
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
      setRelated([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const row = await getAdminReport(selectedId);
        if (cancelled) return;
        setSelectedDetail(row);
        const siblings = await getRelatedReports(row.listing.id, row.id);
        if (!cancelled) setRelated(siblings);
      } catch {
        if (!cancelled) {
          setSelectedDetail(null);
          setSelectedId(null);
          setRelated([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadToken]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const pendingReport = useMemo(() => {
    if (!pending || pending.mode !== "single") return null;
    return (
      items.find((row) => row.id === pending.reportId) ??
      (selectedDetail?.id === pending.reportId ? selectedDetail : null)
    );
  }, [pending, items, selectedDetail]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasQuery = query.trim().length > 0;

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function requestAction(report: AdminReport, kind: ReportActionKind) {
    if (kind === "claim" || kind === "unclaim") {
      void runImmediate(report.id, kind);
      return;
    }
    setPending({ mode: "single", reportId: report.id, kind });
    setNote("");
  }

  function requestBulk(kind: BulkKind) {
    if (selectedIds.size === 0) return;
    if (kind === "claim") {
      void runBulkImmediate([...selectedIds], kind);
      return;
    }
    setPending({ mode: "bulk", reportIds: [...selectedIds], kind });
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

  async function runImmediate(reportId: string, kind: "claim" | "unclaim") {
    if (busy) return;
    setBusy(true);
    try {
      const updated =
        kind === "claim"
          ? await claimAdminReport(reportId)
          : await unclaimAdminReport(reportId);
      setFlash(`${actionLabel(kind)}: ${updated.listing.title}.`);
      if (kind === "claim") setQueue("in_review");
      setSelectedId(reportId);
      setReloadToken((n) => n + 1);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function runBulkImmediate(ids: string[], kind: "claim") {
    if (busy) return;
    setBusy(true);
    try {
      await bulkReportAction(ids, kind, "Bulk claim");
      setFlash(`${actionLabel(kind)} on ${ids.length} tickets.`);
      setSelectedIds(new Set());
      setReloadToken((n) => n + 1);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending() {
    if (!pending || busy) return;
    if (pending.mode === "bulk" || actionNeedsNote(pending.kind)) {
      if (note.trim().length === 0) return;
    }
    setBusy(true);
    try {
      if (pending.mode === "single") {
        const { reportId, kind } = pending;
        const trimmed = note.trim();
        let updated: AdminReport | null = null;
        if (kind === "dismiss") {
          updated = await dismissAdminReport(reportId, trimmed);
        } else if (kind === "dismiss_listing") {
          const focus = pendingReport;
          const listingId = focus?.listing.id;
          if (!listingId) throw new Error("Listing not found");
          const rows = await dismissListingReports(
            listingId,
            trimmed,
            reportId,
          );
          updated = rows.find((row) => row.id === reportId) ?? rows[0] ?? null;
        } else if (kind === "remove") {
          updated = await removeListingFromReport(reportId, trimmed);
        } else if (kind === "warn") {
          updated = await warnPosterFromReport(reportId, trimmed);
        } else if (kind === "restrict") {
          updated = await restrictPosterFromReport(reportId, trimmed);
        } else if (kind === "ban") {
          updated = await banPosterFromReport(reportId, trimmed);
        } else if (kind === "reopen") {
          updated = await reopenAdminReport(reportId, trimmed);
        } else if (kind === "claim") {
          updated = await claimAdminReport(reportId, trimmed);
        } else if (kind === "unclaim") {
          updated = await unclaimAdminReport(reportId, trimmed);
        }
        setFlash(
          `${actionLabel(kind)}${updated ? `: ${updated.listing.title}` : ""}.`,
        );
        setPending(null);
        setNote("");
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(reportId);
          return next;
        });
        setReloadToken((n) => n + 1);
      } else {
        await bulkReportAction(pending.reportIds, pending.kind, note.trim());
        setFlash(
          `${actionLabel(pending.kind)} on ${pending.reportIds.length} tickets.`,
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

  return {
    status,
    errorMessage,
    items,
    total,
    counts,
    openCount,
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
    related,
    selectedIds,
    toggleSelect,
    toggleSelectAllVisible,
    pending,
    pendingReport,
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
