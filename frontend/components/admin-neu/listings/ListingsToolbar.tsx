import { ChevronDown, Search } from "lucide-react-native";
import { useEffect, useId, useRef, useState } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import {
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
  queueLabel,
  type ListingQueue,
  type ListingQueueCounts,
  type ListingSort,
} from "./types";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  queue: ListingQueue;
  onQueue: (queue: ListingQueue) => void;
  counts: ListingQueueCounts;
  sort: ListingSort;
  onSort: (sort: ListingSort) => void;
  pageSize: number;
  onPageSize: (size: number) => void;
};

const QUEUES: ListingQueue[] = [
  "all",
  "active",
  "flagged",
  "draft",
  "archived",
  "removed",
];

export function ListingsToolbar({
  query,
  onQuery,
  queue,
  onQueue,
  counts,
  sort,
  onSort,
  pageSize,
  onPageSize,
}: Props) {
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Published";

  return (
    <H className="flex flex-col gap-4">
      <H className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <H
          className="flex w-full min-w-0 items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-md"
          as="label"
        >
          <Search size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
          <H as="span" className="sr-only">
            Search listings
          </H>
          <H
            as="input"
            value={query}
            onChange={(event: { target: { value: string } }) =>
              onQuery(event.target.value)
            }
            placeholder="Search title, area, or poster"
            className="w-full border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
          />
        </H>

        <H className="flex flex-wrap items-center gap-2">
          <PillSelect
            label="Sort"
            valueLabel={sortLabel}
            options={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            selected={sort}
            onSelect={(value) => onSort(value as ListingSort)}
          />
          <PillSelect
            label="Page size"
            valueLabel={String(pageSize)}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            selected={String(pageSize)}
            onSelect={(value) => onPageSize(Number(value))}
          />
        </H>
      </H>

      <H
        className="neu-scroll inline-flex w-auto max-w-full items-center justify-start gap-1 self-start overflow-x-auto rounded-full bg-clay-100 p-1 shadow-neu-in"
        role="tablist"
        aria-label="Listing queue"
      >
        {QUEUES.map((item) => (
          <QueueTab
            key={item}
            selected={queue === item}
            onSelect={() => onQueue(item)}
            label={queueLabel(item)}
            count={counts[item]}
          />
        ))}
      </H>
    </H>
  );
}

function PillSelect({
  label,
  valueLabel,
  options,
  selected,
  onSelect,
}: {
  label: string;
  valueLabel: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const node = rootRef.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <H
      className="relative flex items-center gap-2"
      ref={(node: HTMLDivElement | null) => {
        rootRef.current = node;
      }}
    >
      <H as="span" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H
        as="button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className={[
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-clay-100 px-3.5 py-2 text-sm font-medium text-clay-900 shadow-neu-sm",
          "transition-shadow duration-press active:shadow-press",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        ].join(" ")}
      >
        <H as="span" className="tabular-nums">
          {valueLabel}
        </H>
        <ChevronDown size={14} strokeWidth={1.75} color={ADMIN_MUTED} />
      </H>

      {open ? (
        <H
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-[calc(100%+0.35rem)] z-30 min-w-[8.5rem] overflow-hidden rounded-neu-md bg-clay-100 p-1.5 shadow-neu"
        >
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <H
                as="button"
                type="button"
                role="option"
                key={option.value}
                aria-selected={active}
                onClick={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                className={[
                  "flex w-full cursor-pointer items-center rounded-neu-md px-3 py-2 text-left text-sm font-medium transition-shadow duration-press",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                  active
                    ? "bg-clay-100 text-moss shadow-press"
                    : "text-clay-700 hover:text-clay-900",
                ].join(" ")}
              >
                {option.label}
              </H>
            );
          })}
        </H>
      ) : null}
    </H>
  );
}

function QueueTab({
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
        "flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-shadow duration-press sm:px-3 sm:py-2",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected
          ? "bg-clay-100 text-clay-900 shadow-neu-sm"
          : "bg-transparent text-clay-700",
      ].join(" ")}
    >
      {label}
      <H
        as="span"
        className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-clay-700 shadow-neu-in-sm"
      >
        {count}
      </H>
    </H>
  );
}
