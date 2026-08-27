import { ChevronRight } from "lucide-react-native";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ListingActions } from "./ListingActions";
import { ListingStatusPill } from "./ListingStatusPill";
import {
  formatDay,
  posterName,
  type AdminListing,
  type ListingActionKind,
} from "./types";

/** Must stay in source so `npm run admin:css` emits these arbitrary cols. */
const DESKTOP_ROW =
  "grid w-full min-w-0 grid-cols-[2.25rem_minmax(0,15rem)_minmax(0,11rem)_6rem_8.5rem_5.75rem_minmax(10rem,1fr)] items-center justify-start gap-x-3";

type Props = {
  listings: AdminListing[];
  selectedId: string | null;
  selectedIds: Set<string>;
  hasQuery: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  onSelect: (listing: AdminListing) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (listing: AdminListing) => void;
  onAction: (listing: AdminListing, kind: ListingActionKind) => void;
};

export function ListingsTable({
  listings,
  selectedId,
  selectedIds,
  hasQuery,
  page,
  pageCount,
  total,
  onPage,
  onSelect,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onAction,
}: Props) {
  const bp = useBreakpoint();
  const compact = bp !== "desktop";
  const allSelected =
    listings.length > 0 && listings.every((row) => selectedIds.has(row.id));

  if (listings.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          {hasQuery ? "No matches" : "Queue empty"}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          {hasQuery
            ? "Try another title, area, or poster — or clear search."
            : "Nothing in this queue right now. Switch All, Active, Flagged, Draft, Archived, or Removed."}
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="flex flex-col gap-3">
        <H className="flex items-center justify-between px-1">
          <H as="label" className="flex items-center gap-2 text-sm text-clay-700">
            <H
              as="input"
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="h-4 w-4 accent-[var(--admin-moss)]"
            />
            Select page
          </H>
          <H as="span" className="text-xs text-clay-500">
            {total} total
          </H>
        </H>
        <H className="grid gap-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              selected={selectedId === listing.id}
              checked={selectedIds.has(listing.id)}
              onToggle={() => onToggleSelect(listing.id)}
              onSelect={() => onSelect(listing)}
              onEdit={() => onEdit(listing)}
              onAction={(kind) => onAction(listing, kind)}
            />
          ))}
        </H>
        <Pager
          page={page}
          pageCount={pageCount}
          shown={listings.length}
          total={total}
          onPage={onPage}
        />
      </H>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      <NeuSurface inset className="min-w-0 overflow-hidden">
        <H
          className={[
            DESKTOP_ROW,
            "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
          ].join(" ")}
        >
          <H as="span" className="flex items-center">
            <H
              as="input"
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              aria-label="Select all on page"
              className="h-4 w-4 accent-[var(--admin-moss)]"
            />
          </H>
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
            <H
              className="flex items-center"
              onClick={(event: { stopPropagation: () => void }) =>
                event.stopPropagation()
              }
            >
              <H
                as="input"
                type="checkbox"
                checked={selectedIds.has(listing.id)}
                onChange={() => onToggleSelect(listing.id)}
                aria-label={`Select ${listing.title}`}
                className="h-4 w-4 accent-[var(--admin-moss)]"
              />
            </H>
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
            <H as="span" className="truncate text-sm text-clay-700">
              {listing.area}
            </H>
            <ListingStatusPill listing={listing} />
            <H as="span" className="whitespace-nowrap text-sm tabular-nums text-clay-700">
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
      </NeuSurface>

      <Pager
        page={page}
        pageCount={pageCount}
        shown={listings.length}
        total={total}
        onPage={onPage}
      />
    </H>
  );
}

function Pager({
  page,
  pageCount,
  shown,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  shown: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <H className="flex flex-wrap items-center justify-between gap-3 px-1">
      <H as="p" className="text-xs text-clay-700">
        On page {shown} of {total}
      </H>
      <H className="flex items-center gap-2">
        <NeuButton
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 text-xs"
        >
          Prev
        </NeuButton>
        <H as="span" className="text-xs font-medium text-clay-700">
          Page {page} / {pageCount}
        </H>
        <NeuButton
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 text-xs"
        >
          Next
        </NeuButton>
      </H>
    </H>
  );
}

function ListingCard({
  listing,
  selected,
  checked,
  onToggle,
  onSelect,
  onEdit,
  onAction,
}: {
  listing: AdminListing;
  selected: boolean;
  checked: boolean;
  onToggle: () => void;
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
          <H
            onClick={(event: { stopPropagation: () => void }) =>
              event.stopPropagation()
            }
          >
            <H
              as="input"
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              aria-label={`Select ${listing.title}`}
              className="h-4 w-4 accent-[var(--admin-moss)]"
            />
          </H>
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
