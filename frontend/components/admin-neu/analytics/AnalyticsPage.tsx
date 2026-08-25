import { Download } from "lucide-react-native";
import { useMemo, useState } from "react";
import { H } from "../h";
import { NeuButton } from "../NeuPrimitives";
import { AnalyticsSwitcher } from "./AnalyticsSwitcher";
import { KpiCards, buildKpis } from "./KpiCards";
import { SecondaryCards } from "./SecondaryCards";
import { TrendChart } from "./TrendChart";
import { TrendsToolbar } from "./TrendsToolbar";
import {
  ANCHOR_DATE,
  DATA_END,
  DATA_START,
  MOCK_DAYS,
  RETENTION,
  defaultCustomFrom,
} from "./mockTrends";
import {
  addDays,
  priorSlice,
  sliceRange,
  sumBy,
  toCsv,
  type RangeId,
  type SeriesId,
} from "./types";

export function AnalyticsPage() {
  const [range, setRange] = useState<RangeId>("30d");
  const [series, setSeries] = useState<SeriesId>("both");
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(DATA_END);
  const [exportedAt, setExportedAt] = useState<string | null>(null);

  const visible = useMemo(
    () => sliceRange(MOCK_DAYS, range, customFrom, customTo),
    [range, customFrom, customTo],
  );
  const prior = useMemo(() => priorSlice(MOCK_DAYS, visible), [visible]);

  const weekSignups = useMemo(() => {
    const week = sliceRange(MOCK_DAYS, "7d", customFrom, customTo);
    return sumBy(week, "signups");
  }, [customFrom, customTo]);

  const priorWeekSignups = useMemo(() => {
    const end = addDays(ANCHOR_DATE, -7);
    const start = addDays(end, -6);
    return sumBy(
      MOCK_DAYS.filter((row) => row.date >= start && row.date <= end),
      "signups",
    );
  }, []);

  const kpis = useMemo(
    () => buildKpis(visible, prior, weekSignups, priorWeekSignups),
    [visible, prior, weekSignups, priorWeekSignups],
  );

  function exportCsv() {
    if (visible.length === 0) return;
    const csv = toCsv(visible);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skoun-active-user-trends-${range}-${DATA_END}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedAt(new Date().toISOString());
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Analytics
          </H>
          <H
            as="h1"
            className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Active User Trends
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Watch renter and poster growth, stickiness, and signup pace. Demo
            series through {DATA_END}.
          </H>
        </H>
        <H className="flex flex-col items-start gap-2 sm:items-end">
          <AnalyticsSwitcher />
          <H className="flex flex-wrap items-center gap-2">
            <H
              as="span"
              className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
            >
              Demo data
            </H>
            <NeuButton tone="moss" onClick={exportCsv} disabled={visible.length === 0}>
              <Download size={16} strokeWidth={1.75} />
              Export CSV
            </NeuButton>
          </H>
        </H>
      </H>

      <KpiCards items={kpis} />

      <TrendsToolbar
        range={range}
        onRange={setRange}
        series={series}
        onSeries={setSeries}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
        minDate={DATA_START}
        maxDate={DATA_END}
      />

      {exportedAt ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          Downloaded trend report for {visible.length} days.
        </H>
      ) : null}

      <TrendChart points={visible} series={series} />

      <SecondaryCards points={visible} retention={RETENTION} />
    </H>
  );
}
