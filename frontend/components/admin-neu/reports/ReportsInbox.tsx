import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_ROW_INTERACTIVE,
  ADMIN_TABLE_ROW_SELECTED,
  ADMIN_TABLE_STACK,
} from "../tableChrome";
import { ReportActions } from "./ReportActions";
import { ReasonPill, ReportStatusPill } from "./ReportPills";
import {
  formatStamp,
  personName,
  queueLabel,
  reasonLabel,
  type AdminReport,
  type ReportActionKind,
  type ReportQueue,
} from "./types";

type Props = {
  reports: AdminReport[];
  queue: ReportQueue;
  selectedId: string | null;
  selectedIds: Set<string>;
  hasQuery: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  onSelect: (report: AdminReport) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onAction: (report: AdminReport, kind: ReportActionKind) => void;
};

export function ReportsInbox({
  reports,
  queue,
  selectedId,
  selectedIds,
  hasQuery,
  page,
  pageCount,
  total,
  onPage,
  onSelect,
  onToggleSelect,
  onToggleSelectAll,
  onAction,
}: Props) {
  const allSelected =
    reports.length > 0 && reports.every((row) => selectedIds.has(row.id));

  if (reports.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          {hasQuery ? "No matches" : "Queue is clear"}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          {hasQuery
            ? "Try another reporter, listing, or poster — or clear search."
            : `No tickets in ${queueLabel(queue).toLowerCase()}. Try another tab.`}
        </H>
      </NeuSurface>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      <H className="flex items-center justify-between px-1">
        <H as="label" className="flex items-center gap-2 text-sm text-clay-700">
          <H
            as="input"
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="h-4 w-4 accent-[var(--admin-moss)]"
          />
          Select page
        </H>
        <H as="span" className="text-xs text-clay-500">
          {total} total
        </H>
      </H>

      <NeuSurface inset className="overflow-hidden p-3">
        <H
          className={[
            "neu-scroll max-h-[min(85vh,900px)] overflow-y-auto",
            ADMIN_TABLE_STACK,
          ].join(" ")}
          role="listbox"
          aria-label="Report tickets"
        >
          {reports.map((report) => {
            const selected = selectedId === report.id;
            const checked = selectedIds.has(report.id);
            return (
              <H
                key={report.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => onSelect(report)}
                onKeyDown={(event: { key: string }) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(report);
                }}
                className={[
                  ADMIN_TABLE_ROW,
                  ADMIN_TABLE_ROW_INTERACTIVE,
                  selected ? ADMIN_TABLE_ROW_SELECTED : "",
                ].join(" ")}
              >
                <H className="flex items-start gap-3">
                  <H
                    as="input"
                    type="checkbox"
                    checked={checked}
                    onClick={(event: { stopPropagation: () => void }) =>
                      event.stopPropagation()
                    }
                    onChange={() => onToggleSelect(report.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--admin-moss)]"
                    aria-label={`Select ${report.listing.title}`}
                  />
                  <H
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm"
                    aria-hidden
                  >
                    <H
                      as="img"
                      src={report.listing.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </H>
                  <H className="min-w-0 flex-1">
                    <H className="flex flex-wrap items-center gap-2">
                      <ReasonPill label={reasonLabel(report.reason)} />
                      <ReportStatusPill queue={report.queue} />
                      <H as="span" className="ml-auto text-[11px] text-clay-500">
                        {formatStamp(report.createdAt)}
                      </H>
                    </H>
                    <H
                      as="p"
                      className="mt-1.5 truncate font-display text-sm font-semibold"
                    >
                      {report.listing.title}
                    </H>
                    <H as="p" className="truncate text-xs text-clay-700">
                      {personName(report.reporter)} → {personName(report.poster)} ·{" "}
                      {report.listing.area}
                    </H>
                  </H>
                </H>
                <H className="mt-3 pl-7">
                  <ReportActions
                    compact
                    report={report}
                    onAction={(kind) => onAction(report, kind)}
                  />
                </H>
              </H>
            );
          })}
        </H>
      </NeuSurface>

      {pageCount > 1 ? (
        <H className="flex items-center justify-between gap-3 px-1">
          <NeuButton
            disabled={page <= 1}
            className="text-xs"
            onClick={() => onPage(page - 1)}
          >
            Previous
          </NeuButton>
          <H as="span" className="text-xs text-clay-700">
            Page {page} / {pageCount}
          </H>
          <NeuButton
            disabled={page >= pageCount}
            className="text-xs"
            onClick={() => onPage(page + 1)}
          >
            Next
          </NeuButton>
        </H>
      ) : null}
    </H>
  );
}
