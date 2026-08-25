import { H } from "../h";
import { buildSegments, type GridZone, type SegmentKind } from "./types";

const FILL: Record<SegmentKind, string> = {
  edl: "bg-moss-soft",
  generator: "bg-ochre-soft",
  blackout: "bg-ember-soft",
};

const TICKS = ["00", "06", "12", "18", "24"];

type Props = {
  zone: GridZone;
  showLegend?: boolean;
  tall?: boolean;
};

export function PowerDayStrip({ zone, showLegend, tall }: Props) {
  const segs = buildSegments(zone.cutWindows, zone.generatorDuringCuts);

  return (
    <H>
      <H
        className={[
          "flex overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm",
          tall ? "h-4" : "h-3",
        ].join(" ")}
        role="img"
        aria-label="Twenty-four hour power mix"
      >
        {segs.map((seg, i) => (
          <H
            key={`${seg.kind}-${i}`}
            className={`h-full min-w-0 ${FILL[seg.kind]}`}
            style={{ flexGrow: seg.minutes, flexBasis: 0 }}
          />
        ))}
      </H>
      <H className="mt-1.5 flex justify-between px-0.5 text-[10px] tabular-nums text-clay-500">
        {TICKS.map((tick) => (
          <H as="span" key={tick}>
            {tick}
          </H>
        ))}
      </H>
      {showLegend ? (
        <H className="mt-2 flex flex-wrap gap-3 text-[11px] text-clay-700">
          <LegendSwatch tone="edl" label="State (EDL)" />
          <LegendSwatch tone="generator" label="Generator" />
          <LegendSwatch tone="blackout" label="Dark" />
        </H>
      ) : null}
    </H>
  );
}

function LegendSwatch({ tone, label }: { tone: SegmentKind; label: string }) {
  return (
    <H as="span" className="inline-flex items-center gap-1.5">
      <H
        as="span"
        className={`h-2.5 w-2.5 rounded-full shadow-neu-in-sm ${FILL[tone]}`}
        aria-hidden
      />
      {label}
    </H>
  );
}
