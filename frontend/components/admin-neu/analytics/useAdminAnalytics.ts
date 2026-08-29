import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminTrends } from "./analyticsSource";
import { defaultCustomFrom, DATA_END, DATA_START } from "./mockTrends";
import { buildKpis } from "./KpiCards";
import { toCsv, type RangeId, type SeriesId, type TrendsResult } from "./types";

export type LoadStatus = "loading" | "ready" | "error";

const EMPTY: TrendsResult = {
  points: [],
  prior: [],
  retention: { w1: 0, w4: 0, w8: 0 },
  dataStart: DATA_START,
  dataEnd: DATA_END,
  weekSignups: 0,
  priorWeekSignups: 0,
};

export function useAdminAnalytics() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TrendsResult>(EMPTY);
  const [range, setRange] = useState<RangeId>("30d");
  const [series, setSeries] = useState<SeriesId>("both");
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(DATA_END);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const next = await getAdminTrends({ range, customFrom, customTo });
      setResult(next);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load trends",
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

  const kpis = useMemo(
    () =>
      buildKpis(
        result.points,
        result.prior,
        result.weekSignups,
        result.priorWeekSignups,
        series,
      ),
    [result, series],
  );

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function exportCsv() {
    if (result.points.length === 0) return;
    const from = result.points[0].date;
    const to = result.points[result.points.length - 1].date;
    const csv = toCsv(result.points);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skoun-active-user-trends-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFlash(`Downloaded trend report for ${result.points.length} days.`);
  }

  return {
    status,
    errorMessage,
    points: result.points,
    retention: result.retention,
    dataStart: result.dataStart,
    dataEnd: result.dataEnd,
    range,
    setRange,
    series,
    setSeries,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    kpis,
    flash,
    retry,
    exportCsv,
  };
}
