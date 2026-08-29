import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { AnalyticsSwitcher } from "../analytics/AnalyticsSwitcher";
import { KpiCards } from "../analytics/KpiCards";
import { AbandonedTable } from "./AbandonedTable";
import { ConversionRemindDialog } from "./ConversionRemindDialog";
import { ConversionToolbar } from "./ConversionToolbar";
import { FunnelChart } from "./FunnelChart";
import { useAdminConversion } from "./useAdminConversion";

export function ConversionPage() {
  const state = useAdminConversion();

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Analytics
          </H>
          <H
            as="h1"
            className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Listing Conversion
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Watch posters move through the create-listing wizard. Demo funnel
            through {state.dataEnd}.
          </H>
        </H>
        <H className="flex flex-col items-start gap-2 sm:items-end">
          <AnalyticsSwitcher />
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data · API-ready
          </H>
        </H>
      </H>

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
          Loading conversion…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load conversion
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
          <KpiCards items={state.kpis} />

          <ConversionToolbar
            range={state.range}
            onRange={state.setRange}
            customFrom={state.customFrom}
            customTo={state.customTo}
            onCustomFrom={state.setCustomFrom}
            onCustomTo={state.setCustomTo}
            minDate={state.dataStart}
            maxDate={state.dataEnd}
          />

          <FunnelChart stages={state.stages} />

          <H className="flex flex-col gap-3">
            <H className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <H>
                <H
                  as="p"
                  className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
                >
                  Recover
                </H>
                <H as="h2" className="mt-1 font-display text-xl font-semibold text-clay-900">
                  Abandoned drafts
                </H>
                <H as="p" className="mt-1 text-sm text-clay-700">
                  Posters who started a listing and never published. Nudge the ones
                  still sitting in photos and utilities.
                </H>
              </H>
              <H as="span" className="text-sm tabular-nums text-clay-500">
                {state.tableRows.length} in view
              </H>
            </H>

            <H
              className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
              role="tablist"
              aria-label="Abandoned step filter"
            >
              {state.stepChips.map((chip) => {
                const selected = state.stepFilter === chip.id;
                return (
                  <H
                    key={chip.id}
                    as="button"
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => state.setStepFilter(chip.id)}
                    className={[
                      "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                      selected
                        ? "bg-clay-100 text-clay-900 shadow-press"
                        : "bg-transparent text-clay-700",
                    ].join(" ")}
                  >
                    {chip.label}
                    <H as="span" className="tabular-nums text-clay-500">
                      {chip.count}
                    </H>
                  </H>
                );
              })}
            </H>

            <AbandonedTable
              drafts={state.tableRows}
              nowIso={state.nowIso}
              busy={state.busy}
              onRemind={state.requestRemind}
            />
          </H>
        </>
      ) : null}

      <ConversionRemindDialog
        draft={state.pendingDraft}
        busy={state.busy}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmRemind();
        }}
      />
    </H>
  );
}
