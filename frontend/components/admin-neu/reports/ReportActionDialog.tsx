import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { AdminReport, ReportActionKind } from "./types";
import { personName } from "./types";

const COPY: Record<
  Exclude<ReportActionKind, "claim">,
  { title: string; body: string; confirm: string }
> = {
  dismiss: {
    title: "Dismiss this report",
    body: "Closes the ticket. The listing stays live.",
    confirm: "Dismiss",
  },
  remove: {
    title: "Take down this listing",
    body: "Removes the post from browse. Open reports on it resolve. No credit refund.",
    confirm: "Take down",
  },
  warn: {
    title: "Warn this poster",
    body: "A warning stays on the poster record. The listing stays live unless you take it down separately.",
    confirm: "Send warning",
  },
  restrict: {
    title: "Suspend this poster",
    body: "Suspended posters cannot publish. Live listings stay until you take them down.",
    confirm: "Suspend",
  },
};

type Props = {
  kind: ReportActionKind | null;
  report: AdminReport | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReportActionDialog({
  kind,
  report,
  note,
  onNote,
  onCancel,
  onConfirm,
}: Props) {
  if (!kind || kind === "claim" || !report) return null;
  const copy = COPY[kind];
  const canSubmit = note.trim().length > 0;
  const danger = kind === "remove" || kind === "restrict";
  const target =
    kind === "warn" || kind === "restrict"
      ? personName(report.poster)
      : report.listing.title;

  return (
    <H className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <H
        as="button"
        type="button"
        aria-label="Dismiss"
        className="admin-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onCancel}
      />
      <NeuSurface className="relative w-full max-w-md p-5 sm:p-6" as="section">
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {copy.title}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {copy.body} Target: {target}.
        </H>
        <H as="label" className="mt-4 block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Staff note
          </H>
          <H
            as="textarea"
            value={note}
            rows={4}
            onChange={(event: { target: { value: string } }) =>
              onNote(event.target.value)
            }
            placeholder="Why this action, in one or two lines"
            className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          />
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton
            tone={danger ? "ember" : kind === "dismiss" ? "plain" : "ochre"}
            disabled={!canSubmit}
            onClick={onConfirm}
          >
            {copy.confirm}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}
