import { Search } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { stabilityLabel, type StabilityFilter } from "./types";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  stability: StabilityFilter;
  onStability: (value: StabilityFilter) => void;
  counts: Record<StabilityFilter, number>;
};

const TABS: { id: StabilityFilter; label: string }[] = [
  { id: "all", label: "All zones" },
  { id: "stable", label: stabilityLabel("stable") },
  { id: "moderate", label: stabilityLabel("moderate") },
  { id: "severe", label: stabilityLabel("severe") },
];

export function ElectricityToolbar({
  query,
  onQuery,
  stability,
  onStability,
  counts,
}: Props) {
  return (
    <H className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <H
        className="flex w-full items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-md"
        as="label"
      >
        <Search size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
        <H as="span" className="sr-only">
          Search zones
        </H>
        <H
          as="input"
          value={query}
          onChange={(event: { target: { value: string } }) =>
            onQuery(event.target.value)
          }
          placeholder="Find area, district, or governorate"
          className="w-full border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
        />
      </H>

      <H
        className="neu-scroll flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in xl:w-auto"
        role="tablist"
        aria-label="Power stability"
      >
        {TABS.map((tab) => (
          <FilterTab
            key={tab.id}
            selected={stability === tab.id}
            onSelect={() => onStability(tab.id)}
            label={tab.label}
            count={counts[tab.id]}
          />
        ))}
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
  count: number;
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
          ? "bg-clay-100 text-clay-900 shadow-neu-sm"
          : "bg-transparent text-clay-700",
      ].join(" ")}
    >
      {label}
      <H
        as="span"
        className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold text-clay-700 shadow-neu-in-sm"
      >
        {count}
      </H>
    </H>
  );
}
