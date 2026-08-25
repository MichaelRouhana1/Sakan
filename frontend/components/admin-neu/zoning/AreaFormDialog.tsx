import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { slugify, type AdminGovernorate, type AreaDraft, type RenameTarget } from "./types";

type Props = {
  mode: "create" | "rename" | null;
  renameTarget: RenameTarget | null;
  tree: AdminGovernorate[];
  draft: AreaDraft;
  slugLocked: boolean;
  lockDistrict?: boolean;
  onDraft: (draft: AreaDraft) => void;
  onSlugLocked: (locked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AreaFormDialog({
  mode,
  renameTarget,
  tree,
  draft,
  slugLocked,
  lockDistrict,
  onDraft,
  onSlugLocked,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode) return null;

  const canSubmit =
    draft.name.trim().length >= 2 &&
    draft.slug.trim().length >= 2 &&
    (mode === "rename" || draft.districtId.length > 0);

  function setName(name: string) {
    onDraft({
      ...draft,
      name,
      slug: slugLocked ? draft.slug : slugify(name),
    });
  }

  const title =
    mode === "create"
      ? "Add custom area"
      : `Rename ${renameTarget?.kind === "governorate" ? "governorate" : renameTarget?.kind === "district" ? "district" : "area"}`;

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
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-6"
        as="section"
      >
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {title}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {mode === "create"
            ? "Staff-only neighborhood for search filters. Lands under a district so browse stays clean. Demo until API wiring."
            : "Updates the label renters see in Standard search. Slug stays stable unless you edit it."}
        </H>

        <H className="mt-4 space-y-3">
          {mode === "create" ? (
            <H as="label" className="block">
              <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
                Parent district
              </H>
              <H
                as="select"
                value={draft.districtId}
                disabled={lockDistrict}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({ ...draft, districtId: event.target.value })
                }
                className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                <H as="option" value="">
                  Select a district
                </H>
                {tree.map((gov) => (
                  <H as="optgroup" key={gov.id} label={`${gov.name} · ${gov.arabicName}`}>
                    {gov.districts.map((district) => (
                      <H as="option" key={district.id} value={district.id}>
                        {district.name}
                      </H>
                    ))}
                  </H>
                ))}
              </H>
            </H>
          ) : null}

          <Field label="Name" value={draft.name} onChange={setName} />
          <Field
            label="Slug"
            value={draft.slug}
            onChange={(slug) => {
              onSlugLocked(true);
              onDraft({ ...draft, slug: slugify(slug) });
            }}
          />
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {mode === "create" ? "Add area" : "Save name"}
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
