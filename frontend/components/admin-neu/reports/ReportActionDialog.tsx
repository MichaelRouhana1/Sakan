import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { AdminReport, ReportActionKind } from "./types";
import { personName } from "./types";

const COPY: Record<
  Exclude<ReportActionKind, "claim" | "unclaim">,
  { title: string; body: string; confirm: string }
> = {
  dismiss: {
    title: "Dismiss this report",
    body: "Closes this ticket only. Sibling open reports on the listing stay open. Listing stays live.",
    confirm: "Dismiss",
  },
  dismiss_listing: {
    title: "Dismiss all open reports",
    body: "Closes every open ticket on this listing (matches current dismiss API). Listing stays live.",
    confirm: "Dismiss all",
  },
  remove: {
    title: "Take down this listing",
    body: "Removes the post from browse. Open reports on it resolve. No credit refund.",
    confirm: "Take down",
  },
  warn: {
    title: "Warn this poster",
    body: "Warning stays on the poster record. Ticket resolves. Listing stays live unless you take it down separately.",
    confirm: "Send warning",
  },
  restrict: {
    title: "Suspend this poster",
    body: "Suspended posters cannot publish. Live listings stay until you take them down.",
    confirm: "Suspend",
  },
  ban: {
    title: "Ban this poster",
    body: "Banned posters lose access. Live listings stay until you take them down.",
    confirm: "Ban",
  },
  reopen: {
    title: "Reopen this ticket",
    body: "Returns the ticket to pending. Prior history stays.",
    confirm: "Reopen",
  },
};

type Props = {
  kind: ReportActionKind | null;
  report: AdminReport | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  bulkCount?: number;
  bulkKind?: Extract<ReportActionKind, "dismiss" | "remove"> | null;
};

function bulkCopy(
  kind: Extract<ReportActionKind, "dismiss" | "remove">,
  count: number,
) {
  if (kind === "dismiss") {
    return {
      title: `Dismiss (${count})`,
      body: "Closes each selected open ticket. Listings stay live.",
      confirm: "Dismiss",
    };
  }
  return {
    title: `Take down (${count})`,
    body: "Takes down unique listings for the selection. Open reports on those listings resolve.",
    confirm: "Take down",
  };
}

export function ReportActionDialog({
  kind,
  report,
  note,
  onNote,
  onCancel,
  onConfirm,
  busy,
  bulkCount,
  bulkKind,
}: Props) {
  const bulk = (bulkCount ?? 0) > 0 && bulkKind != null;
  if (!bulk && (!kind || kind === "claim" || kind === "unclaim" || !report)) {
    return null;
  }

  const copy = bulk
    ? bulkCopy(bulkKind!, bulkCount!)
    : COPY[kind as Exclude<ReportActionKind, "claim" | "unclaim">];

  const canSubmit = note.trim().length > 0 && !busy;
  const effectiveKind = bulk ? bulkKind! : kind!;
  const danger =
    effectiveKind === "remove" ||
    effectiveKind === "restrict" ||
    effectiveKind === "ban";
  const target = bulk
    ? `${bulkCount} tickets`
    : effectiveKind === "warn" ||
        effectiveKind === "restrict" ||
        effectiveKind === "ban"
      ? personName(report!.poster)
      : report!.listing.title;

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
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton
            tone={
              danger ? "ember" : effectiveKind === "dismiss" || effectiveKind === "dismiss_listing" ? "plain" : "ochre"
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
