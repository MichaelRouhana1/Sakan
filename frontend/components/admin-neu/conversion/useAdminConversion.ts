import { useCallback, useEffect, useMemo, useState } from "react";
import type { KpiItem } from "../analytics/KpiCards";
import { deltaPct, formatCount } from "../analytics/types";
import {
  getAdminFunnel,
  listAdminAbandoned,
  remindAdminDraft,
} from "./conversionSource";
import { DATA_END, DATA_START, defaultCustomFrom, ANCHOR_TS } from "./mockConversion";
import {
  buildStages,
  daysStalled,
  personName,
  sparkFor,
  stepLabel,
  sumCounts,
  type AbandonedDraft,
  type FunnelResult,
  type FunnelStepId,
  type RangeId,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

const EMPTY_FUNNEL: FunnelResult = {
  days: [],
  prior: [],
  dataStart: DATA_START,
  dataEnd: DATA_END,
};

function conversionKpis(
  current: FunnelResult["days"],
  prior: FunnelResult["days"],
): KpiItem[] {
  const now = sumCounts(current);
  const then = sumCounts(prior);
  const started = now.type;
  const published = now.published;
  const unpublished = Math.max(0, started - published);
  const rate = started > 0 ? (published / started) * 100 : 0;
  const priorRate = then.type > 0 ? (then.published / then.type) * 100 : rate;
  const priorUnpublished = Math.max(0, then.type - then.published);

  return [
    {
      id: "started",
      label: "Drafts started",
      value: formatCount(started),
      hint: "Entered place type",
      delta: deltaPct(started, then.type),
      spark: sparkFor(current, "type"),
    },
    {
      id: "published",
      label: "Published listings",
      value: formatCount(published),
      hint: "Made it through review",
      delta: deltaPct(published, then.published),
      spark: sparkFor(current, "published"),
    },
    {
      id: "rate",
      label: "Overall conversion",
      value: `${rate.toFixed(1)}%`,
      hint: "Published / started",
      delta: rate - priorRate,
      spark: sparkFor(current, "rate"),
    },
    {
      id: "unpublished",
      label: "Did not publish",
      value: formatCount(unpublished),
      hint: "Started but never went live",
      delta: deltaPct(unpublished, priorUnpublished),
      spark: sparkFor(current, "abandoned"),
      invertDelta: true,
    },
  ];
}

export function useAdminConversion() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<FunnelResult>(EMPTY_FUNNEL);
  const [drafts, setDrafts] = useState<AbandonedDraft[]>([]);
  const [range, setRange] = useState<RangeId>("30d");
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(DATA_END);
  const [stepFilter, setStepFilter] = useState<FunnelStepId | "all">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const next = await getAdminFunnel({ range, customFrom, customTo });
      const from = next.days[0]?.date ?? customFrom;
      const to = next.days[next.days.length - 1]?.date ?? customTo;
      const rows = await listAdminAbandoned({ from, to, step: "all" });
      setFunnel(next);
      setDrafts(rows);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load conversion",
      );
    }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const stages = useMemo(() => buildStages(funnel.days), [funnel.days]);
  const kpis = useMemo(
    () => conversionKpis(funnel.days, funnel.prior),
    [funnel],
  );

  const stepCounts = useMemo(() => {
    const counts = new Map<FunnelStepId | "all", number>();
    counts.set("all", drafts.length);
    for (const draft of drafts) {
      counts.set(draft.lastStepId, (counts.get(draft.lastStepId) ?? 0) + 1);
    }
    return counts;
  }, [drafts]);

  const tableRows = useMemo(() => {
    return drafts
      .filter((draft) =>
        stepFilter === "all" ? true : draft.lastStepId === stepFilter,
      )
      .sort(
        (a, b) =>
          daysStalled(b.lastActiveAt, ANCHOR_TS) -
          daysStalled(a.lastActiveAt, ANCHOR_TS),
      );
  }, [drafts, stepFilter]);

  const pendingDraft =
    drafts.find((row) => row.id === pendingId) ??
    tableRows.find((row) => row.id === pendingId) ??
    null;

  const stepChips: { id: FunnelStepId | "all"; label: string; count: number }[] =
    [
      { id: "all", label: "All", count: stepCounts.get("all") ?? 0 },
      ...Array.from(stepCounts.entries())
        .filter((entry): entry is [FunnelStepId, number] => entry[0] !== "all")
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({
          id,
          label: stepLabel(id),
          count,
        })),
    ];

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function requestRemind(draft: AbandonedDraft) {
    if (draft.reminderSentAt) return;
    setPendingId(draft.id);
  }

  function cancelPending() {
    setPendingId(null);
  }

  async function confirmRemind(): Promise<boolean> {
    if (!pendingId || busy) return false;
    setBusy(true);
    try {
      const updated = await remindAdminDraft(pendingId);
      setDrafts((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      setFlash(`Reminder queued for ${personName(updated.poster)}.`);
      setPendingId(null);
      return true;
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Remind failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    errorMessage,
    dataStart: funnel.dataStart,
    dataEnd: funnel.dataEnd,
    range,
    setRange,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    stepFilter,
    setStepFilter,
    kpis,
    stages,
    tableRows,
    stepChips,
    pendingDraft,
    busy,
    flash,
    nowIso: ANCHOR_TS,
    retry,
    requestRemind,
    cancelPending,
    confirmRemind,
  };
}
