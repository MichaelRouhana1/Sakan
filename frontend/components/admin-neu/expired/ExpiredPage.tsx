import { useEffect, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ExpiredActionDialog } from "./ExpiredActionDialog";
import { ExpiredDetailDrawer } from "./ExpiredDetailDrawer";
import { ExpiredKpis, buildExpiredKpis } from "./ExpiredKpis";
import { ExpiredTable } from "./ExpiredTable";
import { ExpiredToolbar } from "./ExpiredToolbar";
import { useAdminExpired } from "./useAdminExpired";

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

export function ExpiredPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const state = useAdminExpired();

  useEffect(() => {
    const deepId = firstParam(params.id);
    if (!deepId) return;
    state.setQueue("all");
    state.setQuery("");
    state.setSelectedId(deepId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once per param
  }, [params.id]);

  const kpis = useMemo(
    () =>
      buildExpiredKpis({
        total: state.counts.all,
        recent: state.counts.recent,
        pending: state.counts.pending_deletion,
        nudged: state.nudgedCount,
        renewedSession: state.renewedSession,
        onPage: state.items.length,
      }),
    [
      state.counts.all,
      state.counts.recent,
      state.counts.pending_deletion,
      state.nudgedCount,
      state.renewedSession,
      state.items.length,
    ],
  );

  const pendingKind = state.pending?.kind ?? null;
  const bulkCount =
    state.pending?.mode === "bulk" ? state.pending.assetIds.length : undefined;

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Ops
          </H>
          <H
            as="h1"
            className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Expired Assets
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Track listings past the 30-day timer. Nudge posters to renew, archive,
            or purge dead inventory.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data · API-ready
        </H>
      </H>

      <ExpiredKpis items={kpis} />

      <ExpiredToolbar
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
              tone="moss"
              className="text-xs"
              onClick={() => state.requestBulk("nudge")}
            >
              Nudge
            </NeuButton>
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
              onClick={() => state.requestBulk("queue_delete")}
            >
              Queue for deletion
            </NeuButton>
            <NeuButton
              tone="ember"
              className="text-xs"
              onClick={() => state.requestBulk("purge")}
            >
              Purge
            </NeuButton>
          </H>
        </NeuSurface>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading expired assets…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load expired assets
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
        <ExpiredTable
          assets={state.items}
          queue={state.queue}
          selectedId={state.selectedId}
          selectedIds={state.selectedIds}
          highlightId={firstParam(params.id)}
          hasQuery={state.hasQuery}
          page={state.page}
          pageCount={state.pageCount}
          total={state.total}
          onPage={state.setPage}
          onSelect={(asset) => state.setSelectedId(asset.id)}
          onToggleSelect={state.toggleSelect}
          onToggleSelectAll={state.toggleSelectAllVisible}
          onAction={state.requestAction}
        />
      ) : null}

      <ExpiredDetailDrawer
        asset={state.selected}
        onClose={() => state.setSelectedId(null)}
        onAction={(kind) => {
          if (!state.selected) return;
          state.requestAction(state.selected, kind);
        }}
      />

      <ExpiredActionDialog
        kind={pendingKind}
        asset={state.pendingAsset}
        bulkCount={bulkCount}
        note={state.note}
        onNote={state.setNote}
        onCancel={state.cancelPending}
        onConfirm={() => void state.confirmPending()}
        busy={state.busy}
      />
    </H>
  );
}
