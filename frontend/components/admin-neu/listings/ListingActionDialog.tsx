import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { ListingActionKind } from "./types";

const COPY: Record<
  ListingActionKind,
  { title: string; body: string; confirm: string }
> = {
  archive: {
    title: "Archive this listing",
    body: "Takes the post off browse. Poster can still see it as archived. Open reports close.",
    confirm: "Archive",
  },
  remove: {
    title: "Take down this listing",
    body: "Hard removal for rule breaks. One-way — cannot restore. No credit refund. Open reports close.",
    confirm: "Take down",
  },
  restore: {
    title: "Restore this listing",
    body: "Puts an archived post back on browse until expiry. Removed listings cannot be restored.",
    confirm: "Restore",
  },
  dismiss_reports: {
    title: "Dismiss open reports",
    body: "Clears open renter flags without changing listing status. Use when reports are invalid.",
    confirm: "Dismiss flags",
  },
};

type Props = {
  kind: ListingActionKind | null;
  title: string;
  bulkCount?: number;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function ListingActionDialog({
  kind,
  title,
  bulkCount,
  note,
  onNote,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!kind) return null;
  const copy = COPY[kind];
  const canSubmit = note.trim().length > 0 && !busy;
  const danger = kind === "remove";
  const bulk = (bulkCount ?? 0) > 1;

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
          {bulk ? `${copy.title.replace(" this listing", "")} (${bulkCount})` : copy.title}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {copy.body}{" "}
          {bulk ? `Targets: ${bulkCount} listings.` : `Target: ${title}.`}
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
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton
            tone={danger ? "ember" : kind === "restore" ? "moss" : "ochre"}
            disabled={!canSubmit}
            onClick={onConfirm}
          >
            {busy ? "Working…" : copy.confirm}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}
