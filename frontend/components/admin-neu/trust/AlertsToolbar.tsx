import { Search } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { Chip, PillSelect } from "./TrustToolbar";
import {
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  PAGE_SIZE_OPTIONS,
  alertStatusLabel,
  severityLabel,
  type AlertSeverity,
  type AlertStatus,
} from "./types";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  severity: AlertSeverity | "all";
  onSeverity: (value: AlertSeverity | "all") => void;
  status: AlertStatus | "all";
  onStatus: (value: AlertStatus | "all") => void;
  pageSize: number;
  onPageSize: (size: number) => void;
};

export function AlertsToolbar({
  query,
  onQuery,
  severity,
  onSeverity,
  status,
  onStatus,
  pageSize,
  onPageSize,
}: Props) {
  return (
    <H className="flex flex-col items-start gap-3">
      <H className="flex w-full max-w-full flex-col gap-3 sm:flex-row sm:items-center">
        <H
          className="flex w-full items-center gap-3 rounded-full bg-clay-100 px-4 py-2.5 shadow-neu-in sm:max-w-md"
          as="label"
        >
          <Search size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
          <H as="span" className="sr-only">
            Search scam alerts
          </H>
          <H
            as="input"
            value={query}
            onChange={(event: { target: { value: string } }) =>
              onQuery(event.target.value)
            }
            placeholder="Search signal, account, or pattern"
            className="w-full border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
          />
        </H>

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

      <H
        className="neu-scroll inline-flex w-auto max-w-full gap-1 self-start overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
        role="group"
        aria-label="Alert severity"
      >
        {ALERT_SEVERITIES.map((tab) => (
          <Chip
            key={tab}
            selected={severity === tab}
            onSelect={() => onSeverity(tab)}
            label={tab === "all" ? "All severity" : severityLabel(tab)}
          />
        ))}
      </H>

      <H
        className="neu-scroll inline-flex w-auto max-w-full gap-1 self-start overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
        role="group"
        aria-label="Alert status"
      >
        {ALERT_STATUSES.map((tab) => (
          <Chip
            key={tab}
            selected={status === tab}
            onSelect={() => onStatus(tab)}
            label={tab === "all" ? "All status" : alertStatusLabel(tab)}
          />
        ))}
      </H>
    </H>
  );
}
