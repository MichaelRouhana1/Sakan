import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addAdminDomain,
  clearAdminAlert,
  getAdminAlert,
  getAdminKyc,
  grantAdminKyc,
  listAdminAlerts,
  listAdminDomains,
  listAdminKyc,
  rejectAdminKyc,
  removeAdminDomain,
  reopenAdminKyc,
  restrictAdminAlert,
  reviewAdminAlert,
  revokeAdminKyc,
  warnAdminAlert,
} from "./trustSource";
import {
  actionLabel,
  actionNeedsNote,
  emptyKycCounts,
  emptyOverview,
  personName,
  type AcademicDomain,
  type AlertActionKind,
  type AlertSeverity,
  type AlertStatus,
  type KycActionKind,
  type KycCase,
  type KycQueue,
  type KycQueueCounts,
  type ScamAlert,
  type TrustOverview,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

export type PendingAction =
  | { mode: "kyc"; itemId: string; kind: KycActionKind }
  | {
      mode: "alert";
      itemId: string;
      kind: Extract<AlertActionKind, "warn" | "restrict" | "clear">;
    }
  | { mode: "domain"; itemId: string };

export function useAdminTrust() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<KycCase[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<KycQueueCounts>(emptyKycCounts());
  const [overview, setOverview] = useState<TrustOverview>(emptyOverview());
  const [queue, setQueue] = useState<KycQueue>("pending");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<KycCase | null>(null);

  const [alerts, setAlerts] = useState<ScamAlert[]>([]);
  const [alertTotal, setAlertTotal] = useState(0);
  const [alertQuery, setAlertQuery] = useState("");
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity | "all">(
    "all",
  );
  const [alertStatus, setAlertStatus] = useState<AlertStatus | "all">("all");
  const [alertPage, setAlertPage] = useState(1);
  const [alertPageSize, setAlertPageSize] = useState(10);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<ScamAlert | null>(null);

  const [domains, setDomains] = useState<AcademicDomain[]>([]);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const [kycResult, alertResult, domainRows] = await Promise.all([
        listAdminKyc({ q: query, queue, page, pageSize }),
        listAdminAlerts({
          q: alertQuery,
          severity: alertSeverity,
          status: alertStatus,
          page: alertPage,
          pageSize: alertPageSize,
        }),
        listAdminDomains(),
      ]);
      setItems(kycResult.items);
      setTotal(kycResult.total);
      setCounts(kycResult.counts);
      setOverview(kycResult.overview);
      setAlerts(alertResult.items);
      setAlertTotal(alertResult.total);
      setDomains(domainRows);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load trust",
      );
    }
  }, [
    query,
    queue,
    page,
    pageSize,
    alertQuery,
    alertSeverity,
    alertStatus,
    alertPage,
    alertPageSize,
  ]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    setPage(1);
  }, [queue, query, pageSize]);

  useEffect(() => {
    setAlertPage(1);
  }, [alertQuery, alertSeverity, alertStatus, alertPageSize]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void getAdminKyc(selectedId)
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
    if (!selectedAlertId) {
      setSelectedAlert(null);
      return;
    }
    let cancelled = false;
    void getAdminAlert(selectedAlertId)
      .then((row) => {
        if (!cancelled) setSelectedAlert(row);
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedAlert(null);
          setSelectedAlertId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAlertId, reloadToken]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const pendingKyc = useMemo(() => {
    if (!pending || pending.mode !== "kyc") return null;
    return (
      items.find((row) => row.id === pending.itemId) ??
      (selectedDetail?.id === pending.itemId ? selectedDetail : null)
    );
  }, [pending, items, selectedDetail]);

  const pendingAlert = useMemo(() => {
    if (!pending || pending.mode !== "alert") return null;
    return (
      alerts.find((row) => row.id === pending.itemId) ??
      (selectedAlert?.id === pending.itemId ? selectedAlert : null)
    );
  }, [pending, alerts, selectedAlert]);

  const pendingDomain = useMemo(() => {
    if (!pending || pending.mode !== "domain") return null;
    return domains.find((row) => row.id === pending.itemId) ?? null;
  }, [pending, domains]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const alertPageCount = Math.max(1, Math.ceil(alertTotal / alertPageSize));
  const hasQuery = query.trim().length > 0;
  const hasAlertQuery = alertQuery.trim().length > 0;
  const hasAlertFilters =
    hasAlertQuery || alertSeverity !== "all" || alertStatus !== "all";

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function requestKycAction(item: KycCase, kind: KycActionKind) {
    setPending({ mode: "kyc", itemId: item.id, kind });
    setNote("");
    setSelectedId(item.id);
  }

  function requestAlertAction(item: ScamAlert, kind: AlertActionKind) {
    if (kind === "review") {
      void runReview(item.id);
      return;
    }
    setPending({ mode: "alert", itemId: item.id, kind });
    setNote("");
    setSelectedAlertId(item.id);
  }

  function requestDomainRemove(item: AcademicDomain) {
    setPending({ mode: "domain", itemId: item.id });
    setNote("");
  }

  async function runReview(alertId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await reviewAdminAlert(alertId);
      setFlash(`${actionLabel("review")}: ${updated.title}.`);
      setSelectedAlertId(alertId);
      setReloadToken((n) => n + 1);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending(): Promise<boolean> {
    if (!pending || busy) return false;
    if (actionNeedsNote(pending.mode === "domain" ? "remove_domain" : pending.kind)) {
      if (note.trim().length === 0) return false;
    }
    setBusy(true);
    try {
      if (pending.mode === "kyc") {
        const trimmed = note.trim();
        const updated =
          pending.kind === "grant_badge"
            ? await grantAdminKyc(pending.itemId, trimmed)
            : pending.kind === "revoke_badge"
              ? await revokeAdminKyc(pending.itemId, trimmed)
              : pending.kind === "reject_kyc"
                ? await rejectAdminKyc(pending.itemId, trimmed)
                : await reopenAdminKyc(pending.itemId, trimmed);
        setFlash(`${actionLabel(pending.kind)}: ${personName(updated.poster)}.`);
        setPending(null);
        setNote("");
        setQueue(updated.queue);
        setSelectedId(pending.itemId);
        setReloadToken((n) => n + 1);
      } else if (pending.mode === "alert") {
        const trimmed = note.trim();
        const updated =
          pending.kind === "warn"
            ? await warnAdminAlert(pending.itemId, trimmed)
            : pending.kind === "restrict"
              ? await restrictAdminAlert(pending.itemId, trimmed)
              : await clearAdminAlert(pending.itemId, trimmed);
        setFlash(`${actionLabel(pending.kind)}: ${updated.title}.`);
        setPending(null);
        setNote("");
        setSelectedAlertId(pending.itemId);
        setReloadToken((n) => n + 1);
      } else {
        const removed = await removeAdminDomain(pending.itemId, note.trim());
        setFlash(`Removed @${removed.domain}.`);
        setPending(null);
        setNote("");
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

  async function addDomain(domain: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      const added = await addAdminDomain(domain);
      setFlash(`Mapped @${added.domain} (demo).`);
      setReloadToken((n) => n + 1);
      return true;
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
      return false;
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
    alerts,
    alertTotal,
    alertQuery,
    setAlertQuery,
    alertSeverity,
    setAlertSeverity,
    alertStatus,
    setAlertStatus,
    alertPage,
    setAlertPage,
    alertPageSize,
    setAlertPageSize,
    alertPageCount,
    hasAlertQuery,
    hasAlertFilters,
    selectedAlertId,
    setSelectedAlertId,
    selectedAlert,
    domains,
    pending,
    pendingKyc,
    pendingAlert,
    pendingDomain,
    note,
    setNote,
    cancelPending: () => {
      setPending(null);
      setNote("");
    },
    requestKycAction,
    requestAlertAction,
    requestDomainRemove,
    confirmPending,
    addDomain,
    busy,
    flash,
    clearFlash: () => setFlash(null),
    retry,
  };
}
