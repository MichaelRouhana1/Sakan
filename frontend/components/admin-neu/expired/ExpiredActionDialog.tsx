import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  archiveButtonLabel,
  posterName,
  type ExpiredActionKind,
  type ExpiredAsset,
} from "./types";

function copyFor(
  kind: ExpiredActionKind,
  asset: ExpiredAsset | null,
  bulkCount?: number,
): { title: string; body: string; confirm: string } {
  const bulk = (bulkCount ?? 0) > 1;

  if (bulk) {
    if (kind === "nudge") {
      return {
        title: `Send nudge (${bulkCount})`,
        body: "Sends the same renew reminder to each selected poster that can be nudged.",
        confirm: "Send nudges",
      };
    }
    if (kind === "archive") {
      return {
        title: `Archive (${bulkCount})`,
        body: "Archives selected rows that are recent or pending deletion.",
        confirm: "Archive",
      };
    }
    if (kind === "queue_delete") {
      return {
        title: `Queue for deletion (${bulkCount})`,
        body: "Stages selected recent/archived rows for hard delete.",
        confirm: "Queue for deletion",
      };
    }
    if (kind === "purge") {
      return {
        title: `Permanently delete (${bulkCount})`,
        body: "Purges selected pending-deletion rows from the demo store.",
        confirm: "Permanently delete",
      };
    }
  }

  if (!asset) {
    return { title: "Confirm", body: "", confirm: "Confirm" };
  }

  if (kind === "nudge") {
    return {
      title: "Send reactivation nudge",
      body: "Reminds the poster the 30-day timer ran out. Ask them to renew before we archive or purge.",
      confirm: "Send nudge",
    };
  }
  if (kind === "archive") {
    return {
      title: archiveButtonLabel(asset),
      body:
        asset.queue === "pending_deletion"
          ? "Pulls it off the deletion queue. Stays off browse as archived."
          : "Takes the expired post off browse. Poster can still see it as archived.",
      confirm: archiveButtonLabel(asset),
    };
  }
  if (kind === "queue_delete") {
    return {
      title: "Queue for permanent deletion",
      body: "Moves the listing to Pending deletion. Hard delete happens from that queue only.",
      confirm: "Queue for deletion",
    };
  }
  if (kind === "purge") {
    return {
      title: "Permanently delete this listing",
      body: "Hard removal from the demo store. No credit refund. Cannot be undone here.",
      confirm: "Permanently delete",
    };
  }
  return {
    title: "Mark listing renewed",
    body: "Mock renew: extends expiry +30 days from the demo clock and removes it from Expired. Live API would spend a post credit.",
    confirm: "Mark renewed",
  };
}

type Props = {
  kind: ExpiredActionKind | null;
  asset: ExpiredAsset | null;
  bulkCount?: number;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function ExpiredActionDialog({
  kind,
  asset,
  bulkCount,
  note,
  onNote,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!kind) return null;
  const bulk = (bulkCount ?? 0) > 1;
  if (!asset && !bulk) return null;

  const copy = copyFor(kind, asset, bulkCount);
  const canSubmit = note.trim().length > 0 && !busy;
  const danger = kind === "purge" || kind === "queue_delete";
  const target =
    kind === "nudge" && asset
      ? posterName(asset)
      : asset?.title ?? `${bulkCount} listings`;

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
          {copy.body}{" "}
          {bulk ? `Targets: ${bulkCount} listings.` : `Target: ${target}.`}
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
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton
            tone={
              danger
                ? "ember"
                : kind === "nudge" || kind === "renew"
                  ? "moss"
                  : "ochre"
            }
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
