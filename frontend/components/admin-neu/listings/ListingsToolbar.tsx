import { Search } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import type { ListingQueue } from "./types";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  queue: ListingQueue;
  onQueue: (queue: ListingQueue) => void;
  activeCount: number;
  flaggedCount: number;
  expiredCount: number;
};

export function ListingsToolbar({
  query,
  onQuery,
  queue,
  onQueue,
  activeCount,
  flaggedCount,
  expiredCount,
}: Props) {
  return (
    <H className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <H
        className="flex w-full items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-md"
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

      <H
        className="inline-flex w-full rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
        role="tablist"
        aria-label="Listing status"
      >
        <QueueTab
          selected={queue === "active"}
          onSelect={() => onQueue("active")}
          label="Active"
          count={activeCount}
        />
        <QueueTab
          selected={queue === "flagged"}
          onSelect={() => onQueue("flagged")}
          label="Flagged"
          count={flaggedCount}
        />
        <QueueTab
          selected={queue === "expired"}
          onSelect={() => onQueue("expired")}
          label="Expired"
          count={expiredCount}
        />
      </H>
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
        "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-shadow duration-press sm:flex-none",
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
