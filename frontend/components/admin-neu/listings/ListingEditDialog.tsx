import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { useLiveLebanonAreas } from "@/constants/areas";
import {
  ELECTRICITY_OPTIONS,
  LISTING_TYPE_OPTIONS,
  WATER_OPTIONS,
  electricityLabel,
  typeLabel,
  waterLabel,
  type AdminListing,
  type ElectricityStatus,
  type ListingEditPatch,
  type WaterStatus,
} from "./types";

type Props = {
  listing: AdminListing | null;
  draft: ListingEditPatch | null;
  onDraft: (draft: ListingEditPatch) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function listingToEditPatch(listing: AdminListing): ListingEditPatch {
  return {
    title: listing.title,
    description: listing.description,
    area: listing.area,
    landmark: listing.landmark,
    monthlyRentUsd: listing.monthlyRentUsd,
    listingType: listing.listingType,
    contactName: listing.contactName,
    contactPhone: listing.contactPhone,
    whatsappNumber: listing.whatsappNumber,
    electricity: listing.electricity,
    water: listing.water,
    wifiIncluded: listing.wifiIncluded,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
  };
}

export function ListingEditDialog({
  listing,
  draft,
  onDraft,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  const liveAreas = useLiveLebanonAreas();

  if (!listing || !draft) return null;

  const canSubmit =
    !busy &&
    draft.title.trim().length >= 3 &&
    draft.area.trim().length >= 2 &&
    liveAreas.includes(draft.area) &&
    draft.description.trim().length >= 3 &&
    draft.contactName.trim().length >= 2 &&
    Number.isFinite(draft.monthlyRentUsd) &&
    draft.monthlyRentUsd > 0 &&
    draft.bedrooms >= 0 &&
    draft.bathrooms > 0;

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
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col p-5 sm:p-6"
        as="section"
      >
        <H as="h2" className="shrink-0 font-display text-lg font-semibold text-clay-900">
          Edit listing details
        </H>
        <H as="p" className="mt-2 shrink-0 text-sm leading-relaxed text-clay-700">
          Mock edit via API-shaped source. Swap listingsSource to hit live admin later.
        </H>

        <H className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <Field
            label="Title"
            value={draft.title}
            onChange={(title) => onDraft({ ...draft, title })}
          />
          <H as="label" className="block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              Description
            </H>
            <H
              as="textarea"
              rows={3}
              value={draft.description}
              onChange={(event: { target: { value: string } }) =>
                onDraft({ ...draft, description: event.target.value })
              }
              className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            />
          </H>
          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <H as="label" className="block">
              <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
                Location
              </H>
              <H
                as="select"
                value={draft.area}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({ ...draft, area: event.target.value })
                }
                className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0"
              >
                {liveAreas.map((area) => (
                  <H as="option" key={area} value={area}>
                    {area}
                  </H>
                ))}
              </H>
            </H>
            <Field
              label="Landmark"
              value={draft.landmark}
              onChange={(landmark) => onDraft({ ...draft, landmark })}
            />
          </H>
          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Monthly rent (USD)"
              value={String(draft.monthlyRentUsd)}
              onChange={(value) =>
                onDraft({ ...draft, monthlyRentUsd: Number(value) || 0 })
              }
            />
            <H as="label" className="block">
              <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
                Listing type
              </H>
              <H
                as="select"
                value={draft.listingType}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({ ...draft, listingType: event.target.value })
                }
                className="w-full rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                {LISTING_TYPE_OPTIONS.map((type) => (
                  <H as="option" key={type} value={type}>
                    {typeLabel(type)}
                  </H>
                ))}
              </H>
            </H>
          </H>
          <Field
            label="Contact name"
            value={draft.contactName}
            onChange={(contactName) => onDraft({ ...draft, contactName })}
          />
          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Phone"
              value={draft.contactPhone}
              onChange={(contactPhone) => onDraft({ ...draft, contactPhone })}
            />
            <Field
              label="WhatsApp"
              value={draft.whatsappNumber}
              onChange={(whatsappNumber) => onDraft({ ...draft, whatsappNumber })}
            />
          </H>
          <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <H as="label" className="block">
              <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
                Electricity
              </H>
              <H
                as="select"
                value={draft.electricity}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({
                    ...draft,
                    electricity: event.target.value as ElectricityStatus,
                  })
                }
                className="w-full rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                {ELECTRICITY_OPTIONS.map((value) => (
                  <H as="option" key={value} value={value}>
                    {electricityLabel(value)}
                  </H>
                ))}
              </H>
            </H>
            <H as="label" className="block">
              <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
                Water
              </H>
              <H
                as="select"
                value={draft.water}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({ ...draft, water: event.target.value as WaterStatus })
                }
                className="w-full rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
              >
                {WATER_OPTIONS.map((value) => (
                  <H as="option" key={value} value={value}>
                    {waterLabel(value)}
                  </H>
                ))}
              </H>
            </H>
          </H>
          <H className="grid grid-cols-3 gap-3">
            <Field
              label="Bedrooms"
              value={String(draft.bedrooms)}
              onChange={(value) =>
                onDraft({ ...draft, bedrooms: Number(value) || 0 })
              }
            />
            <Field
              label="Bathrooms"
              value={String(draft.bathrooms)}
              onChange={(value) =>
                onDraft({ ...draft, bathrooms: Number(value) || 0 })
              }
            />
            <H as="label" className="flex items-end gap-2 pb-2.5 text-sm text-clay-900">
              <H
                as="input"
                type="checkbox"
                checked={draft.wifiIncluded}
                onChange={(event: { target: { checked: boolean } }) =>
                  onDraft({ ...draft, wifiIncluded: event.target.checked })
                }
                className="h-4 w-4 accent-[var(--admin-moss)]"
              />
              Wi‑Fi included
            </H>
          </H>
        </H>

        <H className="mt-5 flex shrink-0 flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {busy ? "Saving…" : "Save details"}
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
