import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { personName, type LedgerTx } from "./types";

type Kind = "approve" | "reject";

const COPY: Record<Kind, { title: string; body: string; confirm: string }> = {
  approve: {
    title: "Approve this purchase",
    body: "Credits land on the poster account. Mark the Whish or OMT slip as matched.",
    confirm: "Approve",
  },
  reject: {
    title: "Reject this purchase",
    body: "No credits move. The poster can buy again with a new reference.",
    confirm: "Reject",
  },
};

type Props = {
  kind: Kind | null;
  tx: LedgerTx | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CreditReviewDialog({
  kind,
  tx,
  note,
  onNote,
  onCancel,
  onConfirm,
}: Props) {
  if (!kind || !tx) return null;
  const copy = COPY[kind];
  const canSubmit = kind === "approve" || note.trim().length > 0;

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
          {copy.body} Target: {personName(tx.user)} · {tx.referenceId}.
        </H>
        <H as="label" className="mt-4 block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Staff note{kind === "reject" ? "" : " (optional)"}
          </H>
          <H
            as="textarea"
            value={note}
            rows={4}
            onChange={(event: { target: { value: string } }) =>
              onNote(event.target.value)
            }
            placeholder="Why this decision, in one or two lines"
            className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          />
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton
            tone={kind === "reject" ? "ember" : "moss"}
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
