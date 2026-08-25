import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ReportActions } from "./ReportActions";
import { ReasonPill, ReportStatusPill } from "./ReportPills";
import {
  formatStamp,
  personName,
  reasonLabel,
  type AdminReport,
  type ReportActionKind,
} from "./types";

type Props = {
  reports: AdminReport[];
  selectedId: string | null;
  onSelect: (report: AdminReport) => void;
  onAction: (report: AdminReport, kind: ReportActionKind) => void;
};

export function ReportsInbox({ reports, selectedId, onSelect, onAction }: Props) {
  if (reports.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          Queue is clear
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          No tickets in this status. Try another tab or search.
        </H>
      </NeuSurface>
    );
  }

  return (
    <NeuSurface inset className="overflow-hidden">
      <H
        className="neu-scroll max-h-[min(70vh,720px)] overflow-y-auto"
        role="listbox"
        aria-label="Report tickets"
      >
        {reports.map((report) => {
          const selected = selectedId === report.id;
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
                "cursor-pointer border-t border-clay-200/80 px-4 py-3.5 transition-colors duration-press first:border-t-0",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss",
                selected ? "bg-moss-soft/40" : "hover:bg-clay-50/60",
              ].join(" ")}
            >
              <H className="flex items-start gap-3">
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
                  <H as="p" className="mt-1.5 truncate font-display text-sm font-semibold">
                    {report.listing.title}
                  </H>
                  <H as="p" className="truncate text-xs text-clay-700">
                    {personName(report.reporter)} → {personName(report.poster)} ·{" "}
                    {report.listing.area}
                  </H>
                </H>
              </H>
              <H className="mt-3">
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
  );
}
