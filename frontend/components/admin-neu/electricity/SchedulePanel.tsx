import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react-native";
import { H } from "../h";
import { NeuButton, NeuIconButton, NeuSurface } from "../NeuPrimitives";
import { PowerDayStrip } from "./PowerDayStrip";
import { StabilityPill } from "./StabilityPill";
import {
  AMPERE_OPTIONS,
  blackoutHours,
  cutHours,
  edlHours,
  formatStamp,
  formatWindow,
  generatorHours,
  stabilityOf,
  type GridWindow,
  type GridZone,
} from "./types";
import { MAX_CUT_WINDOWS } from "@/lib/electricityCuts";

type Props = {
  zone: GridZone | null;
  showBack?: boolean;
  onBack?: () => void;
  onAddWindow: () => void;
  onEditWindow: (window: GridWindow) => void;
  onRemoveWindow: (window: GridWindow) => void;
  onClear: () => void;
  onGenerator: (on: boolean) => void;
  onAmperes: (value: number | null) => void;
  onNote: (note: string) => void;
};

export function SchedulePanel({
  zone,
  showBack,
  onBack,
  onAddWindow,
  onEditWindow,
  onRemoveWindow,
  onClear,
  onGenerator,
  onAmperes,
  onNote,
}: Props) {
  if (!zone) {
    return (
      <NeuSurface inset className="flex min-h-[320px] items-center justify-center px-6 py-16 text-center">
        <H>
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Pick a zone
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            Daily EDL cuts and generator fill show here. Log a window when the
            feeder changes.
          </H>
        </H>
      </NeuSurface>
    );
  }

  const status = stabilityOf(zone);
  const atCap = zone.cutWindows.length >= MAX_CUT_WINDOWS;

  return (
    <NeuSurface className="p-5 sm:p-6" as="section">
      <H className="flex items-start gap-3">
        {showBack ? (
          <NeuIconButton ariaLabel="Back to zones" onClick={onBack}>
            <ArrowLeft size={18} strokeWidth={1.75} />
          </NeuIconButton>
        ) : null}
        <H className="min-w-0 flex-1">
          <H className="flex flex-wrap items-center gap-2">
            <H as="h2" className="font-display text-xl font-semibold text-clay-900">
              {zone.name}
            </H>
            <StabilityPill status={status} />
          </H>
          <H as="p" className="mt-1 text-sm text-clay-700">
            {zone.district} · {zone.governorate} · {zone.listingCount} listings
          </H>
        </H>
      </H>

      <H className="mt-5">
        <PowerDayStrip zone={zone} showLegend tall />
      </H>

      <H className="mt-4 grid grid-cols-3 gap-2">
        <HoursKpi label="State power" value={`${edlHours(zone)}h`} hint="EDL on" />
        <HoursKpi
          label="Generator"
          value={`${generatorHours(zone)}h`}
          hint={zone.generatorDuringCuts ? "Fills cuts" : "Off during cuts"}
        />
        <HoursKpi
          label="Dark"
          value={`${blackoutHours(zone)}h`}
          hint={`${cutHours(zone)}h EDL off`}
        />
      </H>

      <H className="mt-5">
        <H className="mb-3 flex items-center justify-between gap-2">
          <H as="h3" className="text-sm font-semibold text-clay-900">
            Cut windows
          </H>
          <NeuButton tone="moss" disabled={atCap} onClick={onAddWindow}>
            <Plus size={16} strokeWidth={1.75} />
            Add window
          </NeuButton>
        </H>

        {zone.cutWindows.length === 0 ? (
          <H className="rounded-neu-md bg-clay-100 px-4 py-6 text-center shadow-neu-in-sm">
            <H as="p" className="text-sm font-medium text-clay-900">
              24h state power
            </H>
            <H as="p" className="mt-1 text-xs text-clay-700">
              No EDL cuts logged for this feeder today.
            </H>
          </H>
        ) : (
          <H className="space-y-2">
            {zone.cutWindows.map((window, i) => (
              <H
                key={window.id}
                className="flex items-center gap-3 rounded-neu-md bg-clay-100 px-3 py-3 shadow-neu-in-sm"
              >
                <H className="min-w-0 flex-1">
                  <H as="p" className="text-[11px] font-medium uppercase tracking-wide text-clay-500">
                    Period {i + 1}
                  </H>
                  <H as="p" className="mt-0.5 text-sm font-semibold tabular-nums text-clay-900">
                    {formatWindow(window)}
                  </H>
                </H>
                <NeuIconButton
                  ariaLabel={`Edit period ${i + 1}`}
                  onClick={() => onEditWindow(window)}
                >
                  <Pencil size={16} strokeWidth={1.75} />
                </NeuIconButton>
                <NeuIconButton
                  ariaLabel={`Remove period ${i + 1}`}
                  onClick={() => onRemoveWindow(window)}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </NeuIconButton>
              </H>
            ))}
          </H>
        )}

        {zone.cutWindows.length > 0 ? (
          <H className="mt-3">
            <NeuButton onClick={onClear}>Mark 24h EDL</NeuButton>
          </H>
        ) : null}
        {atCap ? (
          <H as="p" className="mt-2 text-[11px] text-clay-500">
            Cap is {MAX_CUT_WINDOWS} windows per area.
          </H>
        ) : null}
      </H>

      <H className="mt-5 space-y-4">
        <Toggle
          label="Generator during cuts"
          hint="Ishtirak fills the EDL gap. Off means those hours go dark."
          active={zone.generatorDuringCuts}
          onChange={onGenerator}
        />

        <H as="label" className="block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Ampères
          </H>
          <H
            as="select"
            value={zone.generatorAmperes != null ? String(zone.generatorAmperes) : ""}
            onChange={(event: { target: { value: string } }) =>
              onAmperes(event.target.value ? Number(event.target.value) : null)
            }
            className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            <H as="option" value="">
              Unknown
            </H>
            {AMPERE_OPTIONS.map((amp) => (
              <H as="option" key={amp} value={String(amp)}>
                {amp}A
              </H>
            ))}
          </H>
        </H>

        <H as="label" className="block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Ops note
          </H>
          <H
            as="textarea"
            value={zone.note}
            rows={3}
            onChange={(event: { target: { value: string } }) =>
              onNote(event.target.value)
            }
            placeholder="Feeder, building coverage, anything staff should know"
            className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          />
        </H>
      </H>

      <H as="p" className="mt-4 text-[11px] text-clay-500">
        Last log {formatStamp(zone.updatedAt)}. Demo only until API wiring.
      </H>
    </NeuSurface>
  );
}

function HoursKpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-3 py-3 shadow-neu-in-sm">
      <H as="p" className="text-[11px] font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-xl font-semibold tabular-nums text-clay-900">
        {value}
      </H>
      <H as="p" className="mt-1 text-[11px] text-clay-500">
        {hint}
      </H>
    </H>
  );
}

function Toggle({
  label,
  hint,
  active,
  onChange,
}: {
  label: string;
  hint: string;
  active: boolean;
  onChange: (active: boolean) => void;
}) {
  return (
    <H>
      <H as="p" className="mb-1 text-sm font-medium text-clay-900">
        {label}
      </H>
      <H as="p" className="mb-2 text-xs leading-relaxed text-clay-700">
        {hint}
      </H>
      <H
        className="inline-flex rounded-full bg-clay-100 p-1.5 shadow-neu-in"
        role="group"
        aria-label={label}
      >
        <H
          as="button"
          type="button"
          onClick={() => onChange(true)}
          className={[
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-shadow duration-press",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
            active
              ? "bg-clay-100 text-moss shadow-neu-sm"
              : "bg-transparent text-clay-700",
          ].join(" ")}
        >
          Covers cuts
        </H>
        <H
          as="button"
          type="button"
          onClick={() => onChange(false)}
          className={[
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-shadow duration-press",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
            !active
              ? "bg-clay-100 text-clay-900 shadow-neu-sm"
              : "bg-transparent text-clay-700",
          ].join(" ")}
        >
          Goes dark
        </H>
      </H>
    </H>
  );
}
