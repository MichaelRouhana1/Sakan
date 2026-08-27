import {
  Bell,
  Clock,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
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
  recent: number;
  pending: number;
  nudged: number;
  renewedSession: number;
  onPage: number;
}): ExpiredKpi[] {
  return [
    {
      id: "total",
      label: "Total",
      value: String(input.total),
      hint: "In expired ops store",
      icon: Clock,
    },
    {
      id: "recent",
      label: "Recently expired",
      value: String(input.recent),
      hint: "Still rescuable",
      icon: Clock,
    },
    {
      id: "pending",
      label: "Pending purge",
      value: String(input.pending),
      hint: "Queued for hard delete",
      icon: Trash2,
    },
    {
      id: "nudged",
      label: "Nudged",
      value: String(input.nudged),
      hint: "At least one renew nudge",
      icon: Bell,
    },
    {
      id: "renewed",
      label: "Renewed (session)",
      value: String(input.renewedSession),
      hint: "Marked renewed this session",
      icon: RotateCcw,
    },
    {
      id: "page",
      label: "On page",
      value: String(input.onPage),
      hint: "After filters",
      icon: Clock,
    },
  ];
}

export function ExpiredKpis({ items }: { items: ExpiredKpi[] }) {
  return (
    <H className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
