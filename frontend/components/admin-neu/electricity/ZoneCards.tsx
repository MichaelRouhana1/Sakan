import { H } from "../h";
import { PowerDayStrip } from "./PowerDayStrip";
import { StabilityPill } from "./StabilityPill";
import {
  blackoutHours,
  edlHours,
  formatStamp,
  generatorHours,
  stabilityOf,
  type GridZone,
} from "./types";

type Props = {
  zones: GridZone[];
  selectedId: string | null;
  onSelect: (zone: GridZone) => void;
};

export function ZoneCards({ zones, selectedId, onSelect }: Props) {
  if (zones.length === 0) {
    return (
      <H className="rounded-neu bg-clay-100 px-6 py-16 text-center shadow-neu-in">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No zones match
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Try another area name, or clear the stability filter.
        </H>
      </H>
    );
  }

  return (
    <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {zones.map((zone) => {
        const selected = zone.id === selectedId;
        const status = stabilityOf(zone);
        return (
          <H
            as="button"
            type="button"
            key={zone.id}
            onClick={() => onSelect(zone)}
            aria-pressed={selected}
            className={[
              "cursor-pointer rounded-neu bg-clay-100 p-4 text-left transition-shadow duration-press",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
              selected ? "shadow-press" : "shadow-neu-sm hover:shadow-neu",
            ].join(" ")}
          >
            <H className="flex items-start justify-between gap-3">
              <H>
                <H as="p" className="font-display text-lg font-semibold text-clay-900">
                  {zone.name}
                </H>
                <H as="p" className="mt-0.5 text-xs text-clay-700">
                  {zone.district} · {zone.governorate}
                </H>
              </H>
              <StabilityPill status={status} />
            </H>

            <H className="mt-3">
              <PowerDayStrip zone={zone} />
            </H>

            <H className="mt-3 grid grid-cols-3 gap-2">
              <MixStat label="EDL" value={`${edlHours(zone)}h`} />
              <MixStat label="Gen" value={`${generatorHours(zone)}h`} />
              <MixStat label="Dark" value={`${blackoutHours(zone)}h`} />
            </H>

            <H className="mt-3 flex items-center justify-between text-[11px] text-clay-500">
              <H as="span">{zone.listingCount} listings</H>
              <H as="span">Updated {formatStamp(zone.updatedAt)}</H>
            </H>
          </H>
        );
      })}
    </H>
  );
}

function MixStat({ label, value }: { label: string; value: string }) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-2 py-2 text-center shadow-neu-in-sm">
      <H as="p" className="text-[10px] font-medium uppercase tracking-wide text-clay-500">
        {label}
      </H>
      <H as="p" className="mt-0.5 font-display text-sm font-semibold tabular-nums text-clay-900">
        {value}
      </H>
    </H>
  );
}
