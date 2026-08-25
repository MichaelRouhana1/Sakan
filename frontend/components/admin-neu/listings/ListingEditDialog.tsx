import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { AdminListing } from "./types";

type Draft = {
  title: string;
  area: string;
  monthlyRentUsd: string;
};

type Props = {
  listing: AdminListing | null;
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ListingEditDialog({
  listing,
  draft,
  onDraft,
  onCancel,
  onConfirm,
}: Props) {
  if (!listing) return null;
  const rent = Number(draft.monthlyRentUsd);
  const canSubmit =
    draft.title.trim().length >= 3 &&
    draft.area.trim().length >= 2 &&
    Number.isFinite(rent) &&
    rent > 0;

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
          Edit listing details
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Demo edit. Changes stay on this page until API wiring.
        </H>

        <H className="mt-4 space-y-3">
          <Field
            label="Title"
            value={draft.title}
            onChange={(title) => onDraft({ ...draft, title })}
          />
          <Field
            label="Location"
            value={draft.area}
            onChange={(area) => onDraft({ ...draft, area })}
          />
          <Field
            label="Monthly rent (USD)"
            value={draft.monthlyRentUsd}
            onChange={(monthlyRentUsd) => onDraft({ ...draft, monthlyRentUsd })}
          />
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            Save details
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <H as="label" className="block">
      <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
        {label}
      </H>
      <H
        as="input"
        value={value}
        onChange={(event: { target: { value: string } }) =>
          onChange(event.target.value)
        }
        className="w-full rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      />
    </H>
  );
}
