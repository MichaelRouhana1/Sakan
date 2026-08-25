import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import {
  WEEKDAYS,
  bucketPoints,
  formatCount,
  meanBy,
  weekdayAverages,
  type DayPoint,
} from "./types";

type Props = {
  points: DayPoint[];
  retention: { w1: number; w4: number; w8: number };
};

export function SecondaryCards({ points, retention }: Props) {
  const last = points[points.length - 1];
  const avgDau = meanBy(points, "dau");
  const avgMau = meanBy(points, "mau");
  const stickiness = avgMau > 0 ? (avgDau / avgMau) * 100 : 0;
  const splitRenters = last?.dauRenters ?? 0;
  const splitPosters = last?.dauPosters ?? 0;
  const splitTotal = Math.max(1, splitRenters + splitPosters);
  const bars = bucketPoints(points, 18);
  const week = weekdayAverages(points);
  const weekMax = Math.max(1, ...week);

  return (
    <H className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <NeuSurface as="section" className="px-4 py-4 md:px-5">
        <H
          as="p"
          className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
        >
          Stickiness
        </H>
        <H as="h3" className="mt-1 font-display text-lg font-semibold text-clay-900">
          DAU vs MAU
        </H>
        <H className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Avg DAU" value={formatCount(avgDau)} tone="moss" />
          <MiniStat label="Avg MAU" value={formatCount(avgMau)} tone="ochre" />
        </H>
        <H className="mt-4">
          <H className="mb-2 flex items-center justify-between text-xs text-clay-700">
            <H as="span">DAU / MAU</H>
            <H as="span" className="font-semibold tabular-nums text-clay-900">
              {stickiness.toFixed(1)}%
            </H>
          </H>
          <H
            className="h-3 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm"
            role="img"
            aria-label={`Stickiness ${stickiness.toFixed(1)} percent`}
          >
            <H
              className="h-full rounded-full bg-moss-soft"
              style={{ width: `${Math.min(100, stickiness * 2.2)}%` }}
            />
          </H>
        </H>
        <H className="mt-4 flex gap-2">
          <RoleShare
            label="Renter DAU"
            value={splitRenters}
            pct={(splitRenters / splitTotal) * 100}
            tone="moss"
          />
          <RoleShare
            label="Poster DAU"
            value={splitPosters}
            pct={(splitPosters / splitTotal) * 100}
            tone="ochre"
          />
        </H>
      </NeuSurface>

      <NeuSurface as="section" className="px-4 py-4 md:px-5">
        <H
          as="p"
          className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
        >
          Volume
        </H>
        <H as="h3" className="mt-1 font-display text-lg font-semibold text-clay-900">
          Daily active mix
        </H>
        <H
          className="mt-4 flex h-36 items-end gap-1 rounded-neu-md bg-clay-100 px-2 pb-2 pt-3 shadow-neu-in"
          role="img"
          aria-label="Daily active users over selected range"
        >
          {bars.map((row) => {
            const max = Math.max(...bars.map((b) => b.dau), 1);
            const totalPx = 112;
            const rH = Math.max(2, (row.dauRenters / max) * totalPx);
            const pH = Math.max(2, (row.dauPosters / max) * totalPx);
            return (
              <H
                key={row.date}
                className="flex h-full min-w-0 flex-1 flex-col justify-end gap-0.5"
                title={`${row.date}: ${formatCount(row.dau)} DAU`}
              >
                <H
                  className="w-full rounded-t-[3px] bg-ochre-soft"
                  style={{ height: pH }}
                />
                <H
                  className="w-full rounded-t-[3px] bg-moss-soft"
                  style={{ height: rH }}
                />
              </H>
            );
          })}
        </H>
        <H className="mt-3 flex flex-wrap gap-3 text-[11px] text-clay-700">
          <Swatch tone="moss" label="Renter DAU" />
          <Swatch tone="ochre" label="Poster DAU" />
        </H>
      </NeuSurface>

      <NeuSurface as="section" className="px-4 py-4 md:px-5">
        <H
          as="p"
          className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
        >
          Retention
        </H>
        <H as="h3" className="mt-1 font-display text-lg font-semibold text-clay-900">
          Cohort return + weekday pulse
        </H>
        <H className="mt-4 flex flex-col gap-2.5">
          <RetentionRow label="Week 1" value={retention.w1} />
          <RetentionRow label="Week 4" value={retention.w4} />
          <RetentionRow label="Week 8" value={retention.w8} />
        </H>
        <H
          className="mt-5 flex h-20 items-end gap-1.5"
          role="img"
          aria-label="Average DAU by weekday"
        >
          {week.map((value, i) => {
            const h = Math.max(6, (value / weekMax) * 64);
            return (
              <H
                key={WEEKDAYS[i]}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <H
                  className="w-full rounded-full bg-moss-soft shadow-neu-in-sm"
                  style={{ height: h }}
                />
                <H as="span" className="text-[10px] font-medium text-clay-500">
                  {WEEKDAYS[i]}
                </H>
              </H>
            );
          })}
        </H>
      </NeuSurface>
    </H>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "moss" | "ochre";
}) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-3 py-3 shadow-neu-in-sm">
      <H as="p" className="text-[11px] text-clay-700">
        {label}
      </H>
      <H
        as="p"
        className={[
          "mt-1 font-display text-xl font-semibold tabular-nums",
          tone === "moss" ? "text-moss" : "text-ochre",
        ].join(" ")}
      >
        {value}
      </H>
    </H>
  );
}

function RoleShare({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: "moss" | "ochre";
}) {
  return (
    <H className="min-w-0 flex-1 rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-sm">
      <H as="p" className="text-[11px] text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-0.5 font-display text-base font-semibold tabular-nums text-clay-900">
        {formatCount(value)}
      </H>
      <H as="p" className={tone === "moss" ? "text-[11px] text-moss" : "text-[11px] text-ochre"}>
        {pct.toFixed(0)}% of DAU
      </H>
    </H>
  );
}

function RetentionRow({ label, value }: { label: string; value: number }) {
  return (
    <H>
      <H className="mb-1 flex items-center justify-between text-xs">
        <H as="span" className="text-clay-700">
          {label}
        </H>
        <H as="span" className="font-semibold tabular-nums text-clay-900">
          {(value * 100).toFixed(0)}%
        </H>
      </H>
      <H className="h-2.5 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm">
        <H
          className="h-full rounded-full bg-moss-soft"
          style={{ width: `${value * 100}%` }}
        />
      </H>
    </H>
  );
}

function Swatch({ tone, label }: { tone: "moss" | "ochre"; label: string }) {
  return (
    <H as="span" className="inline-flex items-center gap-1.5">
      <H
        as="span"
        className={[
          "h-2.5 w-2.5 rounded-full shadow-neu-in-sm",
          tone === "moss" ? "bg-moss-soft" : "bg-ochre-soft",
        ].join(" ")}
        aria-hidden
      />
      {label}
    </H>
  );
}
