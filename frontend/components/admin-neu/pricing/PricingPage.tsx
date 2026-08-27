import { Plus, Save } from "lucide-react-native";
import { Link, type Href } from "expo-router";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { PackageCards } from "./PackageCards";
import { PromoActionDialog } from "./PromoActionDialog";
import { PromoGeneratorDialog } from "./PromoGeneratorDialog";
import { PromoTable } from "./PromoTable";
import { PromoToolbar } from "./PromoToolbar";
import { PricingControls } from "./PricingControls";
import { useAdminPricing } from "./useAdminPricing";
import {
  formatLbp,
  formatUsd,
  lbpQuote,
  starterPack,
} from "./types";

export function PricingPage() {
  const state = useAdminPricing();
  const starter = starterPack(state.packages);

  return (
    <H className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Credit economics
          </H>
          <H as="h1" className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Pricing
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Set USD pack prices, the LBP cash quote, bonus credit ratios, and
            seasonal codes. Ledger stays on{" "}
            <Link
              href={"/admin/payments" as Href}
              className="font-medium text-moss underline decoration-moss/40 underline-offset-2"
            >
              Payments
            </Link>
            .
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data · API-ready
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
          Loading pricing…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load pricing
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
          {state.dirty ? (
            <H className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu">
              <H as="p" className="text-sm font-medium text-clay-900">
                Unsaved pricing changes
              </H>
              <H className="flex flex-wrap gap-2">
                <NeuButton
                  inset
                  disabled={state.busy}
                  onClick={state.discardConfig}
                >
                  Discard
                </NeuButton>
                <NeuButton
                  tone="moss"
                  disabled={state.busy}
                  onClick={() => {
                    void state.saveConfig();
                  }}
                >
                  <Save size={16} strokeWidth={1.75} />
                  {state.busy ? "Saving…" : "Save"}
                </NeuButton>
              </H>
            </H>
          ) : null}

          <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Quoted LBP"
              value={formatLbp(
                state.engine.marketLbp * (1 + state.engine.bufferPct / 100),
              )}
              hint="Per USD, with buffer"
            />
            <Kpi
              label="Starter at branch"
              value={formatLbp(lbpQuote(starter?.priceUsd ?? 0, state.engine))}
              hint="Rounded collect"
            />
            <Kpi
              label="Cheapest post / credit"
              value={
                Number.isFinite(state.cheapestPost)
                  ? formatUsd(state.cheapestPost)
                  : "—"
              }
              hint="Post packs, after bonus"
            />
            <Kpi
              label="Live campaigns"
              value={String(state.counts.active)}
              hint={`${state.counts.scheduled} scheduled`}
            />
          </H>

          <PricingControls
            engine={state.engineDraft}
            onEngine={state.patchEngine}
          />

          <H>
            <H as="h2" className="font-display text-lg font-semibold text-clay-900">
              Tiered packages
            </H>
            <H as="p" className="mt-1 mb-4 max-w-2xl text-sm leading-relaxed text-clay-700">
              Bonus ratio adds free credits on top of the base allotment. Price
              stays the USD charge; LBP follows the quote engine. Save to persist.
            </H>
            <PackageCards
              packages={state.packagesDraft}
              engine={state.engineDraft}
              onPackage={state.patchPack}
            />
          </H>

          <H>
            <H className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <H>
                <H as="h2" className="font-display text-lg font-semibold text-clay-900">
                  Promotional campaigns
                </H>
                <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
                  Discount codes on checkout. Pause mid-run, or end early when the
                  season closes.
                </H>
              </H>
              <NeuButton tone="moss" onClick={state.openGenerator}>
                <Plus size={16} strokeWidth={1.75} />
                New promo
              </NeuButton>
            </H>
            <PromoToolbar
              query={state.query}
              onQuery={state.setQuery}
              status={state.filter}
              onStatus={state.setFilter}
              counts={state.counts}
            />
            <H className="mt-4">
              <PromoTable
                promos={state.visible}
                filter={state.filter}
                busy={state.busy}
                onAction={state.requestPromoAction}
              />
            </H>
          </H>
        </>
      ) : null}

      <PromoGeneratorDialog
        open={state.generatorOpen}
        draft={state.draft}
        packages={state.packages}
        busy={state.busy}
        onDraft={state.setDraft}
        onCancel={state.closeGenerator}
        onConfirm={() => {
          void state.issuePromo();
        }}
      />

      <PromoActionDialog
        kind={state.pending?.mode ?? null}
        promo={state.pendingPromo}
        busy={state.busy}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmPending();
        }}
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
      <H as="p" className="mt-1 font-display text-xl font-semibold tabular-nums text-clay-900 md:text-2xl">
        {value}
      </H>
      <H as="p" className="mt-1 text-[11px] text-clay-500">
        {hint}
      </H>
    </NeuSurface>
  );
}
