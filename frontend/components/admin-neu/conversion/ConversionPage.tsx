import { useMemo, useState } from "react";
import { KpiCards, type KpiItem } from "../analytics/KpiCards";
import { AnalyticsSwitcher } from "../analytics/AnalyticsSwitcher";
import { deltaPct, formatCount } from "../analytics/types";
import { H } from "../h";
import { AbandonedTable } from "./AbandonedTable";
import { ConversionToolbar } from "./ConversionToolbar";
import { FunnelChart } from "./FunnelChart";
import {
  ANCHOR_TS,
  DATA_END,
  DATA_START,
  MOCK_DAYS,
  MOCK_DRAFTS,
  defaultCustomFrom,
} from "./mockConversion";
import {
  buildStages,
  daysStalled,
  personName,
  priorDays,
  sliceDays,
  sparkFor,
  stepLabel,
  sumCounts,
  type AbandonedDraft,
  type FunnelStepId,
  type RangeId,
} from "./types";

export function ConversionPage() {
  const [range, setRange] = useState<RangeId>("30d");
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(DATA_END);
  const [drafts, setDrafts] = useState(MOCK_DRAFTS);
  const [stepFilter, setStepFilter] = useState<FunnelStepId | "all">("all");
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(
    () => sliceDays(MOCK_DAYS, range, customFrom, customTo),
    [range, customFrom, customTo],
  );
  const prior = useMemo(() => priorDays(MOCK_DAYS, visible), [visible]);
  const stages = useMemo(() => buildStages(visible), [visible]);

  const kpis = useMemo(() => buildKpis(visible, prior), [visible, prior]);

  const rangeDrafts = useMemo(() => {
    if (visible.length === 0) return [];
    const from = visible[0].date;
    const to = visible[visible.length - 1].date;
    return drafts.filter((draft) => {
      const day = draft.lastActiveAt.slice(0, 10);
      return day >= from && day <= to;
    });
  }, [drafts, visible]);

  const stepCounts = useMemo(() => {
    const counts = new Map<FunnelStepId | "all", number>();
    counts.set("all", rangeDrafts.length);
    for (const draft of rangeDrafts) {
      counts.set(draft.lastStepId, (counts.get(draft.lastStepId) ?? 0) + 1);
    }
    return counts;
  }, [rangeDrafts]);

  const tableRows = useMemo(() => {
    return rangeDrafts
      .filter((draft) =>
        stepFilter === "all" ? true : draft.lastStepId === stepFilter,
      )
      .sort(
        (a, b) =>
          daysStalled(b.lastActiveAt, ANCHOR_TS) -
          daysStalled(a.lastActiveAt, ANCHOR_TS),
      );
  }, [rangeDrafts, stepFilter]);

  function remind(draft: AbandonedDraft) {
    if (draft.reminderSentAt) return;
    setDrafts((current) =>
      current.map((row) =>
        row.id === draft.id
          ? { ...row, reminderSentAt: new Date().toISOString() }
          : row,
      ),
    );
    setNotice(`Reminder queued for ${personName(draft.poster)}.`);
  }

  const stepChips: { id: FunnelStepId | "all"; label: string; count: number }[] = [
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

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
            Listing Conversion
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Watch posters move through the create-listing wizard. Demo funnel
            through {DATA_END}.
          </H>
        </H>
        <H className="flex flex-col items-start gap-2 sm:items-end">
          <AnalyticsSwitcher />
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data
          </H>
        </H>
      </H>

      <KpiCards items={kpis} />

      <ConversionToolbar
        range={range}
        onRange={setRange}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
        minDate={DATA_START}
        maxDate={DATA_END}
      />

      {notice ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {notice}
        </H>
      ) : null}

      <FunnelChart stages={stages} />

      <H className="flex flex-col gap-3">
        <H className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <H>
            <H
              as="p"
              className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
            >
              Recover
            </H>
            <H as="h2" className="mt-1 font-display text-xl font-semibold text-clay-900">
              Abandoned drafts
            </H>
            <H as="p" className="mt-1 text-sm text-clay-700">
              Posters who started a listing and never published. Nudge the ones
              still sitting in photos and utilities.
            </H>
          </H>
          <H
            as="span"
            className="text-sm tabular-nums text-clay-500"
          >
            {tableRows.length} in view
          </H>
        </H>

        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
          role="tablist"
          aria-label="Abandoned step filter"
        >
          {stepChips.map((chip) => {
            const selected = stepFilter === chip.id;
            return (
              <H
                key={chip.id}
                as="button"
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStepFilter(chip.id)}
                className={[
                  "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                  selected
                    ? "bg-clay-100 text-clay-900 shadow-press"
                    : "bg-transparent text-clay-700",
                ].join(" ")}
              >
                {chip.label}
                <H
                  as="span"
                  className="tabular-nums text-clay-500"
                >
                  {chip.count}
                </H>
              </H>
            );
          })}
        </H>

        <AbandonedTable
          drafts={tableRows}
          nowIso={ANCHOR_TS}
          onRemind={remind}
        />
      </H>
    </H>
  );
}

function buildKpis(
  current: ReturnType<typeof sliceDays>,
  prior: ReturnType<typeof sliceDays>,
): KpiItem[] {
  const now = sumCounts(current);
  const then = sumCounts(prior);
  const started = now.type;
  const published = now.published;
  const abandoned = Math.max(0, started - published);
  const rate = started > 0 ? (published / started) * 100 : 0;
  const priorRate =
    then.type > 0 ? (then.published / then.type) * 100 : rate;
  const priorAbandoned = Math.max(0, then.type - then.published);

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
      id: "abandoned",
      label: "Abandoned drafts",
      value: formatCount(abandoned),
      hint: "Started but never went live",
      delta: deltaPct(abandoned, priorAbandoned),
      spark: sparkFor(current, "abandoned"),
      invertDelta: true,
    },
  ];
}
