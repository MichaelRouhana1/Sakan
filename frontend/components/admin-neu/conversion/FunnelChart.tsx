import { useState } from "react";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ADMIN_CHART } from "../theme";
import { formatCount } from "../analytics/types";
import { worstDropIndex, type FunnelStage } from "./types";

type Props = {
  stages: FunnelStage[];
};

export function FunnelChart({ stages }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const worst = worstDropIndex(stages);
  const active = stages[hover ?? worst] ?? stages[0];
  const started = stages[0]?.count ?? 0;
  const published = stages[stages.length - 1]?.count ?? 0;
  const rate = started > 0 ? (published / started) * 100 : 0;

  if (stages.length === 0 || started === 0) {
    return (
      <NeuSurface as="section" className="px-5 py-8">
        <H as="p" className="text-center text-sm text-clay-700">
          Pick a custom range with at least one day.
        </H>
      </NeuSurface>
    );
  }

  return (
    <NeuSurface as="section" className="px-4 py-4 md:px-5 md:py-5">
      <H className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Pipeline
          </H>
          <H as="h2" className="mt-1 font-display text-xl font-semibold text-clay-900">
            Listing wizard drop-off
          </H>
          <H as="p" className="mt-1 max-w-xl text-sm text-clay-700">
            {hover == null
              ? `Biggest leak at ${stages[worst].label} — ${stages[worst].dropPct.toFixed(0)}% leave before the next step.`
              : `${active.label}: ${formatCount(active.count)} reached · ${active.pctOfStart.toFixed(0)}% of drafts started.`}
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-semibold tabular-nums text-moss shadow-neu-in-sm"
          >
            {rate.toFixed(1)}% publish
          </H>
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-ember shadow-neu-in-sm"
          >
            Leak · {stages[worst].label}
          </H>
        </H>
      </H>

      <H className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-stretch">
        <ClayMold stages={stages} active={hover ?? worst} />
        <H className="flex flex-col gap-1.5" aria-label="Wizard funnel by step">
          {stages.map((stage, i) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={i}
              selected={hover === i || (hover == null && i === worst)}
              leak={i === worst}
              onEnter={() => setHover(i)}
              onLeave={() => setHover(null)}
            />
          ))}
        </H>
      </H>
    </NeuSurface>
  );
}

function StageRow({
  stage,
  index,
  selected,
  leak,
  onEnter,
  onLeave,
}: {
  stage: FunnelStage;
  index: number;
  selected: boolean;
  leak: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const width = Math.max(10, stage.pctOfStart);
  const fill = leak ? "bg-ember-soft" : index === 9 ? "bg-moss-soft" : "bg-moss-soft";

  return (
    <H
      as="button"
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className={[
        "flex w-full cursor-pointer flex-col gap-1.5 rounded-neu-md px-3 py-2.5 text-left transition-shadow duration-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected ? "bg-clay-100 shadow-press" : "bg-transparent",
      ].join(" ")}
    >
      <H className="flex items-baseline justify-between gap-3">
        <H className="min-w-0">
          <H as="span" className="mr-2 font-display text-[11px] tabular-nums text-clay-500">
            {String(index + 1).padStart(2, "0")}
          </H>
          <H as="span" className="font-display text-sm font-semibold text-clay-900">
            {stage.label}
          </H>
          {index > 0 ? (
            <H
              as="span"
              className={[
                "ml-2 text-[11px] font-medium tabular-nums",
                leak ? "text-ember" : "text-clay-500",
              ].join(" ")}
            >
              −{formatCount(stage.dropCount)} ({stage.dropPct.toFixed(0)}%)
            </H>
          ) : (
            <H as="span" className="ml-2 text-[11px] text-clay-500">
              drafts started
            </H>
          )}
        </H>
        <H className="shrink-0 text-right">
          <H as="span" className="font-display text-sm font-semibold tabular-nums text-clay-900">
            {formatCount(stage.count)}
          </H>
          <H as="span" className="ml-2 text-[11px] tabular-nums text-clay-500">
            {stage.pctOfStart.toFixed(0)}%
          </H>
        </H>
      </H>
      <H
        className="h-3 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm"
        aria-hidden
      >
        <H
          className={["h-full rounded-full shadow-neu-sm", fill].join(" ")}
          style={{ width: `${width}%` }}
        />
      </H>
    </H>
  );
}

function ClayMold({
  stages,
  active,
}: {
  stages: FunnelStage[];
  active: number;
}) {
  const W = 160;
  const Hgt = 360;
  const padX = 10;
  const padY = 8;
  const gap = 3;
  const stageH = (Hgt - padY * 2 - gap * (stages.length - 1)) / stages.length;
  const maxW = W - padX * 2;
  const minW = 36;
  const cx = W / 2;
  const top = stages[0]?.count || 1;

  const traps = stages.map((stage, i) => {
    const next = stages[i + 1] ?? stage;
    const topW = minW + ((maxW - minW) * stage.count) / top;
    const botW = minW + ((maxW - minW) * next.count) / top;
    const y = padY + i * (stageH + gap);
    const topL = cx - topW / 2;
    const topR = cx + topW / 2;
    const botL = cx - botW / 2;
    const botR = cx + botW / 2;
    const d = `M${topL},${y} L${topR},${y} L${botR},${y + stageH} L${botL},${y + stageH} Z`;
    return { d, y, stageH, i };
  });

  return (
    <H className="hidden items-center justify-center lg:flex">
      <H className="rounded-neu bg-clay-100 px-3 py-3 shadow-neu-in">
        <svg
          width={W}
          height={Hgt}
          viewBox={`0 0 ${W} ${Hgt}`}
          aria-hidden
        >
          {traps.map((trap) => {
            const selected = trap.i === active;
            const fill = selected
              ? ADMIN_CHART.mossFill
              : trap.i === stages.length - 1
                ? ADMIN_CHART.mossFill
                : `color-mix(in srgb, ${ADMIN_CHART.moss} ${Math.max(18, 52 - trap.i * 3)}%, transparent)`;
            const stroke = selected ? ADMIN_CHART.moss : ADMIN_CHART.grid;
            return (
              <path
                key={trap.i}
                d={trap.d}
                fill={fill}
                stroke={stroke}
                strokeWidth={selected ? 1.6 : 1}
              />
            );
          })}
        </svg>
      </H>
    </H>
  );
}
