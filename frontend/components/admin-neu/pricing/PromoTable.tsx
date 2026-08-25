import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { PromoActions, type PromoActionKind } from "./PromoActions";
import { PromoCodeChip, PromoStatusPill } from "./PromoPills";
import {
  appliesLabel,
  discountLabel,
  formatDay,
  statusLabel,
  usageRatio,
  type PromoCode,
  type PromoFilter,
} from "./types";

const DESKTOP_ROW =
  "grid grid-cols-[minmax(180px,1.4fr)_minmax(150px,1.1fr)_100px_120px_110px_minmax(148px,1fr)] items-center gap-3";

type Props = {
  promos: PromoCode[];
  filter: PromoFilter;
  onAction: (promo: PromoCode, kind: PromoActionKind) => void;
};

export function PromoTable({ promos, filter, onAction }: Props) {
  const bp = useBreakpoint();
  const compact = bp === "mobile";

  if (promos.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No campaigns in {filter === "all" ? "this list" : statusLabel(filter).toLowerCase()}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Generate a seasonal code, or switch Active, Scheduled, and Paused.
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="grid gap-3">
        {promos.map((promo) => (
          <PromoCard
            key={promo.id}
            promo={promo}
            onAction={(kind) => onAction(promo, kind)}
          />
        ))}
      </H>
    );
  }

  return (
    <NeuSurface inset className="overflow-hidden">
      <H className="neu-scroll overflow-x-auto">
        <H className="min-w-[900px]">
          <H
            className={[
              DESKTOP_ROW,
              "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
            ].join(" ")}
          >
            <H as="span">Code</H>
            <H as="span">Campaign</H>
            <H as="span">Discount</H>
            <H as="span">Usage</H>
            <H as="span">Expires</H>
            <H as="span" className="text-right">
              Actions
            </H>
          </H>

          {promos.map((promo) => (
            <H
              key={promo.id}
              className={[DESKTOP_ROW, "border-t border-clay-200/80 px-5 py-3.5"].join(" ")}
            >
              <H className="min-w-0">
                <H className="flex items-center gap-2">
                  <PromoCodeChip code={promo.code} />
                  <PromoStatusPill status={promo.status} />
                </H>
              </H>
              <H className="min-w-0">
                <H as="p" className="truncate text-sm font-medium text-clay-900">
                  {promo.name}
                </H>
                <H as="p" className="truncate text-xs text-clay-700">
                  {appliesLabel(promo.appliesTo)}
                </H>
              </H>
              <H as="span" className="text-sm font-semibold tabular-nums text-clay-900">
                {discountLabel(promo)}
              </H>
              <UsageMeter promo={promo} />
              <H className="min-w-0">
                <H as="p" className="text-sm tabular-nums text-clay-900">
                  {formatDay(promo.expiresAt)}
                </H>
                <H as="p" className="text-[11px] text-clay-500">
                  from {formatDay(promo.startsAt)}
                </H>
              </H>
              <H className="flex justify-end">
                <PromoActions
                  compact
                  promo={promo}
                  onAction={(kind) => onAction(promo, kind)}
                />
              </H>
            </H>
          ))}
        </H>
      </H>
    </NeuSurface>
  );
}

function PromoCard({
  promo,
  onAction,
}: {
  promo: PromoCode;
  onAction: (kind: PromoActionKind) => void;
}) {
  return (
    <NeuSurface className="p-4">
      <H className="flex items-start justify-between gap-3">
        <H className="min-w-0">
          <PromoCodeChip code={promo.code} />
          <H as="p" className="mt-2 font-display text-base font-semibold text-clay-900">
            {promo.name}
          </H>
          <H as="p" className="mt-0.5 text-xs text-clay-700">
            {appliesLabel(promo.appliesTo)} · {discountLabel(promo)}
          </H>
        </H>
        <PromoStatusPill status={promo.status} />
      </H>
      <H className="mt-3">
        <UsageMeter promo={promo} />
      </H>
      <H as="p" className="mt-2 text-xs tabular-nums text-clay-500">
        {formatDay(promo.startsAt)} → {formatDay(promo.expiresAt)}
      </H>
      <H className="mt-3">
        <PromoActions promo={promo} onAction={onAction} />
      </H>
    </NeuSurface>
  );
}

function UsageMeter({ promo }: { promo: PromoCode }) {
  const ratio = usageRatio(promo);
  const full = promo.usageCount >= promo.usageLimit && promo.usageLimit > 0;
  return (
    <H className="min-w-[96px]">
      <H as="p" className="text-sm font-medium tabular-nums text-clay-900">
        {promo.usageCount}
        <H as="span" className="text-clay-500">
          /{promo.usageLimit}
        </H>
      </H>
      <H
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm"
        aria-hidden
      >
        <H
          className={[
            "h-full rounded-full",
            full ? "bg-ember" : "bg-moss",
          ].join(" ")}
          style={{ width: `${Math.max(6, ratio * 100)}%` }}
        />
      </H>
      <H as="span" className="sr-only">
        {promo.usageCount} of {promo.usageLimit} redemptions
      </H>
    </H>
  );
}
