import { Search } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import type { FeedbackCategory, FeedbackQueue } from "./types";

const QUEUES: { id: FeedbackQueue; label: string }[] = [
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
  { id: "archived", label: "Archived" },
];

const CATEGORIES: { id: FeedbackCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "feature", label: "Feature" },
  { id: "bug", label: "Bug" },
  { id: "general", label: "General" },
];

type Props = {
  query: string;
  onQuery: (value: string) => void;
  queue: FeedbackQueue;
  onQueue: (queue: FeedbackQueue) => void;
  category: FeedbackCategory | "all";
  onCategory: (category: FeedbackCategory | "all") => void;
  counts: Record<FeedbackQueue, number>;
};

export function FeedbackToolbar({
  query,
  onQuery,
  queue,
  onQueue,
  category,
  onCategory,
  counts,
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
            Search feedback
          </H>
          <H
            as="input"
            value={query}
            onChange={(event: { target: { value: string } }) =>
              onQuery(event.target.value)
            }
            placeholder="Search name, campus, or message"
            className="w-full border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
          />
        </H>

        <H
          className="neu-scroll flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in lg:w-auto"
          role="tablist"
          aria-label="Feedback status"
        >
          {QUEUES.map((tab) => (
            <Chip
              key={tab.id}
              selected={queue === tab.id}
              onSelect={() => onQueue(tab.id)}
              label={tab.label}
              count={counts[tab.id]}
              role="tab"
            />
          ))}
        </H>
      </H>

      <H
        className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
        role="group"
        aria-label="Feedback category"
      >
        {CATEGORIES.map((tab) => (
          <Chip
            key={tab.id}
            selected={category === tab.id}
            onSelect={() => onCategory(tab.id)}
            label={tab.label}
          />
        ))}
      </H>
    </H>
  );
}

function Chip({
  selected,
  onSelect,
  label,
  count,
  role = "button",
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  count?: number;
  role?: "tab" | "button";
}) {
  return (
    <H
      as="button"
      type="button"
      role={role}
      aria-selected={role === "tab" ? selected : undefined}
      aria-pressed={role === "button" ? selected : undefined}
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
      {count != null ? (
        <H
          as="span"
          className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold text-clay-700 shadow-neu-in-sm"
        >
          {count}
        </H>
      ) : null}
    </H>
  );
}
