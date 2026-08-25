import {
  Activity,
  KeyRound,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ADMIN_MUTED } from "../theme";

export type SecurityKpi = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "moss" | "ember" | "ochre";
};

export function SecurityKpis({ items }: { items: SecurityKpi[] }) {
  return (
    <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Kpi key={item.id} item={item} />
      ))}
    </H>
  );
}

function Kpi({ item }: { item: SecurityKpi }) {
  const Icon = item.icon;
  const valueTone =
    item.tone === "ember"
      ? "text-ember"
      : item.tone === "ochre"
        ? "text-ochre"
        : item.tone === "moss"
          ? "text-moss"
          : "text-clay-900";

  return (
    <NeuSurface inset className="px-4 py-4">
      <H className="flex items-start justify-between gap-3">
        <H>
          <H as="p" className="text-xs font-medium text-clay-700">
            {item.label}
          </H>
          <H
            as="p"
            className={[
              "mt-1 font-display text-2xl font-semibold tabular-nums",
              valueTone,
            ].join(" ")}
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

export const KPI_ICONS = {
  activity: Activity,
  users: Users,
  alert: ShieldAlert,
  key: KeyRound,
} as const;
