import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { DomainChip } from "./InstitutionPills";
import {
  parseDomain,
  slugify,
  type InstitutionDraft,
} from "./types";

type Props = {
  mode: "create" | "edit" | null;
  draft: InstitutionDraft;
  slugLocked: boolean;
  domainInput: string;
  onDraft: (draft: InstitutionDraft) => void;
  onSlugLocked: (locked: boolean) => void;
  onDomainInput: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function InstitutionFormDialog({
  mode,
  draft,
  slugLocked,
  domainInput,
  onDraft,
  onSlugLocked,
  onDomainInput,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode) return null;

  const canSubmit =
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

  function addDomain(raw: string) {
    const parsed = parseDomain(raw);
    if (!parsed || draft.emailDomains.includes(parsed)) {
      onDomainInput("");
      return;
    }
    onDraft({ ...draft, emailDomains: [...draft.emailDomains, parsed] });
    onDomainInput("");
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
          Parent record for campuses on the renter map. Demo only until API wiring.
        </H>

        <H className="mt-4 space-y-3">
          <Field
            label="University name"
            value={draft.name}
            onChange={setName}
          />
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

          <H as="label" className="block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              Academic email domains
              <H as="span" className="ml-1 font-normal text-clay-500">
                optional
              </H>
            </H>
            <H className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-neu-md bg-clay-100 px-2.5 py-2 shadow-neu-in-sm">
              {draft.emailDomains.map((domain) => (
                <DomainChip
                  key={domain}
                  domain={domain}
                  onRemove={() =>
                    onDraft({
                      ...draft,
                      emailDomains: draft.emailDomains.filter((item) => item !== domain),
                    })
                  }
                />
              ))}
              <H
                as="input"
                value={domainInput}
                placeholder={
                  draft.emailDomains.length === 0 ? "e.g. aub.edu.lb" : "Add another"
                }
                onChange={(event: { target: { value: string } }) => {
                  const next = event.target.value;
                  if (next.includes(",") || next.includes(" ")) {
                    addDomain(next.replace(/[, ]+$/, ""));
                    return;
                  }
                  onDomainInput(next);
                }}
                onKeyDown={(event: { key: string; preventDefault: () => void }) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addDomain(domainInput);
                  }
                  if (
                    event.key === "Backspace" &&
                    domainInput.length === 0 &&
                    draft.emailDomains.length > 0
                  ) {
                    onDraft({
                      ...draft,
                      emailDomains: draft.emailDomains.slice(0, -1),
                    });
                  }
                }}
                onBlur={() => {
                  if (domainInput.trim()) addDomain(domainInput);
                }}
                className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
              />
            </H>
            <H as="span" className="mt-1.5 block text-[11px] text-clay-500">
              Used later for student email verification. Press Enter to add.
            </H>
          </H>

          <Toggle
            label="Status"
            active={draft.active}
            onChange={(active) => onDraft({ ...draft, active })}
          />
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {mode === "create" ? "Add university" : "Save university"}
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
      <H
        as="input"
        value={value}
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
