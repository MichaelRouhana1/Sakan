import { Search } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import type { TxKind, TxStatus } from "./types";

type StatusFilter = TxStatus | "all";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  kind: TxKind;
  onKind: (kind: TxKind) => void;
  status: StatusFilter;
  onStatus: (status: StatusFilter) => void;
  purchasedCount: number;
  grantedCount: number;
  statusCounts: Record<StatusFilter, number>;
};

export function CreditsToolbar({
  query,
  onQuery,
  kind,
  onKind,
  status,
  onStatus,
  purchasedCount,
  grantedCount,
  statusCounts,
}: Props) {
  return (
    <H className="flex flex-col gap-4">
      <H
        className="flex w-full items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-md"
        as="label"
      >
        <Search size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
        <H as="span" className="sr-only">
          Search transactions
        </H>
        <H
          as="input"
          value={query}
          onChange={(event: { target: { value: string } }) =>
            onQuery(event.target.value)
          }
          placeholder="Search name, email, or reference"
          className="w-full border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
        />
      </H>

      <H className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
          role="tablist"
          aria-label="Transaction type"
        >
          <FilterTab
            selected={kind === "purchased"}
            onSelect={() => onKind("purchased")}
            label="Purchased"
            count={purchasedCount}
          />
          <FilterTab
            selected={kind === "granted"}
            onSelect={() => onKind("granted")}
            label="Granted"
            count={grantedCount}
          />
        </H>

        <H
          className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
          role="tablist"
          aria-label="Transaction status"
        >
          {(["all", "success", "pending", "failed"] as const).map((id) => (
            <FilterTab
              key={id}
              selected={status === id}
              onSelect={() => onStatus(id)}
              label={id === "all" ? "All" : id === "success" ? "Success" : id === "pending" ? "Pending" : "Failed"}
              count={statusCounts[id]}
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
