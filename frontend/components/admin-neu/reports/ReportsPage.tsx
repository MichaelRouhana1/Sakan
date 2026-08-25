import { useDeferredValue, useMemo, useState } from "react";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ReportActionDialog } from "./ReportActionDialog";
import { ReportDetailPane } from "./ReportDetailPane";
import { ReportsInbox } from "./ReportsInbox";
import { ReportsToolbar } from "./ReportsToolbar";
import { MOCK_REPORTS } from "./mockReports";
import {
  personName,
  type AdminReport,
  type ListingStatus,
  type ReportActionKind,
  type ReportQueue,
} from "./types";

export function ReportsPage() {
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [queue, setQueue] = useState<ReportQueue>("pending");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    reportId: string;
    kind: ReportActionKind;
  } | null>(null);
  const [note, setNote] = useState("");

  const counts = useMemo(
    () => ({
      pending: reports.filter((row) => row.queue === "pending").length,
      in_review: reports.filter((row) => row.queue === "in_review").length,
      resolved: reports.filter((row) => row.queue === "resolved").length,
      dismissed: reports.filter((row) => row.queue === "dismissed").length,
    }),
    [reports],
  );

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return reports
      .filter((row) => row.queue === queue)
      .filter((row) => {
        if (!needle) return true;
        const hay =
          `${row.listing.title} ${row.listing.area} ${personName(row.reporter)} ${row.reporter.email} ${personName(row.poster)}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [reports, queue, deferredQuery]);

  const resolvedId = compact
    ? selectedId
    : visible.some((row) => row.id === selectedId)
      ? selectedId
      : (visible[0]?.id ?? null);

  const selected = reports.find((row) => row.id === resolvedId) ?? null;
  const pendingReport = reports.find((row) => row.id === pending?.reportId) ?? null;
  const related = selected
    ? reports.filter(
        (row) => row.listing.id === selected.listing.id && row.id !== selected.id,
      )
    : [];

  function applyAction(reportId: string, kind: ReportActionKind, staffNote: string) {
    const now = new Date().toISOString();
    setReports((current) => {
      const target = current.find((row) => row.id === reportId);
      if (!target) return current;
      return current.map((row) => {
        const sameListing = row.listing.id === target.listing.id;
        if (kind === "claim") {
          if (row.id !== reportId) return row;
          return {
            ...row,
            queue: "in_review",
            reviewer: "You",
            reviewedAt: now,
          };
        }
        if (kind === "dismiss") {
          if (row.id !== reportId) return row;
          return {
            ...row,
            queue: "dismissed",
            reviewer: "You",
            reviewedAt: now,
            note: staffNote,
          };
        }
        if (kind === "remove") {
          if (!sameListing) return row;
          const listing = {
            ...row.listing,
            status: "removed" as ListingStatus,
          };
          if (row.queue === "pending" || row.queue === "in_review") {
            return {
              ...row,
              listing,
              queue: "resolved" as ReportQueue,
              reviewer: row.id === reportId ? "You" : row.reviewer ?? "You",
              reviewedAt: now,
              note: row.id === reportId ? staffNote : row.note,
            };
          }
          return { ...row, listing };
        }
        if (row.id !== reportId) return row;
        return {
          ...row,
          queue: "resolved" as ReportQueue,
          reviewer: "You",
          reviewedAt: now,
          note: staffNote,
          poster:
            kind === "restrict"
              ? { ...row.poster, accountStatus: "restricted" as const }
              : row.poster,
        };
      });
    });
    if (kind === "claim") setQueue("in_review");
  }

  function requestAction(report: AdminReport, kind: ReportActionKind) {
    if (kind === "claim") {
      applyAction(report.id, "claim", "");
      setSelectedId(report.id);
      return;
    }
    setPending({ reportId: report.id, kind });
    setNote("");
  }

  const openCount = counts.pending + counts.in_review;

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Moderation Hub
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Triage renter reports with the listing still on screen. Dismiss noise,
            take down fakes, or warn the poster.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data
        </H>
      </H>

      <H className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Open tickets" value={String(openCount)} />
        <Kpi label="Pending" value={String(counts.pending)} />
        <Kpi label="In review" value={String(counts.in_review)} />
      </H>

      <ReportsToolbar
        query={query}
        onQuery={setQuery}
        queue={queue}
        onQueue={(next) => {
          setQueue(next);
          setSelectedId(null);
        }}
        counts={counts}
      />

      {compact && selected ? (
        <ReportDetailPane
          report={selected}
          related={related}
          showBack
          onBack={() => setSelectedId(null)}
          onAction={(kind) => requestAction(selected, kind)}
          onOpenRelated={(item) => {
            setQueue(item.queue);
            setSelectedId(item.id);
          }}
        />
      ) : compact ? (
        <ReportsInbox
          reports={visible}
          selectedId={resolvedId}
          onSelect={(report) => setSelectedId(report.id)}
          onAction={requestAction}
        />
      ) : (
        <H className="grid items-start gap-4 lg:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.08fr)]">
          <ReportsInbox
            reports={visible}
            selectedId={resolvedId}
            onSelect={(report) => setSelectedId(report.id)}
            onAction={requestAction}
          />
          <H className="lg:sticky lg:top-6">
            <ReportDetailPane
              report={selected}
              related={related}
              onAction={(kind) => {
                if (!selected) return;
                requestAction(selected, kind);
              }}
              onOpenRelated={(item) => {
                setQueue(item.queue);
                setSelectedId(item.id);
              }}
            />
          </H>
        </H>
      )}

      <ReportActionDialog
        kind={pending?.kind ?? null}
        report={pendingReport}
        note={note}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          applyAction(pending.reportId, pending.kind, note.trim());
          setPending(null);
          setNote("");
        }}
      />
    </H>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold text-clay-900">
        {value}
      </H>
    </NeuSurface>
  );
}
