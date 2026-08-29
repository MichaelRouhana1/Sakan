import { ChevronDown } from "lucide-react-native";
import { useEffect, useId, useRef, useState } from "react";
import { isInLebanon } from "@/lib/locationWkt";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ADMIN_MUTED } from "../theme";
import { CampusPinPicker } from "./CampusPinPicker";
import { slugify, type AdminInstitution, type CampusDraft } from "./types";

type Props = {
  mode: "create" | "edit" | null;
  institutions: AdminInstitution[];
  draft: CampusDraft;
  slugLocked: boolean;
  lockInstitution?: boolean;
  busy?: boolean;
  onDraft: (draft: CampusDraft) => void;
  onSlugLocked: (locked: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Inset well — clay-50 vs dialog clay-100 so the field is obvious in light + dark. */
const WELL =
  "flex min-h-[44px] w-full items-center rounded-neu-md bg-clay-50 px-3 shadow-neu-in";
const CONTROL =
  "w-full border-0 bg-transparent py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0";

export function CampusFormDialog({
  mode,
  institutions,
  draft,
  slugLocked,
  lockInstitution,
  busy,
  onDraft,
  onSlugLocked,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode) return null;

  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  const canSubmit =
    !busy &&
    draft.institutionId.length > 0 &&
    draft.name.trim().length >= 2 &&
    draft.slug.trim().length >= 2 &&
    draft.city.trim().length >= 2 &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    isInLebanon({ lat, lng });

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
        className="neu-scroll relative max-h-[90dvh] w-full max-w-xl overflow-y-auto p-5 sm:p-6"
        as="section"
      >
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {mode === "create" ? "Add campus" : "Edit campus"}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Drop a map pin for walking-distance sort. Demo until source swap.
          Pin must sit inside Lebanon.
        </H>

        <H className="mt-4 space-y-3">
          <InstitutionPicker
            institutions={institutions}
            value={draft.institutionId}
            locked={lockInstitution}
            onChange={(institutionId) => onDraft({ ...draft, institutionId })}
          />

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

          <CampusPinPicker
            lat={draft.lat}
            lng={draft.lng}
            label={draft.name.trim() || "Campus"}
            onChange={({ lat: nextLat, lng: nextLng }) =>
              onDraft({ ...draft, lat: nextLat, lng: nextLng })
            }
          />

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
            offLabel="Branch"
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
          <NeuButton disabled={busy} onClick={onCancel}>
            Cancel
          </NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {busy
              ? "Saving…"
              : mode === "create"
                ? "Add campus"
                : "Save campus"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

function InstitutionPicker({
  institutions,
  value,
  locked,
  onChange,
}: {
  institutions: AdminInstitution[];
  value: string;
  locked?: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const selected = institutions.find((item) => item.id === value);
  const label = selected
    ? `${selected.shortName} · ${selected.name}`
    : "Select a university";

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <H
      className="relative block"
      ref={(node: HTMLDivElement | null) => {
        rootRef.current = node;
      }}
    >
      <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
        University
      </H>
      <H
        as="button"
        type="button"
        disabled={locked}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!locked) setOpen((current) => !current);
        }}
        className={[
          WELL,
          "w-full cursor-pointer justify-between gap-2 text-left transition-shadow duration-press",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
          "disabled:cursor-not-allowed disabled:opacity-60",
          open ? "shadow-press" : "",
        ].join(" ")}
      >
        <H
          as="span"
          className={[
            "min-w-0 flex-1 truncate py-2.5 text-sm",
            selected ? "font-medium text-clay-900" : "text-clay-500",
          ].join(" ")}
        >
          {label}
        </H>
        <ChevronDown size={16} strokeWidth={1.75} color={ADMIN_MUTED} />
      </H>

      {open ? (
        <H
          id={listId}
          role="listbox"
          aria-label="University"
          className="neu-scroll absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 max-h-56 overflow-y-auto rounded-neu-md bg-clay-100 p-1.5 shadow-neu"
        >
          {institutions.length === 0 ? (
            <H as="p" className="px-3 py-2 text-sm text-clay-700">
              No universities yet
            </H>
          ) : (
            institutions.map((item) => {
              const active = item.id === value;
              return (
                <H
                  as="button"
                  type="button"
                  role="option"
                  key={item.id}
                  aria-selected={active}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full cursor-pointer flex-col items-start rounded-neu-md px-3 py-2 text-left transition-shadow duration-press",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                    active
                      ? "bg-clay-100 text-moss shadow-press"
                      : "text-clay-900 hover:shadow-neu-in-sm",
                  ].join(" ")}
                >
                  <H as="span" className="text-sm font-semibold">
                    {item.shortName}
                  </H>
                  <H as="span" className="text-xs text-clay-700">
                    {item.name}
                  </H>
                </H>
              );
            })
          )}
        </H>
      ) : null}
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
      <H className={WELL}>
        <H
          as="input"
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(event: { target: { value: string } }) =>
            onChange(event.target.value)
          }
          className={CONTROL}
        />
      </H>
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
