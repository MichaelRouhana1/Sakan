import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adjustAdminCredits,
  getAdminPayment,
  listAdminPayments,
  listPaymentGrantTargets,
  refundAdminPayment,
} from "./paymentsSource";
import {
  actionLabel,
  canRefund,
  emptyOverview,
  personName,
  type AdjustmentDraft,
  type CreditChannel,
  type DateRangeId,
  type LedgerTx,
  type LedgerUser,
  type PaymentsOverview,
  type TxKind,
  type TxStatus,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

export type PendingAction =
  | { mode: "refund"; itemId: string }
  | { mode: "adjust" }
  | { mode: "detail"; itemId: string };

const EMPTY_ADJUST: AdjustmentDraft = {
  userId: "",
  postCredits: "1",
  boostCredits: "0",
  note: "",
};

export function useAdminPayments() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<LedgerTx[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<PaymentsOverview>(emptyOverview());
  const [targets, setTargets] = useState<LedgerUser[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<TxKind | "all">("all");
  const [txStatus, setTxStatus] = useState<TxStatus | "all">("all");
  const [channel, setChannel] = useState<CreditChannel | "all">("all");
  const [range, setRange] = useState<DateRangeId>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<LedgerTx | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [adjust, setAdjust] = useState<AdjustmentDraft>(EMPTY_ADJUST);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const [result, users] = await Promise.all([
        listAdminPayments({
          q: query,
          kind,
          status: txStatus,
          channel,
          range,
          page,
          pageSize,
        }),
        listPaymentGrantTargets(),
      ]);
      setItems(result.items);
      setTotal(result.total);
      setOverview(result.overview);
      setTargets(users);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load payments",
      );
    }
  }, [query, kind, txStatus, channel, range, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    setPage(1);
  }, [query, kind, txStatus, channel, range, pageSize]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void getAdminPayment(selectedId)
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

  const pendingTx = useMemo(() => {
    if (!pending || pending.mode === "adjust") return null;
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

  function requestRefund(tx: LedgerTx) {
    if (!canRefund(tx)) return;
    setPending({ mode: "refund", itemId: tx.id });
    setNote("");
    setSelectedId(tx.id);
  }

  function requestAdjust() {
    setPending({ mode: "adjust" });
    setAdjust(EMPTY_ADJUST);
  }

  function requestDetail(tx: LedgerTx) {
    setPending({ mode: "detail", itemId: tx.id });
    setSelectedId(tx.id);
  }

  async function confirmPending(): Promise<boolean> {
    if (!pending || busy) return false;
    if (pending.mode === "detail") return true;
    if (pending.mode === "refund" && note.trim().length === 0) return false;
    if (pending.mode === "adjust") {
      if (adjust.note.trim().length === 0 || !adjust.userId) return false;
    }
    setBusy(true);
    try {
      if (pending.mode === "refund") {
        const updated = await refundAdminPayment(pending.itemId, note.trim());
        setFlash(`${actionLabel("refund")}: ${personName(updated.user)}.`);
        setPending(null);
        setNote("");
        setReloadToken((n) => n + 1);
      } else {
        const updated = await adjustAdminCredits(adjust);
        setFlash(`${actionLabel("adjust")}: ${personName(updated.user)}.`);
        setPending(null);
        setAdjust(EMPTY_ADJUST);
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

  return {
    status,
    errorMessage,
    items,
    total,
    overview,
    targets,
    query,
    setQuery,
    kind,
    setKind,
    txStatus,
    setTxStatus,
    channel,
    setChannel,
    range,
    setRange,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    hasQuery,
    selectedId,
    setSelectedId,
    selected: selectedDetail,
    pending,
    pendingTx,
    note,
    setNote,
    adjust,
    setAdjust,
    cancelPending: () => {
      setPending(null);
      setNote("");
      setAdjust(EMPTY_ADJUST);
    },
    requestRefund,
    requestAdjust,
    requestDetail,
    confirmPending,
    busy,
    flash,
    clearFlash: () => setFlash(null),
    retry,
  };
}
