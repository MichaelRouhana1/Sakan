import { useMemo, useState } from "react";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ADMIN_CHART } from "../theme";
import {
  formatCount,
  isSpike,
  scrapeShare,
  type TrafficPoint,
} from "./types";

const W = 800;
const Hgt = 260;
const PAD = { l: 48, r: 16, t: 16, b: 34 };

type ChartRange = "24h" | "7d" | "30d";

type Props = {
  points: TrafficPoint[];
  range: ChartRange;
  onRange: (range: ChartRange) => void;
};

const CHART_RANGES: { id: ChartRange; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
];

export function EndpointChart({ points, range, onRange }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? Math.max(0, points.length - 1);
  const plot = useMemo(() => buildPlot(points), [points]);

  if (points.length === 0) {
    return (
      <NeuSurface as="section" className="px-5 py-8">
        <H as="p" className="text-center text-sm text-clay-700">
          No traffic samples for this window.
        </H>
      </NeuSurface>
    );
  }

  const active = points[idx];
  const hoverX = xAt(idx, points.length);
  const reqY = yAt(active.requests, 0, plot.max);
  const scrapeY = yAt(active.scrapes, 0, plot.max);
  const spike = isSpike(active);
  const share = scrapeShare(active);

  function indexFromClientX(event: {
    currentTarget: SVGSVGElement;
    clientX: number;
  }) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const t = (x - PAD.l) / (W - PAD.l - PAD.r);
    const n = points.length;
    return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
  }

  return (
    <NeuSurface as="section" className="flex h-full flex-col px-4 py-4 md:px-5 md:py-5">
      <H className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Endpoint monitoring
          </H>
          <H as="h2" className="mt-1 font-display text-xl font-semibold text-clay-900">
            API traffic & scrape pressure
          </H>
          <H as="p" className="mt-1 max-w-lg text-sm text-clay-700">
            Listing-read volume vs scrape-like clients. Spikes flag harvest risk.
          </H>
        </H>
        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
          role="tablist"
          aria-label="Traffic range"
        >
          {CHART_RANGES.map((tab) => {
            const selected = range === tab.id;
            return (
              <H
                key={tab.id}
                as="button"
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onRange(tab.id)}
                className={[
                  "flex shrink-0 cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                  selected
                    ? "bg-clay-100 text-clay-900 shadow-press"
                    : "bg-transparent text-clay-700",
                ].join(" ")}
              >
                {tab.label}
              </H>
            );
          })}
        </H>
      </H>

      <H className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <H as="span" className="text-xs text-clay-500">
          {hover == null ? "Latest" : "Hover"} · {active.label}
        </H>
        <LegendDot tone="moss" label={`${formatCount(active.requests)} req`} />
        <LegendDot
          tone="ember"
          label={`${formatCount(active.scrapes)} scrape`}
        />
        <H
          as="span"
          className={[
            "inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums shadow-neu-in-sm",
            spike ? "text-ember" : "text-clay-700",
          ].join(" ")}
        >
          {share.toFixed(0)}% scrape share
          {spike ? " · spike" : ""}
        </H>
      </H>

      <H
        as="p"
        className="mb-2 truncate font-mono text-[11px] text-clay-500"
      >
        Hot path · {active.endpoint}
      </H>

      <H
        className="rounded-neu-md bg-clay-100 p-2 shadow-neu-in sm:p-3"
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${Hgt}`}
          role="img"
          aria-label={plot.summary}
          className="h-[200px] w-full cursor-crosshair sm:h-[240px]"
          onMouseMove={(event) => setHover(indexFromClientX(event))}
          onClick={(event) => setHover(indexFromClientX(event))}
        >
          <defs>
            <linearGradient id="skoun-sec-api-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ADMIN_CHART.moss} stopOpacity="0.26" />
              <stop offset="100%" stopColor={ADMIN_CHART.moss} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient
              id="skoun-sec-scrape-fill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={ADMIN_CHART.ember} stopOpacity="0.3" />
              <stop offset="100%" stopColor={ADMIN_CHART.ember} stopOpacity="0.02" />
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
                x={PAD.l - 8}
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

          {plot.spikeBands.map((band) => (
            <rect
              key={band.i}
              x={band.x - band.half}
              y={PAD.t}
              width={band.half * 2}
              height={Hgt - PAD.t - PAD.b}
              fill={ADMIN_CHART.ember}
              opacity={0.06}
            />
          ))}

          <path d={plot.reqArea} fill="url(#skoun-sec-api-fill)" />
          <path d={plot.scrapeArea} fill="url(#skoun-sec-scrape-fill)" />
          <path
            d={plot.reqLine}
            fill="none"
            stroke={ADMIN_CHART.moss}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={plot.scrapeLine}
            fill="none"
            stroke={ADMIN_CHART.ember}
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

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

          <circle
            cx={hoverX}
            cy={reqY}
            r={hover == null ? 3.2 : 4.5}
            fill={ADMIN_CHART.moss}
            stroke={ADMIN_CHART.markerStroke}
            strokeWidth={2}
          />
          <rect
            x={hoverX - 3.5}
            y={scrapeY - 3.5}
            width={7}
            height={7}
            rx={1.2}
            fill={ADMIN_CHART.ember}
            stroke={ADMIN_CHART.markerStroke}
            strokeWidth={2}
          />

          {plot.labels.map((lab) => (
            <text
              key={`${lab.i}-${lab.label}`}
              x={xAt(lab.i, points.length)}
              y={Hgt - 10}
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
  tone: "moss" | "ember";
  label: string;
}) {
  return (
    <H as="span" className="inline-flex items-center gap-1.5 text-clay-900">
      <H
        as="span"
        className={[
          "h-2.5 w-2.5 shadow-neu-in-sm",
          tone === "moss" ? "rounded-full bg-moss" : "rounded-[2px] bg-ember",
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

function linePath(values: number[], max: number): string {
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xAt(i, values.length)},${yAt(v, 0, max)}`,
    )
    .join(" ");
}

function areaPath(values: number[], max: number): string {
  if (values.length === 0) return "";
  const line = linePath(values, max);
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

function buildPlot(points: TrafficPoint[]) {
  const reqs = points.map((p) => p.requests);
  const scrapes = points.map((p) => p.scrapes);
  const rawMax = Math.max(...reqs, ...scrapes, 1);
  const max = niceMax(rawMax * 1.1);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = Math.round((max / ticks) * (ticks - i));
    return { y: yAt(value, 0, max), label: formatCount(value) };
  });

  const step = Math.max(1, Math.ceil(points.length / 6));
  const labels = points
    .map((p, i) => ({ i, label: p.label }))
    .filter((_, i) => i % step === 0 || i === points.length - 1);

  const half =
    points.length <= 1
      ? 12
      : ((W - PAD.l - PAD.r) / (points.length - 1)) * 0.45;

  const spikeBands = points
    .map((p, i) => (isSpike(p) ? { i, x: xAt(i, points.length), half } : null))
    .filter((row): row is { i: number; x: number; half: number } => row != null);

  const last = points[points.length - 1];
  const summary = `API requests peaking near ${formatCount(Math.max(...reqs))}. Scrape-like traffic latest ${formatCount(last.scrapes)}.`;

  return {
    max,
    grid,
    labels,
    summary,
    spikeBands,
    reqLine: linePath(reqs, max),
    scrapeLine: linePath(scrapes, max),
    reqArea: areaPath(reqs, max),
    scrapeArea: areaPath(scrapes, max),
  };
}
