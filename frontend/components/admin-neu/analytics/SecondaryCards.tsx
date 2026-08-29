import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import {
  WEEKDAYS,
  bucketPoints,
  formatCount,
  meanBy,
  weekdayAverages,
  type DayPoint,
  type SeriesId,
} from "./types";

type Props = {
  points: DayPoint[];
  retention: { w1: number; w4: number; w8: number };
  series?: SeriesId;
};

export function SecondaryCards({ points, retention, series = "both" }: Props) {
  const last = points[points.length - 1];
  const showRenters = series !== "posters";
  const showPosters = series !== "renters";
  const dauKey =
    series === "renters"
      ? "dauRenters"
      : series === "posters"
        ? "dauPosters"
        : "dau";
  const avgDau = meanBy(points, dauKey);
  const avgMau = meanBy(points, "mau");
  const stickiness = avgMau > 0 ? (avgDau / avgMau) * 100 : 0;
  const splitRenters = showRenters ? (last?.dauRenters ?? 0) : 0;
  const splitPosters = showPosters ? (last?.dauPosters ?? 0) : 0;
  const splitTotal = Math.max(1, splitRenters + splitPosters);
  const bars = bucketPoints(points, 18);
  const week = weekdayAverages(points, dauKey);
  const weekMax = Math.max(1, ...week);
  const stackMax = Math.max(
    1,
    ...bars.map((row) => {
      const r = showRenters ? row.dauRenters : 0;
      const p = showPosters ? row.dauPosters : 0;
      return r + p;
    }),
  );

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
              style={{ width: `${Math.min(100, stickiness)}%` }}
            />
          </H>
        </H>
        <H className="mt-4 flex gap-2">
          {showRenters ? (
            <RoleShare
              label="Renter DAU"
              value={splitRenters}
              pct={(splitRenters / splitTotal) * 100}
              tone="moss"
            />
          ) : null}
          {showPosters ? (
            <RoleShare
              label="Poster DAU"
              value={splitPosters}
              pct={(splitPosters / splitTotal) * 100}
              tone="ochre"
            />
          ) : null}
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
            const totalPx = 112;
            const rVal = showRenters ? row.dauRenters : 0;
            const pVal = showPosters ? row.dauPosters : 0;
            const rH = rVal > 0 ? Math.max(2, (rVal / stackMax) * totalPx) : 0;
            const pH = pVal > 0 ? Math.max(2, (pVal / stackMax) * totalPx) : 0;
            return (
              <H
                key={row.date}
                className="flex h-full min-w-0 flex-1 flex-col justify-end gap-0.5"
                title={`${row.date}: ${formatCount(rVal + pVal)} DAU`}
              >
                {showPosters ? (
                  <H
                    className="w-full rounded-t-[3px] bg-ochre-soft"
                    style={{ height: pH }}
                  />
                ) : null}
                {showRenters ? (
                  <H
                    className="w-full rounded-t-[3px] bg-moss-soft"
                    style={{ height: rH }}
                  />
                ) : null}
              </H>
            );
          })}
        </H>
        <H className="mt-3 flex flex-wrap gap-3 text-[11px] text-clay-700">
          {showRenters ? <Swatch tone="moss" label="Renter DAU" /> : null}
          {showPosters ? <Swatch tone="ochre" label="Poster DAU" /> : null}
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
