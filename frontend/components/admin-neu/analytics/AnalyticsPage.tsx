import { Download } from "lucide-react-native";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { AnalyticsSwitcher } from "./AnalyticsSwitcher";
import { KpiCards } from "./KpiCards";
import { SecondaryCards } from "./SecondaryCards";
import { TrendChart } from "./TrendChart";
import { TrendsToolbar } from "./TrendsToolbar";
import { useAdminAnalytics } from "./useAdminAnalytics";

export function AnalyticsPage() {
  const state = useAdminAnalytics();

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
            Active User Trends
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Watch renter and poster growth, stickiness, and signup pace. Demo
            series through {state.dataEnd}.
          </H>
        </H>
        <H className="flex flex-col items-start gap-2 sm:items-end">
          <AnalyticsSwitcher />
          <H className="flex flex-wrap items-center gap-2">
            <H
              as="span"
              className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
            >
              Demo data · API-ready
            </H>
            <NeuButton
              tone="moss"
              onClick={state.exportCsv}
              disabled={state.status !== "ready" || state.points.length === 0}
            >
              <Download size={16} strokeWidth={1.75} />
              Export CSV
            </NeuButton>
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
          Loading trends…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load trends
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

          <TrendsToolbar
            range={state.range}
            onRange={state.setRange}
            series={state.series}
            onSeries={state.setSeries}
            customFrom={state.customFrom}
            customTo={state.customTo}
            onCustomFrom={state.setCustomFrom}
            onCustomTo={state.setCustomTo}
            minDate={state.dataStart}
            maxDate={state.dataEnd}
          />

          <TrendChart points={state.points} series={state.series} />

          <SecondaryCards
            points={state.points}
            retention={state.retention}
            series={state.series}
          />
        </>
      ) : null}
    </H>
  );
}
