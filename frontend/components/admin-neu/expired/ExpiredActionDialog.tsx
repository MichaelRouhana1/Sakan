import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { ExpiredActionKind, ExpiredAsset, ExpiredQueue } from "./types";
import { posterName } from "./types";

function copyFor(
  kind: ExpiredActionKind,
  queue: ExpiredQueue,
): { title: string; body: string; confirm: string } {
  if (kind === "nudge") {
    return {
      title: "Send reactivation nudge",
      body: "Reminds the poster the 30-day timer ran out. Ask them to renew before we archive or purge.",
      confirm: "Send nudge",
    };
  }
  if (kind === "archive") {
    return {
      title: "Keep this listing archived",
      body:
        queue === "pending_deletion"
          ? "Pulls it off the deletion queue. Stays off browse."
          : "Takes the expired post off browse. Poster can still see it as archived.",
      confirm: "Keep archived",
    };
  }
  if (queue === "pending_deletion") {
    return {
      title: "Permanently delete this listing",
      body: "Hard removal. No credit refund. This cannot be undone in the demo queue.",
      confirm: "Permanently delete",
    };
  }
  return {
    title: "Queue for permanent deletion",
    body: "Moves the listing to Pending deletion. Hard delete happens from that queue.",
    confirm: "Move to pending deletion",
  };
}

type Props = {
  kind: ExpiredActionKind | null;
  asset: ExpiredAsset | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ExpiredActionDialog({
  kind,
  asset,
  note,
  onNote,
  onCancel,
  onConfirm,
}: Props) {
  if (!kind || !asset) return null;
  const copy = copyFor(kind, asset.queue);
  const canSubmit = note.trim().length > 0;
  const danger = kind === "remove";
  const target = kind === "nudge" ? posterName(asset) : asset.title;

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
            {kind === "nudge" ? "Message to poster" : "Staff note"}
          </H>
          <H
            as="textarea"
            value={note}
            rows={4}
            onChange={(event: { target: { value: string } }) =>
              onNote(event.target.value)
            }
            placeholder={
              kind === "nudge"
                ? "Short reminder to renew the listing"
                : "Why this action, in one or two lines"
            }
            className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          />
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton
            tone={danger ? "ember" : kind === "nudge" ? "moss" : "ochre"}
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
