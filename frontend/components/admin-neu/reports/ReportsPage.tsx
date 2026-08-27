import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ReportActionDialog } from "./ReportActionDialog";
import { ReportDetailPane } from "./ReportDetailPane";
import { ReportsInbox } from "./ReportsInbox";
import { ReportsToolbar } from "./ReportsToolbar";
import { findReportByListing, getAdminReport } from "./reportsSource";
import { useAdminReports } from "./useAdminReports";

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

export function ReportsPage() {
  const params = useLocalSearchParams<{
    listing?: string | string[];
    id?: string | string[];
  }>();
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const state = useAdminReports();

  useEffect(() => {
    const reportId = firstParam(params.id);
    const listingId = firstParam(params.listing);
    if (!reportId && !listingId) return;

    let cancelled = false;
    void (async () => {
      try {
        if (reportId) {
          const row = await getAdminReport(reportId);
          if (cancelled) return;
          state.setQueue("all");
          state.setQuery("");
          state.setSelectedId(row.id);
          return;
        }
        if (listingId) {
          const row = await findReportByListing(listingId);
          if (cancelled || !row) return;
          state.setQueue("all");
          state.setQuery(row.listing.title);
          state.setSelectedId(row.id);
        }
      } catch {
        // deep-link miss — ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once per param
  }, [params.id, params.listing]);

  const pendingKind =
    state.pending?.mode === "single" ? state.pending.kind : null;
  const bulkCount =
    state.pending?.mode === "bulk" ? state.pending.reportIds.length : undefined;
  const bulkKind =
    state.pending?.mode === "bulk" ? state.pending.kind : null;

  const showDetail = compact && state.selected;
  const showInbox = !showDetail;

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Moderation Hub
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Triage renter reports with the listing still on screen. Dismiss noise,
            take down fakes, or warn the poster.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data · API-ready
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Open tickets" value={String(state.openCount)} />
        <Kpi label="Pending" value={String(state.counts.pending)} />
        <Kpi label="In review" value={String(state.counts.in_review)} />
        <Kpi label="Resolved" value={String(state.counts.resolved)} />
      </H>

      <ReportsToolbar
        query={state.query}
        onQuery={state.setQuery}
        queue={state.queue}
        onQueue={(next) => {
          state.setQueue(next);
          state.setSelectedId(null);
        }}
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
              onClick={() => state.requestBulk("claim")}
            >
              Claim
            </NeuButton>
            <NeuButton
              className="text-xs"
              onClick={() => state.requestBulk("dismiss")}
            >
              Dismiss
            </NeuButton>
            <NeuButton
              tone="ember"
              className="text-xs"
              onClick={() => state.requestBulk("remove")}
            >
              Take down
            </NeuButton>
          </H>
        </NeuSurface>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading reports…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load reports
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

      {state.status === "ready" && compact ? (
        showDetail && state.selected ? (
          <ReportDetailPane
            report={state.selected}
            related={state.related}
            showBack
            onBack={() => state.setSelectedId(null)}
            onAction={(kind) => state.requestAction(state.selected!, kind)}
            onOpenRelated={(item) => {
              state.setQueue(item.queue);
              state.setSelectedId(item.id);
            }}
          />
        ) : showInbox ? (
          <ReportsInbox
            reports={state.items}
            queue={state.queue}
            selectedId={state.selectedId}
            selectedIds={state.selectedIds}
            hasQuery={state.hasQuery}
            page={state.page}
            pageCount={state.pageCount}
            total={state.total}
            onPage={state.setPage}
            onSelect={(report) => state.setSelectedId(report.id)}
            onToggleSelect={state.toggleSelect}
            onToggleSelectAll={state.toggleSelectAllVisible}
            onAction={state.requestAction}
          />
        ) : null
      ) : null}

      {state.status === "ready" && !compact ? (
        <H className="grid items-start gap-4 lg:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.08fr)]">
          <ReportsInbox
            reports={state.items}
            queue={state.queue}
            selectedId={
              state.items.some((row) => row.id === state.selectedId)
                ? state.selectedId
                : null
            }
            selectedIds={state.selectedIds}
            hasQuery={state.hasQuery}
            page={state.page}
            pageCount={state.pageCount}
            total={state.total}
            onPage={state.setPage}
            onSelect={(report) => state.setSelectedId(report.id)}
            onToggleSelect={state.toggleSelect}
            onToggleSelectAll={state.toggleSelectAllVisible}
            onAction={state.requestAction}
          />
          <H className="lg:sticky lg:top-6">
            <ReportDetailPane
              report={
                state.selected &&
                state.items.some((row) => row.id === state.selected.id)
                  ? state.selected
                  : null
              }
              related={state.related}
              onAction={(kind) => {
                if (!state.selected) return;
                if (!state.items.some((row) => row.id === state.selected!.id)) {
                  return;
                }
                state.requestAction(state.selected, kind);
              }}
              onOpenRelated={(item) => {
                state.setQueue(item.queue);
                state.setSelectedId(item.id);
              }}
            />
          </H>
        </H>
      ) : null}

      <ReportActionDialog
        kind={pendingKind}
        report={state.pendingReport}
        note={state.note}
        onNote={state.setNote}
        onCancel={state.cancelPending}
        onConfirm={state.confirmPending}
        busy={state.busy}
        bulkCount={
          bulkKind === "dismiss" || bulkKind === "remove"
            ? bulkCount
            : undefined
        }
        bulkKind={
          bulkKind === "dismiss" || bulkKind === "remove" ? bulkKind : null
        }
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
