import { H } from "../h";
import { RANGE_TABS, type RangeId } from "./types";

type Props = {
  range: RangeId;
  onRange: (range: RangeId) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
  minDate: string;
  maxDate: string;
};

export function ConversionToolbar({
  range,
  onRange,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  minDate,
  maxDate,
}: Props) {
  return (
    <H className="flex flex-col gap-3">
      <H
        className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
        role="tablist"
        aria-label="Date range"
      >
        {RANGE_TABS.map((tab) => (
          <H
            key={tab.id}
            as="button"
            type="button"
            role="tab"
            aria-selected={range === tab.id}
            onClick={() => onRange(tab.id)}
            className={[
              "flex shrink-0 cursor-pointer items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
              range === tab.id
                ? "bg-clay-100 text-clay-900 shadow-press"
                : "bg-transparent text-clay-700",
            ].join(" ")}
          >
            {tab.label}
          </H>
        ))}
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
