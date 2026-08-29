import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { slugify, type InstitutionDraft } from "./types";

type Props = {
  mode: "create" | "edit" | null;
  draft: InstitutionDraft;
  slugLocked: boolean;
  busy?: boolean;
  onDraft: (draft: InstitutionDraft) => void;
  onSlugLocked: (locked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function InstitutionFormDialog({
  mode,
  draft,
  slugLocked,
  busy,
  onDraft,
  onSlugLocked,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode) return null;

  const canSubmit =
    !busy &&
    draft.name.trim().length >= 2 &&
    draft.shortName.trim().length >= 1 &&
    draft.slug.trim().length >= 2;

  function setName(name: string) {
    onDraft({
      ...draft,
      name,
      slug: slugLocked ? draft.slug : slugify(name),
    });
  }

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
        className="neu-scroll relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-6"
        as="section"
      >
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {mode === "create" ? "Add university" : "Edit university"}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Parent record for campuses on the renter map. Demo until source swap.
        </H>

        <H className="mt-4 space-y-3">
          <Field label="University name" value={draft.name} onChange={setName} />
          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Acronym"
              value={draft.shortName}
              onChange={(shortName) => onDraft({ ...draft, shortName })}
            />
            <Field
              label="Slug"
              value={draft.slug}
              onChange={(slug) => {
                onSlugLocked(true);
                onDraft({ ...draft, slug: slugify(slug) });
              }}
            />
          </H>
          <Field
            label="Website"
            value={draft.website}
            onChange={(website) => onDraft({ ...draft, website })}
            placeholder="https://"
          />
          <Field
            label="Logo URL"
            value={draft.logoUrl}
            onChange={(logoUrl) => onDraft({ ...draft, logoUrl })}
            placeholder="https://… (optional)"
          />

          <Toggle
            label="Status"
            active={draft.active}
            onChange={(active) => onDraft({ ...draft, active })}
          />
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton disabled={busy} onClick={onCancel}>
            Cancel
          </NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {busy
              ? "Saving…"
              : mode === "create"
                ? "Add university"
                : "Save university"}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <H as="label" className="block">
      <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
        {label}
      </H>
      <H className="flex min-h-[44px] w-full items-center rounded-neu-md bg-clay-50 px-3 shadow-neu-in">
        <H
          as="input"
          value={value}
          placeholder={placeholder}
          onChange={(event: { target: { value: string } }) =>
            onChange(event.target.value)
          }
          className="w-full border-0 bg-transparent py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline-none"
        />
      </H>
    </H>
  );
}

function Toggle({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
}) {
  return (
    <H>
      <H as="p" className="mb-2 text-sm font-medium text-clay-900">
        {label}
      </H>
      <H
        className="inline-flex rounded-full bg-clay-50 p-1.5 shadow-neu-in"
        role="group"
        aria-label={label}
      >
        <H
          as="button"
          type="button"
          onClick={() => onChange(true)}
          className={[
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-shadow duration-press",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
            active
              ? "bg-clay-100 text-moss shadow-neu-sm"
              : "bg-transparent text-clay-700",
          ].join(" ")}
        >
          Active
        </H>
        <H
          as="button"
          type="button"
          onClick={() => onChange(false)}
          className={[
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-shadow duration-press",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
            !active
              ? "bg-clay-100 text-clay-900 shadow-neu-sm"
              : "bg-transparent text-clay-700",
          ].join(" ")}
        >
          Inactive
        </H>
      </H>
    </H>
  );
}
