import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ListingActionDialog } from "./ListingActionDialog";
import { ListingDetailDrawer } from "./ListingDetailDrawer";
import {
  ListingEditDialog,
  listingToEditPatch,
} from "./ListingEditDialog";
import { ListingsTable } from "./ListingsTable";
import { ListingsToolbar } from "./ListingsToolbar";
import { getAdminListing } from "./listingsSource";
import { useAdminListings } from "./useAdminListings";
import { listingQueue, type ListingEditPatch } from "./types";

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

export function ListingsPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const state = useAdminListings();
  const [draft, setDraft] = useState<ListingEditPatch | null>(null);

  useEffect(() => {
    const listingId = firstParam(params.id);
    if (!listingId) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await getAdminListing(listingId);
        if (cancelled) return;
        state.setQueue(listingQueue(row));
        state.setQuery("");
        state.setSelectedId(row.id);
      } catch {
        // deep-link miss
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once per id
  }, [params.id]);

  useEffect(() => {
    if (state.editing) {
      setDraft(listingToEditPatch(state.editing));
    } else {
      setDraft(null);
    }
  }, [state.editing]);

  useEffect(() => {
    if (!state.flash) return;
    const timer = window.setTimeout(() => state.clearFlash(), 4000);
    return () => window.clearTimeout(timer);
  }, [state.flash, state.clearFlash]);

  const pendingKind = state.pending?.kind ?? null;
  const bulkCount =
    state.pending?.mode === "bulk" ? state.pending.listingIds.length : undefined;

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Listings
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Review property posts. Check photos, dismiss bad flags, archive or take
            down rule breaks. Past-due renew work lives on Expired.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data · API-ready
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <Kpi label="Total" value={String(state.counts.all)} />
        <Kpi label="Active" value={String(state.counts.active)} />
        <Kpi label="Flagged" value={String(state.counts.flagged)} />
        <Kpi label="Draft" value={String(state.counts.draft)} />
        <Kpi label="Archived" value={String(state.counts.archived)} />
        <Kpi label="Removed" value={String(state.counts.removed)} />
        <Kpi label="On page" value={String(state.items.length)} />
      </H>

      <ListingsToolbar
        query={state.query}
        onQuery={state.setQuery}
        queue={state.queue}
        onQueue={state.setQueue}
        counts={state.counts}
        sort={state.sort}
        onSort={state.setSort}
        pageSize={state.pageSize}
        onPageSize={state.setPageSize}
      />

      {state.flash ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {state.flash}
        </H>
      ) : null}

      {state.selectedIds.size > 0 ? (
        <NeuSurface className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <H as="p" className="text-sm font-medium text-clay-900">
            {state.selectedIds.size} selected
          </H>
          <H className="flex flex-wrap gap-2">
            <NeuButton
              tone="ochre"
              className="text-xs"
              onClick={() => state.requestBulk("archive")}
            >
              Archive
            </NeuButton>
            <NeuButton
              tone="ember"
              className="text-xs"
              onClick={() => state.requestBulk("remove")}
            >
              Take down
            </NeuButton>
            <NeuButton
              className="text-xs"
              onClick={() => state.requestBulk("dismiss_reports")}
            >
              Dismiss flags
            </NeuButton>
          </H>
        </NeuSurface>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading listings…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load listings
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            {state.errorMessage ?? "Unknown error"}
          </H>
          <H className="mt-4 flex justify-center">
            <NeuButton tone="moss" onClick={state.retry}>
              Retry
            </NeuButton>
          </H>
        </NeuSurface>
      ) : null}

      {state.status === "ready" ? (
        <ListingsTable
          listings={state.items}
          selectedId={state.selectedId}
          selectedIds={state.selectedIds}
          hasQuery={state.hasQuery}
          page={state.page}
          pageCount={state.pageCount}
          total={state.total}
          onPage={state.setPage}
          onSelect={(listing) => state.setSelectedId(listing.id)}
          onToggleSelect={state.toggleSelect}
          onToggleSelectAll={state.toggleSelectAllVisible}
          onEdit={state.openEdit}
          onAction={state.requestAction}
        />
      ) : null}

      <ListingDetailDrawer
        listing={state.selected}
        busy={state.busy}
        onClose={() => state.setSelectedId(null)}
        onEdit={() => {
          if (state.selected) state.openEdit(state.selected);
        }}
        onAction={(kind) => {
          if (!state.selected) return;
          state.requestAction(state.selected, kind);
        }}
        onTogglePhotoFlag={(photoId, flagged) => {
          if (!state.selected) return;
          void state.togglePhotoFlag(state.selected.id, photoId, flagged);
        }}
      />

      <ListingActionDialog
        kind={pendingKind}
        title={state.pendingListing?.title ?? ""}
        bulkCount={bulkCount}
        note={state.note}
        onNote={state.setNote}
        onCancel={state.cancelPending}
        onConfirm={() => void state.confirmPending()}
        busy={state.busy}
      />

      <ListingEditDialog
        listing={state.editing}
        draft={draft}
        onDraft={setDraft}
        onCancel={state.closeEdit}
        onConfirm={() => {
          if (!draft) return;
          void state.confirmEdit(draft);
        }}
        busy={state.busy}
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
