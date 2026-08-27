import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { AlertsToolbar } from "./AlertsToolbar";
import { DomainMappingCard } from "./DomainMappingCard";
import { ScamAlertsFeed } from "./ScamAlertsFeed";
import { TrustActionDialog } from "./TrustActionDialog";
import { TrustSwitcher, useTrustTab } from "./TrustSwitcher";
import { TrustToolbar } from "./TrustToolbar";
import { VerificationDetail } from "./VerificationDetail";
import { VerificationQueue } from "./VerificationQueue";
import { getAdminAlert, getAdminKyc } from "./trustSource";
import { useAdminTrust } from "./useAdminTrust";
import type { TrustActionKind } from "./types";

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

export function TrustPage() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    alert?: string | string[];
    tab?: string | string[];
  }>();
  const tab = useTrustTab();
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const state = useAdminTrust();

  useEffect(() => {
    const kycId = firstParam(params.id);
    if (!kycId) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await getAdminKyc(kycId);
        if (cancelled) return;
        state.setQueue(row.queue);
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
    const alertId = firstParam(params.alert);
    if (!alertId) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await getAdminAlert(alertId);
        if (cancelled) return;
        state.setAlertQuery("");
        state.setAlertSeverity("all");
        state.setAlertStatus("all");
        state.setSelectedAlertId(row.id);
      } catch {
        // deep-link miss
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once per alert
  }, [params.alert]);

  const showKyc = tab === "kyc";
  const showDetail = compact && showKyc && state.selected;
  const showList = showKyc && !showDetail;

  const pendingKind: Exclude<TrustActionKind, "review"> | null =
    state.pending?.mode === "kyc"
      ? state.pending.kind
      : state.pending?.mode === "alert"
        ? state.pending.kind
        : state.pending?.mode === "domain"
          ? "remove_domain"
          : null;

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Safety desk
          </H>
          <H as="h1" className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Trust Center
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Manual poster badge, scam clusters, and a demo student-domain map.
            Not Veriff. Not wired to Clerk.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data · API-ready
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Pending KYC"
          value={String(state.overview.pending)}
          hint="Waiting on staff"
        />
        <Kpi
          label="Open alerts"
          value={String(state.overview.openAlerts)}
          hint="Open + in review"
        />
        <Kpi
          label="Verified posters"
          value={String(state.overview.verifiedBadges)}
          hint="Badge on listings"
        />
        <Kpi
          label="Mapped domains"
          value={String(state.overview.domainCount)}
          hint="Demo student map"
        />
      </H>

      <TrustSwitcher />

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

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading trust…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load trust
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

      {state.status === "ready" && showKyc ? (
        <>
          {showList || !compact ? (
            <TrustToolbar
              query={state.query}
              onQuery={state.setQuery}
              queue={state.queue}
              onQueue={(next) => {
                state.setQueue(next);
                state.setSelectedId(null);
              }}
              counts={state.counts}
              pageSize={state.pageSize}
              onPageSize={state.setPageSize}
            />
          ) : null}

          {compact ? (
            showDetail && state.selected ? (
              <VerificationDetail
                kyc={state.selected}
                showBack
                onBack={() => state.setSelectedId(null)}
                onAction={(kind) => state.requestKycAction(state.selected!, kind)}
              />
            ) : showList ? (
              <VerificationQueue
                cases={state.items}
                queue={state.queue}
                selectedId={state.selectedId}
                hasQuery={state.hasQuery}
                page={state.page}
                pageCount={state.pageCount}
                total={state.total}
                onPage={state.setPage}
                onSelect={(row) => state.setSelectedId(row.id)}
              />
            ) : null
          ) : (
            <H className="grid items-start gap-4 lg:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.08fr)]">
              <VerificationQueue
                cases={state.items}
                queue={state.queue}
                selectedId={
                  state.items.some((row) => row.id === state.selectedId)
                    ? state.selectedId
                    : null
                }
                hasQuery={state.hasQuery}
                page={state.page}
                pageCount={state.pageCount}
                total={state.total}
                onPage={state.setPage}
                onSelect={(row) => state.setSelectedId(row.id)}
              />
              <H className="lg:sticky lg:top-6">
                <VerificationDetail
                  kyc={
                    state.selected &&
                    state.items.some((row) => row.id === state.selected?.id)
                      ? state.selected
                      : null
                  }
                  onAction={(kind) => {
                    const focus = state.selected;
                    if (!focus) return;
                    if (!state.items.some((row) => row.id === focus.id)) return;
                    state.requestKycAction(focus, kind);
                  }}
                />
              </H>
            </H>
          )}
        </>
      ) : null}

      {state.status === "ready" && tab === "alerts" ? (
        <>
          <AlertsToolbar
            query={state.alertQuery}
            onQuery={state.setAlertQuery}
            severity={state.alertSeverity}
            onSeverity={state.setAlertSeverity}
            status={state.alertStatus}
            onStatus={state.setAlertStatus}
            pageSize={state.alertPageSize}
            onPageSize={state.setAlertPageSize}
          />
          <ScamAlertsFeed
            alerts={state.alerts}
            selectedId={state.selectedAlertId}
            hasFilters={state.hasAlertFilters}
            page={state.alertPage}
            pageCount={state.alertPageCount}
            total={state.alertTotal}
            onPage={state.setAlertPage}
            onSelect={(row) => state.setSelectedAlertId(row.id)}
            onAction={state.requestAlertAction}
          />
        </>
      ) : null}

      {state.status === "ready" && tab === "domains" ? (
        <DomainMappingCard
          domains={state.domains}
          busy={state.busy}
          onAdd={state.addDomain}
          onRemove={state.requestDomainRemove}
        />
      ) : null}

      <TrustActionDialog
        kind={pendingKind}
        kyc={state.pending?.mode === "kyc" ? state.pendingKyc : null}
        alert={state.pending?.mode === "alert" ? state.pendingAlert : null}
        domain={state.pending?.mode === "domain" ? state.pendingDomain : null}
        note={state.note}
        onNote={state.setNote}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmPending();
        }}
        busy={state.busy}
      />
    </H>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold tabular-nums text-clay-900">
        {value}
      </H>
      <H as="p" className="mt-1 text-[11px] text-clay-500">
        {hint}
      </H>
    </NeuSurface>
  );
}
