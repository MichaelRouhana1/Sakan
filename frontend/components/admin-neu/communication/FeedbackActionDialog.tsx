import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { personName, type FeedbackActionKind, type FeedbackItem } from "./types";

const COPY: Record<
  Extract<FeedbackActionKind, "archive" | "unarchive">,
  { title: string; body: string; confirm: string }
> = {
  archive: {
    title: "Archive this note",
    body: "Files it away. Reply stays on the ticket. Unarchive to work it again.",
    confirm: "Archive",
  },
  unarchive: {
    title: "Unarchive this note",
    body: "Returns it to read if it has a reply, otherwise unread.",
    confirm: "Unarchive",
  },
};

type Props = {
  kind: Extract<FeedbackActionKind, "archive" | "unarchive"> | null;
  item: FeedbackItem | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function FeedbackActionDialog({
  kind,
  item,
  note,
  onNote,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!kind || !item) return null;
  const copy = COPY[kind];
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
          {copy.title}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {copy.body} Target: {personName(item.user)}.
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
              placeholder="Why this action, in one or two lines"
              className="w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
            />
          </H>
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton
            tone={kind === "archive" ? "ochre" : "moss"}
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
