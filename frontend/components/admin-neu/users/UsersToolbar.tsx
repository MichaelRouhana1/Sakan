import { Search } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import type { UserRole } from "./types";

export type RoleFilter = UserRole | "all";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  role: RoleFilter;
  onRole: (role: RoleFilter) => void;
  allCount: number;
  renterCount: number;
  posterCount: number;
  reviewCount: number;
  needsReview: boolean;
  onNeedsReview: (value: boolean) => void;
  resultCount: number;
};

export function UsersToolbar({
  query,
  onQuery,
  role,
  onRole,
  allCount,
  renterCount,
  posterCount,
  reviewCount,
  needsReview,
  onNeedsReview,
  resultCount,
}: Props) {
  const searching = query.trim().length > 0;

  return (
    <H className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <H className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <H
          className="flex w-full min-w-0 items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-md"
          as="label"
        >
          <Search size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
          <H as="span" className="sr-only">
            Search users
          </H>
          <H
            as="input"
            value={query}
            onChange={(event: { target: { value: string } }) =>
              onQuery(event.target.value)
            }
            placeholder="Search name or email"
            className="w-full border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
          />
        </H>
        {searching ? (
          <H
            as="span"
            className="inline-flex shrink-0 items-center rounded-full bg-clay-100 px-3 py-2 text-sm font-medium tabular-nums text-clay-900 shadow-neu-in-sm"
          >
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </H>
        ) : null}
      </H>

      <H className="flex flex-wrap items-center gap-2">
        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
          role="tablist"
          aria-label="Account type"
        >
          <RoleTab
            selected={role === "all"}
            onSelect={() => onRole("all")}
            label="All"
            count={allCount}
          />
          <RoleTab
            selected={role === "renter"}
            onSelect={() => onRole("renter")}
            label="Renters"
            count={renterCount}
          />
          <RoleTab
            selected={role === "poster"}
            onSelect={() => onRole("poster")}
            label="Posters"
            count={posterCount}
          />
        </H>

        <H
          as="button"
          type="button"
          aria-pressed={needsReview}
          onClick={() => onNeedsReview(!needsReview)}
          className={[
            "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-shadow duration-press",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
            needsReview
              ? "bg-clay-100 text-ochre shadow-press"
              : "bg-clay-100 text-clay-700 shadow-neu-sm",
          ].join(" ")}
        >
          Needs review
          <H
            as="span"
            className={[
              "rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-neu-in-sm",
              needsReview ? "text-ochre" : "text-clay-700",
            ].join(" ")}
          >
            {reviewCount}
          </H>
        </H>
      </H>
    </H>
  );
}

function RoleTab({
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
          ? "bg-clay-100 text-clay-900 shadow-press"
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
