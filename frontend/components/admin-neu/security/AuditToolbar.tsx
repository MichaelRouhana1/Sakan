import { Download, Search } from "lucide-react-native";
import { H } from "../h";
import { NeuButton } from "../NeuPrimitives";
import { ADMIN_MUTED } from "../theme";
import {
  CATEGORY_TABS,
  RANGE_TABS,
  ROLE_FILTER_TABS,
  type ActionCategory,
  type AdminTier,
  type RangeId,
} from "./types";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  category: ActionCategory | "all";
  onCategory: (category: ActionCategory | "all") => void;
  categoryCounts: Record<string, number>;
  role: AdminTier | "all";
  onRole: (role: AdminTier | "all") => void;
  roleCounts: Record<string, number>;
  range: RangeId;
  onRange: (range: RangeId) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
  minDate: string;
  maxDate: string;
  onExport: () => void;
  exportDisabled: boolean;
};

export function AuditToolbar({
  query,
  onQuery,
  category,
  onCategory,
  categoryCounts,
  role,
  onRole,
  roleCounts,
  range,
  onRange,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  minDate,
  maxDate,
  onExport,
  exportDisabled,
}: Props) {
  return (
    <H className="flex flex-col gap-3">
      <H className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <H
          className="flex w-full items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-md"
          as="label"
        >
          <Search size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
          <H as="span" className="sr-only">
            Search audit log
          </H>
          <H
            as="input"
            value={query}
            onChange={(event: { target: { value: string } }) =>
              onQuery(event.target.value)
            }
            placeholder="Search admin, action, target, or IP"
            className="w-full border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
          />
        </H>

        <H className="flex flex-wrap items-center gap-2">
          <H
            className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
            role="tablist"
            aria-label="Log date range"
          >
            {RANGE_TABS.map((tab) => (
              <FilterTab
                key={tab.id}
                selected={range === tab.id}
                onSelect={() => onRange(tab.id)}
                label={tab.label}
              />
            ))}
          </H>
          <NeuButton
            tone="moss"
            onClick={onExport}
            disabled={exportDisabled}
            ariaLabel="Export security logs"
          >
            <Download size={16} strokeWidth={1.75} />
            Export logs
          </NeuButton>
        </H>
      </H>

      {range === "custom" ? (
        <H className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DateField
            label="From"
            value={customFrom}
            min={minDate}
            max={customTo || maxDate}
            onChange={onCustomFrom}
          />
          <DateField
            label="To"
            value={customTo}
            min={customFrom || minDate}
            max={maxDate}
            onChange={onCustomTo}
          />
        </H>
      ) : null}

      <H className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
          role="tablist"
          aria-label="Action category"
        >
          {CATEGORY_TABS.map((tab) => (
            <FilterTab
              key={tab.id}
              selected={category === tab.id}
              onSelect={() => onCategory(tab.id)}
              label={tab.label}
              count={categoryCounts[tab.id] ?? 0}
            />
          ))}
        </H>

        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in xl:w-auto"
          role="tablist"
          aria-label="Admin role filter"
        >
          {ROLE_FILTER_TABS.map((tab) => (
            <FilterTab
              key={tab.id}
              selected={role === tab.id}
              onSelect={() => onRole(tab.id)}
              label={tab.label}
              count={roleCounts[tab.id] ?? 0}
            />
          ))}
        </H>
      </H>
    </H>
  );
}

function FilterTab({
  selected,
  onSelect,
  label,
  count,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  count?: number;
}) {
  return (
    <H
      as="button"
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={[
        "flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected
          ? "bg-clay-100 text-clay-900 shadow-press"
          : "bg-transparent text-clay-700",
      ].join(" ")}
    >
      {label}
      {count != null ? (
        <H
          as="span"
          className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-clay-700 shadow-neu-in-sm"
        >
          {count}
        </H>
      ) : null}
    </H>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
}) {
  return (
    <H
      as="label"
      className="flex w-full items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-xs"
    >
      <H as="span" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H
        as="input"
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event: { target: { value: string } }) =>
          onChange(event.target.value)
        }
        className="w-full cursor-pointer border-0 bg-transparent text-sm tabular-nums text-clay-900 shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
      />
    </H>
  );
}
