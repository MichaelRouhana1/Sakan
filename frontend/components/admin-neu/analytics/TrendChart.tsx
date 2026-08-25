import { useMemo, useState } from "react";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ADMIN_CHART } from "../theme";
import {
  clamp,
  formatCount,
  formatDayYear,
  xLabels,
  type DayPoint,
  type SeriesId,
} from "./types";

const W = 800;
const Hgt = 280;
const PAD = { l: 52, r: 18, t: 18, b: 36 };

const MOSS = ADMIN_CHART.moss;
const OCHRE = ADMIN_CHART.ochre;

type Props = {
  points: DayPoint[];
  series: SeriesId;
};

export function TrendChart({ points, series }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const showRenters = series !== "posters";
  const showPosters = series !== "renters";
  const idx = hover ?? Math.max(0, points.length - 1);

  const plot = useMemo(
    () => buildPlot(points, showRenters, showPosters),
    [points, showRenters, showPosters],
  );

  if (points.length === 0) {
    return (
      <NeuSurface as="section" className="px-5 py-8">
        <H as="p" className="text-center text-sm text-clay-700">
          Pick a custom range with at least one day.
        </H>
      </NeuSurface>
    );
  }

  const active = points[idx];
  const labels = xLabels(points);
  const hoverX = xAt(idx, points.length);
  const renterY = yAt(active.activeRenters, plot.min, plot.max);
  const posterY = yAt(active.activePosters, plot.min, plot.max);

  function indexFromClientX(event: {
    currentTarget: SVGSVGElement;
    clientX: number;
  }) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const t = (x - PAD.l) / (W - PAD.l - PAD.r);
    return clamp(Math.round(t * (points.length - 1)), 0, points.length - 1);
  }

  return (
    <NeuSurface as="section" className="px-4 py-4 md:px-5 md:py-5">
      <H className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Growth
          </H>
          <H as="h2" className="mt-1 font-display text-xl font-semibold text-clay-900">
            Renter vs poster activity
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-3 text-sm">
          <H as="span" className="text-xs text-clay-500">
            {hover == null ? "Latest" : "Hover"} · {formatDayYear(active.date)}
          </H>
          {showRenters ? (
            <LegendDot
              tone="moss"
              label={`${formatCount(active.activeRenters)} renters`}
            />
          ) : null}
          {showPosters ? (
            <LegendDot
              tone="ochre"
              label={`${formatCount(active.activePosters)} posters`}
            />
          ) : null}
        </H>
      </H>

      <H
        className="rounded-neu-md bg-clay-100 p-2 shadow-neu-in sm:p-3"
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${Hgt}`}
          role="img"
          aria-label={plot.summary}
          className="h-[220px] w-full cursor-crosshair sm:h-[280px]"
          onMouseMove={(event) => setHover(indexFromClientX(event))}
          onClick={(event) => setHover(indexFromClientX(event))}
        >
          <defs>
            <linearGradient id="skoun-renter-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MOSS} stopOpacity="0.28" />
              <stop offset="100%" stopColor={MOSS} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="skoun-poster-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={OCHRE} stopOpacity="0.26" />
              <stop offset="100%" stopColor={OCHRE} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {plot.grid.map((g) => (
            <g key={g.y}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={g.y}
                y2={g.y}
                stroke={ADMIN_CHART.grid}
                strokeWidth={1}
              />
              <text
                x={PAD.l - 10}
                y={g.y + 4}
                textAnchor="end"
                fill={ADMIN_CHART.axis}
                fontSize="11"
                fontFamily="Figtree, sans-serif"
              >
                {g.label}
              </text>
            </g>
          ))}

          {showRenters ? (
            <path d={plot.renterArea} fill="url(#skoun-renter-fill)" />
          ) : null}
          {showPosters ? (
            <path d={plot.posterArea} fill="url(#skoun-poster-fill)" />
          ) : null}
          {showRenters ? (
            <path
              d={plot.renterLine}
              fill="none"
              stroke={MOSS}
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {showPosters ? (
            <path
              d={plot.posterLine}
              fill="none"
              stroke={OCHRE}
              strokeWidth={2.2}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {hover != null ? (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD.t}
              y2={Hgt - PAD.b}
              stroke={ADMIN_CHART.guide}
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.55}
            />
          ) : null}

          {showRenters ? (
            <circle
              cx={hoverX}
              cy={renterY}
              r={hover == null ? 3.2 : 4.5}
              fill={MOSS}
              stroke={ADMIN_CHART.markerStroke}
              strokeWidth={2}
            />
          ) : null}
          {showPosters ? (
            <rect
              x={hoverX - 3.5}
              y={posterY - 3.5}
              width={7}
              height={7}
              rx={1.2}
              fill={OCHRE}
              stroke={ADMIN_CHART.markerStroke}
              strokeWidth={2}
            />
          ) : null}

          {labels.map((lab) => (
            <text
              key={`${lab.i}-${lab.label}`}
              x={xAt(lab.i, points.length)}
              y={Hgt - 12}
              textAnchor="middle"
              fill={ADMIN_CHART.axis}
              fontSize="11"
              fontFamily="Figtree, sans-serif"
            >
              {lab.label}
            </text>
          ))}
        </svg>
      </H>
    </NeuSurface>
  );
}

function LegendDot({
  tone,
  label,
}: {
  tone: "moss" | "ochre";
  label: string;
}) {
  return (
    <H as="span" className="inline-flex items-center gap-1.5 text-clay-900">
      <H
        as="span"
        className={[
          "h-2.5 w-2.5 shadow-neu-in-sm",
          tone === "moss" ? "rounded-full bg-moss" : "rounded-[2px] bg-ochre",
        ].join(" ")}
        aria-hidden
      />
      <H as="span" className="tabular-nums">
        {label}
      </H>
    </H>
  );
}

function xAt(i: number, n: number): number {
  if (n <= 1) return PAD.l;
  return PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
}

function yAt(v: number, min: number, max: number): number {
  const span = Math.max(1, max - min);
  const top = PAD.t;
  const bot = Hgt - PAD.b;
  return bot - ((v - min) / span) * (bot - top);
}

function linePath(values: number[], min: number, max: number): string {
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xAt(i, values.length)},${yAt(v, min, max)}`,
    )
    .join(" ");
}

