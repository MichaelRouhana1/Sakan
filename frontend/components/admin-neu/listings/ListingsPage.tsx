import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ListingActionDialog } from "./ListingActionDialog";
import { ListingDetailDrawer } from "./ListingDetailDrawer";
import { ListingEditDialog } from "./ListingEditDialog";
import { ListingsTable } from "./ListingsTable";
import { ListingsToolbar } from "./ListingsToolbar";
import { MOCK_LISTINGS } from "./mockListings";
import {
  listingQueue,
  posterName,
  type AdminListing,
  type ListingActionKind,
  type ListingQueue,
  type ListingStatus,
} from "./types";

export function ListingsPage() {
  const [listings, setListings] = useState(MOCK_LISTINGS);
  const [queue, setQueue] = useState<ListingQueue>("active");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    listingId: string;
    kind: ListingActionKind;
  } | null>(null);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    area: "",
    monthlyRentUsd: "",
  });

  const activeCount = listings.filter((row) => listingQueue(row) === "active").length;
  const flaggedCount = listings.filter((row) => listingQueue(row) === "flagged").length;
  const expiredCount = listings.filter((row) => listingQueue(row) === "expired").length;

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return listings.filter((row) => {
      if (listingQueue(row) !== queue) return false;
      if (!needle) return true;
      const hay = `${row.title} ${row.area} ${posterName(row)} ${row.poster.email}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [listings, queue, deferredQuery]);

  const selected = listings.find((row) => row.id === selectedId) ?? null;
  const pendingListing = listings.find((row) => row.id === pending?.listingId) ?? null;
  const editing = listings.find((row) => row.id === editingId) ?? null;

  function openEdit(listing: AdminListing) {
    setEditingId(listing.id);
    setDraft({
      title: listing.title,
      area: listing.area,
      monthlyRentUsd: String(listing.monthlyRentUsd),
    });
  }

  function applyAction(listingId: string, kind: ListingActionKind) {
    setListings((current) =>
      current.map((row) => {
        if (row.id !== listingId) return row;
        const nextStatus: ListingStatus =
          kind === "archive"
            ? "archived"
            : kind === "remove"
              ? "removed"
              : "active";
        return {
          ...row,
          status: nextStatus,
          openReports: kind === "restore" ? row.openReports : [],
        };
      }),
    );
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Listings
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Review property posts. Check photos, archive expired ads, and take
            down listings that break the rules.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data
        </H>
      </H>

      <H className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="In this queue" value={String(visible.length)} />
        <Kpi label="Flagged" value={String(flaggedCount)} />
        <Kpi label="Expired / archived" value={String(expiredCount)} />
      </H>

      <ListingsToolbar
        query={query}
        onQuery={setQuery}
        queue={queue}
        onQueue={setQueue}
        activeCount={activeCount}
        flaggedCount={flaggedCount}
        expiredCount={expiredCount}
      />

      <ListingsTable
        listings={visible}
        selectedId={selectedId}
        onSelect={(listing) => setSelectedId(listing.id)}
        onEdit={openEdit}
        onAction={(listing, kind) => {
          setPending({ listingId: listing.id, kind });
          setNote("");
        }}
      />

      <ListingDetailDrawer
        listing={selected}
        onClose={() => setSelectedId(null)}
        onEdit={() => {
          if (selected) openEdit(selected);
        }}
        onAction={(kind) => {
          if (!selected) return;
          setPending({ listingId: selected.id, kind });
          setNote("");
        }}
      />

      <ListingActionDialog
        kind={pending?.kind ?? null}
        title={pendingListing?.title ?? ""}
        note={note}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          applyAction(pending.listingId, pending.kind);
          setPending(null);
          setNote("");
        }}
      />

      <ListingEditDialog
        listing={editing}
        draft={draft}
        onDraft={setDraft}
        onCancel={() => setEditingId(null)}
        onConfirm={() => {
          if (!editing) return;
          const rent = Number(draft.monthlyRentUsd);
          setListings((current) =>
            current.map((row) =>
              row.id === editing.id
                ? {
                    ...row,
                    title: draft.title.trim(),
                    area: draft.area.trim(),
                    monthlyRentUsd: rent,
                  }
                : row,
            ),
          );
          setEditingId(null);
        }}
      />
    </H>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold text-clay-900">
        {value}
      </H>
    </NeuSurface>
  );
}
