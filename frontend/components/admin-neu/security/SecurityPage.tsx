import { Link } from "expo-router";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { AuditTable } from "./AuditTable";
import { AuditToolbar } from "./AuditToolbar";
import { EndpointChart } from "./EndpointChart";
import { RbacPanel } from "./RbacPanel";
import { SecurityKpis } from "./SecurityKpis";
import { SpikeAlerts } from "./SpikeAlerts";
import { useAdminSecurity } from "./useAdminSecurity";

export function SecurityPage() {
  const state = useAdminSecurity();

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            System security
          </H>
          <H
            as="h1"
            className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Audit & access
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Demo admin ledger and role matrix. Traffic spikes are invented
            samples. Account bans live on{" "}
            <Link
              href="/admin/users"
              className="font-medium text-moss underline-offset-2 hover:underline"
            >
              Users
            </Link>
            .
          </H>
        </H>
        <H className="flex flex-col items-start gap-2 sm:items-end">
          <H
            className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
            role="tablist"
            aria-label="Security section"
          >
            <SectionTab
              selected={state.section === "monitor"}
              onSelect={() => state.requestSection("monitor")}
              label="Monitor & ledger"
            />
            <SectionTab
              selected={state.section === "access"}
              onSelect={() => state.requestSection("access")}
              label="Access control"
              badge={state.dirty ? "Unsaved" : undefined}
            />
          </H>
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo · API-ready (audit → GET /api/admin/audit)
          </H>
        </H>
      </H>

      {state.flash ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className={[
            "rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm shadow-neu-in-sm",
            state.flashTone === "ember" ? "text-ember" : "text-moss",
          ].join(" ")}
        >
          {state.flash}
        </H>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading security…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load security
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
        <>
          <SecurityKpis items={state.kpis} />

          {state.section === "monitor" ? (
            <>
              <H className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
                <EndpointChart
                  points={state.traffic}
                  range={state.chartRange}
                  onRange={state.setChartRange}
                />
                <SpikeAlerts
                  alerts={state.alerts}
                  rangeLabel={state.chartRangeLabel}
                  busy={state.busy}
                  onAcknowledge={state.ackSpike}
                />
              </H>

              <H className="flex flex-col gap-3">
                <H className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <H>
                    <H
                      as="p"
                      className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
                    >
                      Session ledger
                    </H>
                    <H
                      as="h2"
                      className="mt-1 font-display text-xl font-semibold text-clay-900"
                    >
                      Admin action log
                    </H>
                    <H as="p" className="mt-1 text-sm text-clay-700">
                      Demo rows shaped like future audit API. Filter before
                      export. Log 24h is rolling wall-clock.
                    </H>
                  </H>
                  <H as="span" className="text-sm tabular-nums text-clay-500">
                    {state.visible.length} in view
                  </H>
                </H>

                <AuditToolbar
                  query={state.query}
                  onQuery={state.setQuery}
                  category={state.category}
                  onCategory={state.setCategory}
                  categoryCounts={state.categoryCounts}
                  role={state.roleFilter}
                  onRole={state.setRoleFilter}
                  roleCounts={state.roleCounts}
                  range={state.logRange}
                  onRange={state.setLogRange}
                  customFrom={state.customFrom}
                  customTo={state.customTo}
                  onCustomFrom={state.setCustomFrom}
                  onCustomTo={state.setCustomTo}
                  minDate={state.minDate}
                  maxDate={state.maxDate}
                  onExport={() => {
                    void state.exportLogs();
                  }}
                  exportDisabled={state.visible.length === 0 || state.busy}
                />

                <AuditTable events={state.visible} />
              </H>
            </>
          ) : (
            <RbacPanel
              matrix={state.matrix}
              dirty={state.dirty}
              busy={state.busy}
              onToggle={state.togglePermission}
              onSave={() => {
                void state.saveMatrix();
              }}
              onReset={state.resetMatrix}
            />
          )}
        </>
      ) : null}

      {state.leaveConfirmOpen ? (
        <H className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <H
            as="button"
            type="button"
            aria-label="Dismiss"
            className="admin-scrim absolute inset-0 cursor-pointer border-0"
            onClick={state.cancelLeaveAccess}
          />
          <NeuSurface className="relative w-full max-w-md p-5 sm:p-6" as="section">
            <H as="h2" className="font-display text-lg font-semibold text-clay-900">
              Discard RBAC edits?
            </H>
            <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
              Unsaved permission changes will be lost. Matrix is demo-only and
              does not gate other desks.
            </H>
            <H className="mt-5 flex flex-wrap justify-end gap-2">
              <NeuButton onClick={state.cancelLeaveAccess}>Stay</NeuButton>
              <NeuButton tone="ochre" onClick={state.confirmLeaveAccess}>
                Discard & leave
              </NeuButton>
            </H>
          </NeuSurface>
        </H>
      ) : null}
    </H>
  );
}

function SectionTab({
  selected,
  onSelect,
  label,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <H
      as="button"
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={[
        "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected
          ? "bg-clay-100 text-clay-900 shadow-press"
          : "bg-transparent text-clay-700",
      ].join(" ")}
    >
      {label}
      {badge ? (
        <H
          as="span"
          className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold text-ochre shadow-neu-in-sm"
        >
          {badge}
        </H>
      ) : null}
    </H>
  );
}
