import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { kindLabel, type ModerationKind } from "./types";

const COPY: Record<ModerationKind, { title: string; body: string; confirm: string }> = {
  warn: {
    title: "Warn this account",
    body: "A warning stays on the record. The account stays active.",
    confirm: "Send warning",
  },
  restrict: {
    title: "Suspend this account",
    body: "Suspended accounts cannot publish or file reports until restored.",
    confirm: "Suspend",
  },
  ban: {
    title: "Ban this account",
    body: "A ban is the hard stop. Live poster listings are taken down.",
    confirm: "Ban account",
  },
  restore: {
    title: "Restore this account",
    body: "Clears suspend or ban so the account can use Skoun again.",
    confirm: "Restore",
  },
};

type Props = {
  kind: ModerationKind | null;
  name: string;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function UserModerationDialog({
  kind,
  name,
  note,
  onNote,
  onCancel,
  onConfirm,
}: Props) {
  if (!kind) return null;
  const copy = COPY[kind];
  const canSubmit = note.trim().length > 0;
  const danger = kind === "ban";

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
        className="relative w-full max-w-md p-5 sm:p-6"
        as="section"
      >
        <H
          as="h2"
          className="font-display text-lg font-semibold text-clay-900"
        >
          {copy.title}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {copy.body} Target: {name}.
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
            tone={danger ? "ember" : kind === "restore" ? "moss" : "ochre"}
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
