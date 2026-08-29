import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ZoneSelect } from "./ZoneSelect";
import { slugify, type AdminGovernorate, type AreaDraft, type RenameTarget } from "./types";

const FIELD_SHELL =
  "flex min-h-[44px] w-full items-center rounded-neu-md bg-clay-50 px-3 shadow-neu-in";
const FIELD_CONTROL =
  "w-full border-0 bg-transparent py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline-none";

type Props = {
  mode: "create" | "rename" | null;
  renameTarget: RenameTarget | null;
  tree: AdminGovernorate[];
  draft: AreaDraft;
  slugLocked: boolean;
  lockDistrict?: boolean;
  busy?: boolean;
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
        className="relative w-full max-w-md overflow-visible p-5 sm:p-6"
        as="section"
      >
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {title}
        </H>
        <H as="p" className="mt-1.5 text-sm leading-relaxed text-clay-700">
          {mode === "create"
            ? "Appears in Cities filter chips this session. Listing create still uses the seed name list."
            : "Updates Cities filter chips this session. Does not rewrite existing listings."}
        </H>

        <H className="mt-5 flex flex-col gap-4">
          {mode === "create" ? (
            <ZoneSelect
              label="Parent district"
              value={draft.districtId}
              placeholder="Select a district"
              locked={lockDistrict}
              tree={tree}
              onChange={(districtId) => onDraft({ ...draft, districtId })}
            />
          ) : null}

          <Field
            label="Name"
            value={draft.name}
            placeholder="e.g. Mar Mikhael South"
            onChange={setName}
            autoFocus={mode === "create" || Boolean(renameTarget)}
          />
          <Field
            label="Slug"
            value={draft.slug}
            placeholder="auto from name"
            hint={
              slugLocked
                ? "Edited manually — no longer follows name"
                : "Fills from name until you edit it"
            }
            onChange={(slug) => {
              onSlugLocked(true);
              onDraft({ ...draft, slug: slugify(slug) });
            }}
          />
        </H>

        <H className="mt-6 flex flex-wrap justify-end gap-2">
          <NeuButton disabled={busy} onClick={onCancel}>
            Cancel
          </NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {busy ? "Saving…" : mode === "create" ? "Add area" : "Save name"}
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
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <H as="label" className="block">
      <H as="span" className="mb-1.5 block text-sm font-medium text-clay-900">
        {label}
      </H>
      <H className={FIELD_SHELL}>
        <H
          as="input"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event: { target: { value: string } }) =>
            onChange(event.target.value)
          }
          className={FIELD_CONTROL}
        />
      </H>
      {hint ? (
        <H as="span" className="mt-1.5 block text-xs text-clay-500">
          {hint}
        </H>
      ) : null}
    </H>
  );
}
