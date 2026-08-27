import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  maxAmountOff,
  packLabel,
  suggestCode,
  type CatalogType,
  type CreditPackage,
  type PromoDraft,
} from "./types";

type Props = {
  open: boolean;
  draft: PromoDraft;
  packages: CreditPackage[];
  busy?: boolean;
  onDraft: (draft: PromoDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const PACKS: ("all" | CatalogType)[] = [
  "all",
  "starter",
  "bundle_5",
  "boost_pack",
];

export function PromoGeneratorDialog({
  open,
  draft,
  packages,
  busy,
  onDraft,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const value = Number(draft.value);
  const cap = Number(draft.usageLimit);
  const amountCap = maxAmountOff(packages, draft.appliesTo);
  const amountOk =
    draft.kind === "percent" ? true : Number.isFinite(value) && value <= amountCap;
  const canSubmit =
    !busy &&
    draft.name.trim().length >= 3 &&
    draft.code.trim().length >= 4 &&
    Number.isFinite(value) &&
    value > 0 &&
    (draft.kind === "percent" ? value <= 80 : true) &&
    amountOk &&
    Number.isFinite(cap) &&
    cap >= 1 &&
    draft.startsAt.length > 0 &&
    draft.expiresAt.length > 0 &&
    draft.expiresAt >= draft.startsAt;

  function setName(name: string) {
    const suggested = suggestCode(name);
    const prevSuggested = suggestCode(draft.name);
    const code =
      !draft.code.trim() || draft.code === prevSuggested ? suggested : draft.code;
    onDraft({ ...draft, name, code });
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
          Generate promo code
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Seasonal discount for Whish and OMT checkouts. Code stamps on the
          cash quote.
        </H>

        <H className="mt-4 space-y-3">
          <Field
            label="Campaign name"
            value={draft.name}
            placeholder="AUB fall orientation"
            onChange={setName}
          />
          <Field
            label="Code"
            value={draft.code}
            placeholder="AUBFALL26"
            onChange={(code) =>
              onDraft({
                ...draft,
                code: code.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              })
            }
          />

          <H>
            <H as="p" className="mb-2 text-sm font-medium text-clay-900">
              Discount type
            </H>
            <H
              className="inline-flex w-full gap-1 rounded-full bg-clay-100 p-1.5 shadow-neu-in"
              role="radiogroup"
              aria-label="Discount type"
            >
              <TypeTab
                selected={draft.kind === "percent"}
                label="Percent"
                onSelect={() => onDraft({ ...draft, kind: "percent" })}
              />
              <TypeTab
                selected={draft.kind === "amount"}
                label="USD amount"
                onSelect={() => onDraft({ ...draft, kind: "amount" })}
              />
            </H>
          </H>

          <H className="grid grid-cols-2 gap-3">
            <Field
              label={draft.kind === "percent" ? "Percent off" : "USD off"}
              value={draft.value}
              inputMode="decimal"
              onChange={(value) => onDraft({ ...draft, value })}
            />
            <Field
              label="Usage limit"
              value={draft.usageLimit}
              inputMode="numeric"
              onChange={(usageLimit) => onDraft({ ...draft, usageLimit })}
            />
          </H>
          {draft.kind === "amount" ? (
            <H as="p" className="text-[11px] text-clay-500">
              Max {amountCap > 0 ? `$${amountCap}` : "—"} vs in-scope pack price
            </H>
          ) : null}

          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateField
              label="Starts"
              value={draft.startsAt}
              onChange={(startsAt) => onDraft({ ...draft, startsAt })}
            />
            <DateField
              label="Expires"
              value={draft.expiresAt}
              onChange={(expiresAt) => onDraft({ ...draft, expiresAt })}
            />
          </H>

          <H>
            <H as="p" className="mb-2 text-sm font-medium text-clay-900">
              Applies to
            </H>
            <H
              className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
              role="radiogroup"
              aria-label="Package scope"
            >
              {PACKS.map((id) => (
                <TypeTab
                  key={id}
                  selected={draft.appliesTo === id}
                  label={id === "all" ? "All packs" : packLabel(id)}
                  onSelect={() => onDraft({ ...draft, appliesTo: id })}
                />
              ))}
            </H>
          </H>
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton
            tone="moss"
            disabled={!canSubmit}
            onClick={onConfirm}
          >
            {busy ? "Issuing…" : "Issue code"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

function TypeTab({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <H
      as="button"
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full px-3 py-2 text-xs font-medium transition-shadow duration-press sm:text-sm",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected
          ? "bg-clay-100 text-clay-900 shadow-neu-sm"
          : "bg-transparent text-clay-700",
      ].join(" ")}
    >
      {label}
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
  inputMode?: "decimal" | "numeric";
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

function DateField({
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
        type="date"
        value={value}
        onChange={(event: { target: { value: string } }) =>
          onChange(event.target.value)
        }
        className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm tabular-nums text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      />
    </H>
  );
}
