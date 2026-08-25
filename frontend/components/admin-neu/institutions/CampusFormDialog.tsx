import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { slugify, type AdminInstitution, type CampusDraft } from "./types";

type Props = {
  mode: "create" | "edit" | null;
  institutions: AdminInstitution[];
  draft: CampusDraft;
  slugLocked: boolean;
  lockInstitution?: boolean;
  onDraft: (draft: CampusDraft) => void;
  onSlugLocked: (locked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CampusFormDialog({
  mode,
  institutions,
  draft,
  slugLocked,
  lockInstitution,
  onDraft,
  onSlugLocked,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode) return null;

  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  const canSubmit =
    draft.institutionId.length > 0 &&
    draft.name.trim().length >= 2 &&
    draft.slug.trim().length >= 2 &&
    draft.city.trim().length >= 2 &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180;

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
          {mode === "create" ? "Add campus" : "Edit campus"}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Map pin for walking-distance sort. Use decimal degrees. Demo only until API wiring.
        </H>

        <H className="mt-4 space-y-3">
          <H as="label" className="block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              University
            </H>
            <H
              as="select"
              value={draft.institutionId}
              disabled={lockInstitution}
              onChange={(event: { target: { value: string } }) =>
                onDraft({ ...draft, institutionId: event.target.value })
              }
              className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              <H as="option" value="">
                Select a university
              </H>
              {institutions.map((item) => (
                <H as="option" key={item.id} value={item.id}>
                  {item.shortName} · {item.name}
                </H>
              ))}
            </H>
          </H>

          <Field label="Campus name" value={draft.name} onChange={setName} />
          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Slug"
              value={draft.slug}
              onChange={(slug) => {
                onSlugLocked(true);
                onDraft({ ...draft, slug: slugify(slug) });
              }}
            />
            <Field
              label="City"
              value={draft.city}
              onChange={(city) => onDraft({ ...draft, city })}
            />
          </H>
          <H className="grid grid-cols-2 gap-3">
            <Field
              label="Latitude"
              value={draft.lat}
              inputMode="decimal"
              onChange={(next) => onDraft({ ...draft, lat: next })}
              placeholder="33.89999"
            />
            <Field
              label="Longitude"
              value={draft.lng}
              inputMode="decimal"
              onChange={(next) => onDraft({ ...draft, lng: next })}
              placeholder="35.48212"
            />
          </H>

          <Toggle
            label="Main campus"
            active={draft.isMain}
            onLabel="Main"
            offLabel="Satellite"
            onChange={(isMain) => onDraft({ ...draft, isMain })}
          />
          <Toggle
            label="Status"
            active={draft.active}
            onLabel="Active"
            offLabel="Inactive"
            onChange={(active) => onDraft({ ...draft, active })}
          />
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {mode === "create" ? "Add campus" : "Save campus"}
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
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal";
}) {
  return (
    <H as="label" className="block">
      <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
        {label}
      </H>
      <H
        as="input"
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event: { target: { value: string } }) =>
          onChange(event.target.value)
        }
        className="w-full rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      />
    </H>
  );
}

function Toggle({
  label,
  active,
  onLabel,
  offLabel,
  onChange,
}: {
  label: string;
  active: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (active: boolean) => void;
}) {
  return (
    <H>
      <H as="p" className="mb-2 text-sm font-medium text-clay-900">
        {label}
      </H>
      <H
        className="inline-flex rounded-full bg-clay-100 p-1.5 shadow-neu-in"
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
          {onLabel}
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
          {offLabel}
        </H>
      </H>
    </H>
  );
}
