import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ADMIN_CHART } from "../theme";
import { formatCount, formatPct, type DayPoint } from "./types";

export type KpiItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  delta: number;
  spark: number[];
  /** When true, a rising value is bad (ember). */
  invertDelta?: boolean;
};

export function buildKpis(
  current: DayPoint[],
  prior: DayPoint[],
  weekSignups: number,
  priorWeekSignups: number,
): KpiItem[] {
  const last = current[current.length - 1];
  const prev = prior[prior.length - 1];
  const renters = last?.activeRenters ?? 0;
  const posters = last?.activePosters ?? 0;
  const rate = last && last.mau > 0 ? (last.dau / last.mau) * 100 : 0;
  const priorRate =
    prev && prev.mau > 0 ? (prev.dau / prev.mau) * 100 : rate;

  return [
    {
      id: "renters",
      label: "Active renters",
      value: formatCount(renters),
      hint: "30-day active at range end",
      delta: prev ? ((renters - prev.activeRenters) / Math.max(1, prev.activeRenters)) * 100 : 0,
      spark: current.map((row) => row.activeRenters),
    },
    {
      id: "posters",
      label: "Active posters",
      value: formatCount(posters),
      hint: "Hosts with live or recent listings",
      delta: prev ? ((posters - prev.activePosters) / Math.max(1, prev.activePosters)) * 100 : 0,
      spark: current.map((row) => row.activePosters),
    },
    {
      id: "signups",
      label: "New signups this week",
      value: formatCount(weekSignups),
      hint: "Last 7 days from today",
      delta:
        priorWeekSignups === 0
          ? 0
          : ((weekSignups - priorWeekSignups) / priorWeekSignups) * 100,
      spark: current.map((row) => row.signups).slice(-14),
    },
    {
      id: "rate",
      label: "Active rate",
      value: `${rate.toFixed(1)}%`,
      hint: "DAU / MAU stickiness",
      delta: rate - priorRate,
      spark: current.map((row) => (row.mau > 0 ? (row.dau / row.mau) * 100 : 0)),
    },
  ];
}

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Kpi key={item.id} item={item} />
      ))}
    </H>
  );
}

function Kpi({ item }: { item: KpiItem }) {
  const up = item.invertDelta ? item.delta <= 0 : item.delta >= 0;
  return (
    <NeuSurface inset className="px-4 py-4">
      <H className="flex items-start justify-between gap-3">
        <H>
          <H as="p" className="text-xs font-medium text-clay-700">
            {item.label}
          </H>
          <H
            as="p"
            className="mt-1 font-display text-2xl font-semibold tabular-nums text-clay-900"
          >
            {item.value}
          </H>
        </H>
        <Sparkline values={item.spark} up={up} />
      </H>
      <H className="mt-2 flex flex-wrap items-center gap-2">
        <H
          as="span"
          className={[
            "inline-flex rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-neu-in-sm",
            up ? "text-moss" : "text-ember",
          ].join(" ")}
        >
          {formatPct(item.delta)}
        </H>
        <H as="span" className="text-[11px] text-clay-500">
          {item.hint}
        </H>
      </H>
    </NeuSurface>
  );
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return null;
  const w = 88;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return `${x},${y}`;
  });
  const color = up ? ADMIN_CHART.moss : ADMIN_CHART.ember;
  const fill = up ? ADMIN_CHART.mossFill : ADMIN_CHART.emberFill;
  const last = coords[coords.length - 1];
  const [lx, ly] = last.split(",");
  const area = `M0,${h} L${coords.join(" L")} L${w},${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className="shrink-0"
    >
      <path d={area} fill={fill} />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={Number(lx)} cy={Number(ly)} r={2.2} fill={color} />
    </svg>
  );
}
