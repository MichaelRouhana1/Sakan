import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import {
  formatLbp,
  formatUsd,
  type LbpRound,
  type PricingEngine,
} from "./types";

type Props = {
  engine: PricingEngine;
  onEngine: (next: PricingEngine) => void;
};

export function PricingControls({ engine, onEngine }: Props) {
  const quoted = engine.marketLbp * (1 + engine.bufferPct / 100);
  const drift =
    engine.officialLbp === 0
      ? 0
      : ((engine.marketLbp - engine.officialLbp) / engine.officialLbp) * 100;

  return (
    <H className="grid items-stretch gap-4 lg:grid-cols-2">
      <NeuSurface className="p-5 sm:p-6">
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          Unit costs
        </H>
        <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
          Fresh USD list price before pack discounts. Whish and OMT still
          settle in cash against the LBP quote.
        </H>

        <H className="mt-5 space-y-5">
          <SliderField
            label="Post credit"
            hint="One extra live listing, 30 days"
            value={engine.postCreditUsd}
            min={5}
            max={25}
            step={0.5}
            display={formatUsd(engine.postCreditUsd)}
            onChange={(postCreditUsd) => onEngine({ ...engine, postCreditUsd })}
          />
          <SliderField
            label="Boost credit"
            hint="Seven-day pin on search"
            value={engine.boostCreditUsd}
            min={1}
            max={12}
            step={0.5}
            display={formatUsd(engine.boostCreditUsd)}
            onChange={(boostCreditUsd) => onEngine({ ...engine, boostCreditUsd })}
          />
        </H>
      </NeuSurface>

      <NeuSurface className="p-5 sm:p-6">
        <H className="flex items-start justify-between gap-3">
          <H>
            <H as="h2" className="font-display text-lg font-semibold text-clay-900">
              LBP cash quote
            </H>
            <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
              Parallel rate plus cushion. Branch slips print the rounded LBP
              total so rate drift does not eat the USD take.
            </H>
          </H>
          <H
            as="span"
            className="shrink-0 rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-moss shadow-neu-in-sm"
          >
            {formatLbp(quoted)} / $1
          </H>
        </H>

        <H className="mt-5 space-y-5">
          <SliderField
            label="Market rate"
            hint="Cash / Whish street rate"
            value={engine.marketLbp}
            min={75000}
            max={110000}
            step={500}
            display={formatLbp(engine.marketLbp)}
            onChange={(marketLbp) => onEngine({ ...engine, marketLbp })}
          />
          <SliderField
            label="Official print"
            hint="BDL reference, not charged"
            value={engine.officialLbp}
            min={75000}
            max={110000}
            step={500}
            display={formatLbp(engine.officialLbp)}
            onChange={(officialLbp) => onEngine({ ...engine, officialLbp })}
          />
          <SliderField
            label="Fluctuation buffer"
            hint={
              Math.abs(drift) < 0.05
                ? "Market matches official print"
                : `${drift > 0 ? "+" : ""}${drift.toFixed(1)}% vs official`
            }
            value={engine.bufferPct}
            min={0}
            max={15}
            step={0.5}
            display={`${engine.bufferPct.toFixed(1)}%`}
            onChange={(bufferPct) => onEngine({ ...engine, bufferPct })}
          />
        </H>

        <H className="mt-5">
          <H as="p" className="mb-2 text-sm font-medium text-clay-900">
            Round LBP collect
          </H>
          <H
            className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
            role="radiogroup"
            aria-label="LBP rounding"
          >
            {ROUND_OPTIONS.map((option) => (
              <H
                as="button"
                type="button"
                key={option.id}
                role="radio"
                aria-checked={engine.roundTo === option.id}
                onClick={() => onEngine({ ...engine, roundTo: option.id })}
                className={[
                  "flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full px-3 py-2 text-xs font-medium transition-shadow duration-press sm:text-sm",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                  engine.roundTo === option.id
                    ? "bg-clay-100 text-clay-900 shadow-neu-sm"
                    : "bg-transparent text-clay-700",
                ].join(" ")}
              >
                {option.label}
              </H>
            ))}
          </H>
        </H>
      </NeuSurface>
    </H>
  );
}

const ROUND_OPTIONS: { id: LbpRound; label: string }[] = [
  { id: 0, label: "Exact" },
  { id: 10000, label: "10k" },
  { id: 50000, label: "50k" },
];

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const slug = label.toLowerCase().replace(/[^a-z]+/g, "-");
  const rangeId = `range-${slug}`;
  const numId = `num-${slug}`;

  function parse(raw: string) {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <H>
      <H className="mb-2 flex items-end justify-between gap-3">
        <H>
          <H as="label" htmlFor={rangeId} className="block text-sm font-medium text-clay-900">
            {label}
          </H>
          <H as="span" className="mt-0.5 block text-[11px] text-clay-500">
            {hint}
          </H>
        </H>
        <H
          as="input"
          id={numId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={`${label} value`}
          onChange={(event: { target: { value: string } }) =>
            parse(event.target.value)
          }
          className="w-[7.5rem] rounded-neu-md border-0 bg-clay-100 px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        />
      </H>
      <H
        as="input"
        id={rangeId}
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
        aria-valuetext={display}
      />
    </H>
  );
}
