import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { RegistryActionKind, RegistryTarget } from "./types";

const COPY: Record<
  RegistryActionKind,
  { title: (target: RegistryTarget) => string; body: string; confirm: string }
> = {
  activate: {
    title: (target) =>
      target === "institution" ? "Activate this university" : "Activate this campus",
    body: "Puts the record back in public browse and map filters.",
    confirm: "Activate",
  },
  deactivate: {
    title: (target) =>
      target === "institution"
        ? "Deactivate this university"
        : "Deactivate this campus",
    body: "Hides it from renter browse. Existing listings stay, but new campus filters skip it.",
    confirm: "Deactivate",
  },
  remove: {
    title: (target) =>
      target === "institution" ? "Remove this university" : "Remove this campus",
    body: "Demo delete. Drops the row from this page. Campuses under a university go with it.",
    confirm: "Remove",
  },
};

type Props = {
  kind: RegistryActionKind | null;
  target: RegistryTarget;
  name: string;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RegistryActionDialog({
  kind,
  target,
  name,
  note,
  onNote,
  onCancel,
  onConfirm,
}: Props) {
  if (!kind) return null;
  const copy = COPY[kind];
  const canSubmit = note.trim().length > 0;
  const danger = kind === "remove";

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
          {copy.title(target)}
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
            tone={danger ? "ember" : kind === "activate" ? "moss" : "ochre"}
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
