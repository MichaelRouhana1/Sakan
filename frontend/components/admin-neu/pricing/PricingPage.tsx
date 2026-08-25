import { Plus } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { PackageCards } from "./PackageCards";
import { type PromoActionKind } from "./PromoActions";
import { PromoGeneratorDialog } from "./PromoGeneratorDialog";
import { PromoTable } from "./PromoTable";
import { PromoToolbar } from "./PromoToolbar";
import { PricingControls } from "./PricingControls";
import { DEFAULT_ENGINE, MOCK_PACKAGES, MOCK_PROMOS } from "./mockPricing";
import {
  EMPTY_PROMO_DRAFT,
  deriveStatus,
  formatLbp,
  formatUsd,
  lbpQuote,
  usdPerCredit,
  type CreditPackage,
  type PromoCode,
  type PromoDraft,
  type PromoFilter,
} from "./types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDraft(): PromoDraft {
  const start = todayIso();
  const end = new Date();
  end.setDate(end.getDate() + 21);
  return {
    ...EMPTY_PROMO_DRAFT,
    startsAt: start,
    expiresAt: end.toISOString().slice(0, 10),
  };
}

export function PricingPage() {
  const [engine, setEngine] = useState(DEFAULT_ENGINE);
  const [packages, setPackages] = useState(MOCK_PACKAGES);
  const [promos, setPromos] = useState(MOCK_PROMOS);
  const [status, setStatus] = useState<PromoFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PromoDraft>(defaultDraft);
  const [liveNote, setLiveNote] = useState("");

  const counts = useMemo(() => {
    const rows = promos.map((row) => ({
      ...row,
      status: deriveStatus(row),
    }));
    return {
      all: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      scheduled: rows.filter((row) => row.status === "scheduled").length,
      paused: rows.filter((row) => row.status === "paused").length,
      expired: rows.filter((row) => row.status === "expired").length,
    };
  }, [promos]);

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return promos
      .map((row) => ({ ...row, status: deriveStatus(row) }))
      .filter((row) => (status === "all" ? true : row.status === status))
      .filter((row) => {
        if (!needle) return true;
        const hay = `${row.code} ${row.name}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.expiresAt < b.expiresAt ? -1 : 1));
  }, [promos, status, deferredQuery]);

  const cheapest = packages.reduce((best, pack) => {
    const unit = usdPerCredit(pack);
    return unit > 0 && unit < best ? unit : best;
  }, Number.POSITIVE_INFINITY);

  function patchPack(id: CreditPackage["id"], patch: Partial<CreditPackage>) {
    setPackages((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function applyPromo(promo: PromoCode, kind: PromoActionKind) {
    if (kind === "copy") {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        setLiveNote(`Code is ${promo.code}`);
        return;
      }
      void navigator.clipboard.writeText(promo.code).then(
        () => setLiveNote(`Copied ${promo.code}`),
        () => setLiveNote(`Code is ${promo.code}`),
      );
      return;
    }
    setPromos((current) =>
      current.map((row) => {
        if (row.id !== promo.id) return row;
        if (kind === "pause") return { ...row, status: "paused" };
        if (kind === "resume") return { ...row, status: "active" };
        return { ...row, status: "expired", expiresAt: todayIso() };
      }),
    );
    setLiveNote(
      kind === "pause"
        ? `Paused ${promo.code}`
        : kind === "resume"
          ? `Resumed ${promo.code}`
          : `Ended ${promo.code}`,
    );
  }

  function issuePromo() {
    const value = Number(draft.value);
    const cap = Math.floor(Number(draft.usageLimit));
    const next: PromoCode = {
      id: `promo-${Date.now()}`,
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
      kind: draft.kind,
      value,
      usageLimit: cap,
      usageCount: 0,
      startsAt: draft.startsAt,
      expiresAt: draft.expiresAt,
      status: "active",
      appliesTo: draft.appliesTo,
    };
    setPromos((current) => [next, ...current]);
    setOpen(false);
    setDraft(defaultDraft());
    setStatus("all");
    setLiveNote(`Issued ${next.code}`);
  }

  function openGenerator() {
    setDraft(defaultDraft());
    setOpen(true);
  }

  return (
    <H className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-24">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Credit economics
          </H>
          <H as="h1" className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Monetization
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Set USD pack prices, the LBP cash quote, bonus credit ratios, and
            seasonal codes. Ledger stays on Payments.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Quoted LBP"
          value={formatLbp(engine.marketLbp * (1 + engine.bufferPct / 100))}
          hint="Per USD, with buffer"
        />
        <Kpi
          label="Basic at branch"
          value={formatLbp(lbpQuote(packages[0]?.priceUsd ?? 0, engine))}
          hint="Rounded collect"
        />
        <Kpi
          label="Cheapest / credit"
          value={Number.isFinite(cheapest) ? formatUsd(cheapest) : "—"}
          hint="After bonus credits"
        />
        <Kpi
          label="Live campaigns"
          value={String(counts.active)}
          hint={`${counts.scheduled} scheduled`}
        />
      </H>

      {liveNote ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {liveNote}
        </H>
      ) : null}

      <PricingControls engine={engine} onEngine={setEngine} />

      <H>
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          Tiered packages
        </H>
        <H as="p" className="mt-1 mb-4 max-w-2xl text-sm leading-relaxed text-clay-700">
          Bonus ratio adds free credits on top of the base allotment. Price
          stays the USD charge; LBP follows the quote engine.
        </H>
        <PackageCards packages={packages} engine={engine} onPackage={patchPack} />
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
          <NeuButton tone="moss" onClick={openGenerator}>
            <Plus size={16} strokeWidth={1.75} />
            New promo
          </NeuButton>
        </H>
        <PromoToolbar
          query={query}
          onQuery={setQuery}
          status={status}
          onStatus={setStatus}
          counts={counts}
        />
        <H className="mt-4">
          <PromoTable promos={visible} filter={status} onAction={applyPromo} />
        </H>
      </H>

      <H
        as="button"
        type="button"
        onClick={openGenerator}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex cursor-pointer items-center gap-2 rounded-full bg-clay-100 px-4 py-3.5 text-sm font-semibold text-moss shadow-neu transition-shadow duration-press hover:shadow-neu-sm active:shadow-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss md:right-8"
        aria-label="Generate promo code"
      >
        <Plus size={18} strokeWidth={1.75} />
        New promo
      </H>

      <PromoGeneratorDialog
        open={open}
        draft={draft}
        onDraft={setDraft}
        onCancel={() => setOpen(false)}
        onConfirm={issuePromo}
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