function areaPath(values: number[], min: number, max: number): string {
  if (values.length === 0) return "";
  const line = linePath(values, min, max);
  const lastX = xAt(values.length - 1, values.length);
  const firstX = xAt(0, values.length);
  const base = Hgt - PAD.b;
  return `${line} L${lastX},${base} L${firstX},${base} Z`;
}

function niceMax(n: number): number {
  if (n <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(n));
  const norm = n / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function buildPlot(
  points: DayPoint[],
  showRenters: boolean,
  showPosters: boolean,
) {
  const renterVals = points.map((p) => p.activeRenters);
  const posterVals = points.map((p) => p.activePosters);
  const shown = [
    ...(showRenters ? renterVals : []),
    ...(showPosters ? posterVals : []),
  ];
  const rawMax = shown.length ? Math.max(...shown) : 1;
  const max = niceMax(rawMax * 1.08);
  const min = 0;
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = Math.round((max / ticks) * (ticks - i));
    return {
      y: yAt(value, min, max),
      label: formatCount(value),
    };
  });
  const last = points.length - 1;
  const summary = points.length
    ? `Renters ${formatCount(points[0].activeRenters)} to ${formatCount(points[last].activeRenters)}. Posters ${formatCount(points[0].activePosters)} to ${formatCount(points[last].activePosters)}.`
    : "No trend data.";

  return {
    min,
    max,
    grid,
    summary,
    renterLine: linePath(renterVals, min, max),
    posterLine: linePath(posterVals, min, max),
    renterArea: areaPath(renterVals, min, max),
    posterArea: areaPath(posterVals, min, max),
  };
}
