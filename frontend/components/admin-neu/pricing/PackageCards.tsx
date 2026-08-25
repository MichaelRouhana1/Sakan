import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import {
  awardedCredits,
  bonusCredits,
  formatLbp,
  formatUsd,
  lbpQuote,
  usdPerCredit,
  type CreditPackage,
  type PricingEngine,
} from "./types";

type Props = {
  packages: CreditPackage[];
  engine: PricingEngine;
  onPackage: (id: CreditPackage["id"], patch: Partial<CreditPackage>) => void;
};

export function PackageCards({ packages, engine, onPackage }: Props) {
  return (
    <H className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {packages.map((pack) => (
        <PackageCard
          key={pack.id}
          pack={pack}
          engine={engine}
          onPatch={(patch) => onPackage(pack.id, patch)}
        />
      ))}
    </H>
  );
}

function PackageCard({
  pack,
  engine,
  onPatch,
}: {
  pack: CreditPackage;
  engine: PricingEngine;
  onPatch: (patch: Partial<CreditPackage>) => void;
}) {
  const awarded = awardedCredits(pack);
  const unit = usdPerCredit(pack);
  const lbp = lbpQuote(pack.priceUsd, engine);
  const list =
    pack.basePostCredits * engine.postCreditUsd +
    pack.baseBoostCredits * engine.boostCreditUsd;
  const off = list > 0 ? Math.max(0, (1 - pack.priceUsd / list) * 100) : 0;

  return (
    <NeuSurface className="flex flex-col p-5">
      <H className="flex items-start justify-between gap-3">
        <H>
          <H as="p" className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-moss">
            {pack.catalogType === "starter"
              ? "Starter SKU"
              : pack.catalogType === "bundle_5"
                ? "Volume SKU"
                : "Broker SKU"}
          </H>
          <H as="h3" className="mt-1 font-display text-2xl font-semibold text-clay-900">
            {pack.name}
          </H>
        </H>
        {pack.featured ? (
          <H
            as="span"
            className="rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold text-moss shadow-neu-in-sm"
          >
            Most bought
          </H>
        ) : null}
      </H>

      <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
        {pack.tagline}
      </H>

      <H className="mt-4 rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm">
        <H className="flex items-baseline justify-between gap-2">
          <H as="p" className="font-display text-3xl font-semibold tabular-nums text-clay-900">
            {formatUsd(pack.priceUsd)}
          </H>
          <H as="p" className="text-xs text-clay-700">
            {formatUsd(unit)} / credit
          </H>
        </H>
        <H as="p" className="mt-1 text-xs tabular-nums text-clay-500">
          {formatLbp(lbp)} at the branch
          {off >= 1 ? ` · ${off.toFixed(0)}% vs list` : ""}
        </H>
      </H>

      <H className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="Post credits" value={String(awarded.post)} hint={`${pack.basePostCredits} base`} />
        <Stat label="Boost credits" value={String(awarded.boost)} hint={`${pack.baseBoostCredits} base`} />
      </H>

      <H className="mt-5 space-y-4">
        <PackSlider
          label="Sell price (USD)"
          value={pack.priceUsd}
          min={5}
          max={60}
          step={0.5}
          onChange={(priceUsd) => onPatch({ priceUsd })}
        />
        <PackSlider
          label="Bonus credit ratio"
          value={pack.bonusPct}
          min={0}
          max={50}
          step={1}
          suffix="%"
          hint={
            extraHint(pack) ??
            (pack.bonusPct === 0 ? "No extra credits on this pack" : undefined)
          }
          onChange={(bonusPct) => onPatch({ bonusPct })}
        />
      </H>
    </NeuSurface>
  );
}

function extraHint(pack: CreditPackage): string | null {
  const extraPost = bonusCredits(pack.basePostCredits, pack.bonusPct);
  const extraBoost = bonusCredits(pack.baseBoostCredits, pack.bonusPct);
  if (pack.bonusPct <= 0) return null;
  if (extraPost === 0 && extraBoost === 0) {
    return "Ratio too low to mint a full extra credit";
  }
  const parts = [];
  if (extraPost) parts.push(`+${extraPost} post`);
  if (extraBoost) parts.push(`+${extraBoost} boost`);
  return parts.join(" · ");
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm">
      <H as="p" className="text-[11px] font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-0.5 font-display text-xl font-semibold tabular-nums text-clay-900">
        {value}
      </H>
      <H as="p" className="text-[11px] text-clay-500">
        {hint}
      </H>
    </H>
  );
}

function PackSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  hint?: string;
  onChange: (value: number) => void;
}) {
  function parse(raw: string) {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <H as="label" className="block">
      <H className="mb-1.5 flex items-center justify-between gap-2">
        <H as="span" className="text-sm font-medium text-clay-900">
          {label}
        </H>
        <H as="span" className="text-sm font-semibold tabular-nums text-clay-900">
          {suffix === "%" ? `${value}${suffix}` : `$${value.toFixed(step < 1 ? 1 : 0)}`}
        </H>
      </H>
      <H
        as="input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event: { target: { value: string } }) =>
          parse(event.target.value)
        }
        className="neu-range"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      {hint ? (
        <H as="span" className="mt-1 block text-[11px] text-clay-500">
          {hint}
        </H>
      ) : null}
    </H>
  );
}
