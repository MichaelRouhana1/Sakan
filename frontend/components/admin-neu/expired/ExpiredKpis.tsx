import { Clock, RotateCcw, Trash2, type LucideIcon } from "lucide-react-native";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ADMIN_MUTED } from "../theme";

export type ExpiredKpi = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export function buildExpiredKpis(input: {
  total: number;
  pending: number;
  rate: string;
}): ExpiredKpi[] {
  return [
    {
      id: "total",
      label: "Total expired listings",
      value: String(input.total),
      hint: "Past the 30-day timer",
      icon: Clock,
    },
    {
      id: "pending",
      label: "Pending cleanups",
      value: String(input.pending),
      hint: "Queued for hard delete",
      icon: Trash2,
    },
    {
      id: "rate",
      label: "Reactivation rate",
      value: input.rate,
      hint: "Nudges that led to a renew",
      icon: RotateCcw,
    },
  ];
}

export function ExpiredKpis({ items }: { items: ExpiredKpi[] }) {
  return (
    <H className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Kpi key={item.id} item={item} />
      ))}
    </H>
  );
}

function Kpi({ item }: { item: ExpiredKpi }) {
  const Icon = item.icon;
  return (
    <NeuSurface inset className="px-4 py-4">
      <H className="flex items-start justify-between gap-3">
        <H>
          <H as="p" className="text-xs font-medium text-clay-700">
            {item.label}
          </H>
          <H
            as="p"
            className="mt-1 font-display text-2xl font-semibold tabular-nums text-clay-900"
          >
            {item.value}
          </H>
        </H>
        <H
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-100 shadow-neu-sm"
          aria-hidden
        >
          <Icon size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
        </H>
      </H>
      <H as="p" className="mt-1 text-[11px] text-clay-500">
        {item.hint}
      </H>
    </NeuSurface>
  );
}
