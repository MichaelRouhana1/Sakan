import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  channelLabel,
  creditsLabel,
  formatStamp,
  formatUsd,
  kindLabel,
  personName,
  statusLabel,
  type LedgerTx,
} from "./types";

type Props = {
  kind: "refund" | "detail" | null;
  tx: LedgerTx | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function CreditReviewDialog({
  kind,
  tx,
  note,
  onNote,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!kind || !tx) return null;

  if (kind === "detail") {
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
            Transaction detail
          </H>
          <H className="mt-4 space-y-2 text-sm text-clay-700">
            <Row label="Reference" value={tx.referenceId} />
            <Row label="User" value={`${personName(tx.user)} · ${tx.user.email}`} />
            <Row label="Kind" value={kindLabel(tx.kind)} />
            <Row label="Status" value={statusLabel(tx.status)} />
            <Row label="Method" value={channelLabel(tx.channel)} />
            <Row
              label="Amount"
              value={tx.amountUsdCents !== 0 ? formatUsd(tx.amountUsdCents) : "—"}
            />
            <Row label="Credits" value={creditsLabel(tx)} />
            <Row label="When" value={formatStamp(tx.createdAt)} />
            <Row label="Listing" value={tx.listingId ?? "—"} />
            <Row label="Note" value={tx.note ?? "—"} />
          </H>
          <H className="mt-5 flex justify-end">
            <NeuButton onClick={onCancel}>Close</NeuButton>
          </H>
        </NeuSurface>
      </H>
    );
  }

  const canSubmit = note.trim().length > 0 && !busy;

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
          Issue credit refund
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Marks the purchase refunded and writes a claw-back row. Demo only —
          does not write Users. Target: {personName(tx.user)} · {tx.referenceId}.
        </H>
        <H as="label" className="mt-4 block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Staff note
          </H>
          <H className="rounded-neu-md bg-clay-100 shadow-neu-in-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss">
            <H
              as="textarea"
              value={note}
              rows={4}
              onChange={(event: { target: { value: string } }) =>
                onNote(event.target.value)
              }
              placeholder="Why this refund, in one or two lines"
              className="w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
            />
          </H>
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton tone="ember" disabled={!canSubmit} onClick={onConfirm}>
            {busy ? "Working…" : "Refund"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <H className="flex justify-between gap-3">
      <H as="span" className="text-clay-500">
        {label}
      </H>
      <H as="span" className="max-w-[60%] text-right font-medium text-clay-900">
        {value}
      </H>
    </H>
  );
}
