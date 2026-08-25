import { ChevronRight } from "lucide-react-native";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuSurface } from "../NeuPrimitives";
import { ListingActions } from "./ListingActions";
import { ListingStatusPill } from "./ListingStatusPill";
import {
  formatDay,
  posterName,
  type AdminListing,
  type ListingActionKind,
} from "./types";

const DESKTOP_ROW =
  "grid grid-cols-[minmax(240px,1.8fr)_minmax(140px,1fr)_110px_120px_110px_minmax(168px,1fr)] items-center gap-3";

type Props = {
  listings: AdminListing[];
  selectedId: string | null;
  onSelect: (listing: AdminListing) => void;
  onEdit: (listing: AdminListing) => void;
  onAction: (listing: AdminListing, kind: ListingActionKind) => void;
};

export function ListingsTable({
  listings,
  selectedId,
  onSelect,
  onEdit,
  onAction,
}: Props) {
  const bp = useBreakpoint();
  const compact = bp === "mobile";

  if (listings.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No listings in this queue
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Try another title, or switch Active, Flagged, and Expired.
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="grid gap-3">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            selected={selectedId === listing.id}
            onSelect={() => onSelect(listing)}
            onEdit={() => onEdit(listing)}
            onAction={(kind) => onAction(listing, kind)}
          />
        ))}
      </H>
    );
  }

  return (
    <NeuSurface inset className="overflow-hidden">
      <H className="overflow-x-auto">
        <H className="min-w-[860px]">
          <H
            className={[
              DESKTOP_ROW,
              "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
            ].join(" ")}
          >
            <H as="span">Title</H>
            <H as="span">Poster</H>
            <H as="span">Location</H>
            <H as="span">Status</H>
            <H as="span">Expiry</H>
            <H as="span" className="text-right">
              Actions
            </H>
          </H>

          {listings.map((listing) => (
            <H
              key={listing.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(listing)}
              onKeyDown={(event: { key: string }) => {
                if (event.key === "Enter" || event.key === " ") onSelect(listing);
              }}
              className={[
                DESKTOP_ROW,
                "cursor-pointer border-t border-clay-200/80 px-5 py-3.5 transition-colors duration-press",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss",
                selectedId === listing.id ? "bg-moss-soft/40" : "hover:bg-clay-50/60",
              ].join(" ")}
            >
              <H className="flex min-w-0 items-center gap-3">
                <Cover listing={listing} />
                <H className="min-w-0">
                  <H as="p" className="truncate font-display text-sm font-semibold">
                    {listing.title}
                  </H>
                  <H as="p" className="truncate text-xs text-clay-700">
                    ${listing.monthlyRentUsd}/mo
                  </H>
                </H>
              </H>
              <H className="min-w-0">
                <H as="p" className="truncate text-sm font-medium">
                  {posterName(listing)}
                </H>
                <H as="p" className="truncate text-xs text-clay-700">
                  {listing.poster.email}
                </H>
              </H>
              <H as="span" className="text-sm text-clay-700">
                {listing.area}
              </H>
              <ListingStatusPill listing={listing} />
              <H as="span" className="text-sm text-clay-700">
                {formatDay(listing.expiresAt)}
              </H>
              <H className="flex justify-end">
                <ListingActions
                  compact
                  listing={listing}
                  onEdit={() => onEdit(listing)}
                  onAction={(kind) => onAction(listing, kind)}
                />
              </H>
            </H>
          ))}
        </H>
      </H>
    </NeuSurface>
  );
}

function ListingCard({
  listing,
  selected,
  onSelect,
  onEdit,
  onAction,
}: {
  listing: AdminListing;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onAction: (kind: ListingActionKind) => void;
}) {
  return (
    <H
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event: { key: string }) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      className={[
        "w-full cursor-pointer rounded-neu bg-clay-100 p-4 text-left shadow-neu-sm transition-shadow duration-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected ? "shadow-press" : "",
      ].join(" ")}
    >
      <H className="flex items-start justify-between gap-3">
        <H className="flex min-w-0 items-center gap-3">
          <Cover listing={listing} />
          <H className="min-w-0">
            <H as="p" className="truncate font-display font-semibold">
              {listing.title}
            </H>
            <H as="p" className="truncate text-xs text-clay-700">
              {posterName(listing)} · {listing.area}
            </H>
          </H>
        </H>
        <ChevronRight size={16} strokeWidth={1.75} color={ADMIN_MUTED} />
      </H>
      <H className="mt-3 flex flex-wrap items-center gap-2">
        <ListingStatusPill listing={listing} />
        <H as="span" className="text-xs text-clay-700">
          Expires {formatDay(listing.expiresAt)}
        </H>
      </H>
      <H className="mt-3">
        <ListingActions
          compact
          listing={listing}
          onEdit={onEdit}
          onAction={onAction}
        />
      </H>
    </H>
  );
}

function Cover({ listing }: { listing: AdminListing }) {
  const cover = listing.photos[0];
  return (
    <H
      className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm"
      aria-hidden
    >
      {cover ? (
        <H
          as="img"
          src={cover.url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : null}
    </H>
  );
}
