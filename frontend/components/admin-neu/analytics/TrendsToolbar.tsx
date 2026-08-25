import { H } from "../h";
import {
  RANGE_TABS,
  SERIES_TABS,
  type RangeId,
  type SeriesId,
} from "./types";

type Props = {
  range: RangeId;
  onRange: (range: RangeId) => void;
  series: SeriesId;
  onSeries: (series: SeriesId) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
  minDate: string;
  maxDate: string;
};

export function TrendsToolbar({
  range,
  onRange,
  series,
  onSeries,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  minDate,
  maxDate,
}: Props) {
  return (
    <H className="flex flex-col gap-3">
      <H className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
          role="tablist"
          aria-label="Date range"
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

        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
          role="tablist"
          aria-label="User series"
        >
          {SERIES_TABS.map((tab) => (
            <FilterTab
              key={tab.id}
              selected={series === tab.id}
              onSelect={() => onSeries(tab.id)}
              label={tab.label}
              tone={tab.id === "renters" ? "moss" : tab.id === "posters" ? "ochre" : "plain"}
            />
          ))}
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
    </H>
  );
}

function FilterTab({
  selected,
  onSelect,
  label,
  tone = "plain",
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  tone?: "plain" | "moss" | "ochre";
}) {
  const selectedTone =
    tone === "moss"
      ? "text-moss"
      : tone === "ochre"
        ? "text-ochre"
        : "text-clay-900";

  return (
    <H
      as="button"
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={[
        "flex shrink-0 cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected
          ? `bg-clay-100 shadow-press ${selectedTone}`
          : "bg-transparent text-clay-700",
      ].join(" ")}
    >
      {label}
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
        onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
        className="w-full cursor-pointer border-0 bg-transparent text-sm tabular-nums text-clay-900 shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
      />
    </H>
  );
}
