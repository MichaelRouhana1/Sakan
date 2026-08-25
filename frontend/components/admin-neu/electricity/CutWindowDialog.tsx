import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  TIME_STEPS,
  formatTime,
  windowDurationHours,
  type GridZone,
  type WindowDraft,
} from "./types";
import { MAX_CUT_WINDOWS } from "@/lib/electricityCuts";

type Props = {
  mode: "create" | "edit" | null;
  pickZone: boolean;
  zones: GridZone[];
  draft: WindowDraft;
  onDraft: (draft: WindowDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CutWindowDialog({
  mode,
  pickZone,
  zones,
  draft,
  onDraft,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode) return null;

  const zone = zones.find((row) => row.id === draft.zoneId) ?? null;
  const hours = windowDurationHours(draft.start, draft.end);
  const overnight =
    draft.start && draft.end && draft.start > draft.end;
  const atCap =
    mode === "create" && zone != null && zone.cutWindows.length >= MAX_CUT_WINDOWS;
  const canSubmit =
    draft.zoneId.length > 0 &&
    draft.start.length > 0 &&
    draft.end.length > 0 &&
    draft.start !== draft.end &&
    !atCap;

  return (
    <H className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <H
        as="button"
        type="button"
        aria-label="Dismiss"
        className="admin-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onCancel}
      />
      <NeuSurface
        className="neu-scroll relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-6"
        as="section"
      >
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {mode === "create" ? "Log cut window" : "Edit cut window"}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {mode === "create"
            ? "Hours with no EDL. Overnight windows wrap past midnight. Demo until API wiring."
            : `Updates the daily cut on ${zone?.name ?? "this zone"}.`}
        </H>

        <H className="mt-4 space-y-3">
          {pickZone || mode === "create" ? (
            <H as="label" className="block">
              <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
                Area
              </H>
              <H
                as="select"
                value={draft.zoneId}
                disabled={!pickZone}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({ ...draft, zoneId: event.target.value })
                }
                className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                <H as="option" value="">
                  Select an area
                </H>
                {zones.map((row) => (
                  <H as="option" key={row.id} value={row.id}>
                    {row.name} · {row.district}
                  </H>
                ))}
              </H>
            </H>
          ) : null}

          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TimeField
              label="Cuts from"
              value={draft.start}
              onChange={(start) => onDraft({ ...draft, start })}
            />
            <TimeField
              label="Cuts until"
              value={draft.end}
              onChange={(end) => onDraft({ ...draft, end })}
            />
          </H>

          <H className="rounded-neu-md bg-clay-100 px-3 py-3 text-sm text-clay-700 shadow-neu-in-sm">
            {draft.start === draft.end && draft.start
              ? "Start and end must differ. Overnight is fine."
              : hours == null
                ? "Pick both times to see duration."
                : overnight
                  ? `${hours}h off EDL, wrapping overnight (${formatTime(draft.start)} → ${formatTime(draft.end)}).`
                  : `${hours}h off EDL.`}
            {atCap ? " This area already has the maximum windows." : ""}
          </H>
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {mode === "create" ? "Save window" : "Update window"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <H as="label" className="block">
      <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
        {label}
      </H>
      <H
        as="select"
        value={value}
        onChange={(event: { target: { value: string } }) =>
          onChange(event.target.value)
        }
        className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm tabular-nums text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <H as="option" value="">
          Select time
        </H>
        {TIME_STEPS.map((step) => (
          <H as="option" key={step} value={step}>
            {formatTime(step)}
          </H>
        ))}
      </H>
    </H>
  );
}
