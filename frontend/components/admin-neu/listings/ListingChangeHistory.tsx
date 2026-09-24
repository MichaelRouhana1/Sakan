import { useCallback, useEffect, useState } from "react";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { formatStamp } from "./types";
import {
  isLiveListingId,
  listListingAudit,
  type ListingAuditActorKind,
  type ListingAuditEvent,
  type ListingEditClass,
} from "./listingAuditSource";

const PAGE_SIZE = 50;
const DIFF_PREVIEW_CHARS = 280;

type Props = {
  listingId: string | null;
};

export function ListingChangeHistory({ listingId }: Props) {
  const liveId = listingId && isLiveListingId(listingId) ? listingId : null;
  const [events, setEvents] = useState<ListingAuditEvent[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number, append: boolean) => {
      if (!liveId) {
        setEvents([]);
        setNextOffset(null);
        setError(null);
        setLoading(false);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await listListingAudit(liveId, {
          limit: PAGE_SIZE,
          offset,
        });
        setEvents((prev) => (append ? [...prev, ...page.data] : page.data));
        setNextOffset(page.nextOffset);
      } catch {
        setError("Couldn’t load change history.");
        if (!append) {
          setEvents([]);
          setNextOffset(null);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [liveId],
  );

  useEffect(() => {
    void load(0, false);
  }, [load]);

  return (
    <H>
      <H as="h3" className="font-display text-sm font-semibold">
        Change history
      </H>
      {error ? (
        <NeuSurface
          inset
          className="mt-3 px-4 py-3 text-sm text-ember"
          as="section"
        >
          {error}
        </NeuSurface>
      ) : null}
      {loading ? (
        <NeuSurface inset className="mt-3 px-4 py-6 text-sm text-clay-700">
          Loading edits…
        </NeuSurface>
      ) : events.length === 0 && !error ? (
        <NeuSurface inset className="mt-3 px-4 py-6 text-sm text-clay-700">
          No edits recorded yet.
        </NeuSurface>
      ) : events.length > 0 ? (
        <H as="ol" className="mt-3 space-y-3">
          {events.map((event) => (
            <ChangeHistoryRow key={event.id} event={event} />
          ))}
        </H>
      ) : null}
      {nextOffset != null ? (
        <H className="mt-3">
          <NeuButton
            type="button"
            onClick={() => void load(nextOffset, true)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </NeuButton>
        </H>
      ) : null}
    </H>
  );
}

function ChangeHistoryRow({ event }: { event: ListingAuditEvent }) {
  const payload = event.payload ?? emptyPayload(event);
  const editClass = payload.editClass ?? "soft";
  const keys = payload.changedKeys ?? [];
  const showWindow = editClass === "hard" || editClass === "mixed";

  return (
    <H
      as="li"
      className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm"
    >
      <H className="flex items-baseline justify-between gap-2">
        <H as="p" className="text-sm font-semibold text-clay-900">
          {formatRelative(event.createdAt)}
        </H>
        <H as="p" className="text-[11px] text-clay-500">
          {formatStamp(event.createdAt)}
        </H>
      </H>
      <H className="mt-2 flex flex-wrap items-center gap-1.5">
        <HistoryPill
          label={actorLabel(event.actorKind, event.actorUserId, event.actorClerkId)}
          tone="clay"
        />
        <HistoryPill
          label={editClassLabel(editClass)}
          tone={
            editClass === "hard"
              ? "ember"
              : editClass === "mixed"
                ? "ochre"
                : "moss"
          }
        />
        {showWindow ? (
          <HistoryPill
            label={
              payload.withinStructuralWindow
                ? "Within 24h window"
                : "After 24h window"
            }
            tone={payload.withinStructuralWindow ? "moss" : "ochre"}
          />
        ) : null}
      </H>
      {keys.length > 0 ? (
        <H className="mt-2 flex flex-wrap gap-1">
          {keys.map((key) => (
            <H
              as="span"
              key={key}
              className="rounded-full bg-clay-50 px-2 py-0.5 font-mono text-[11px] text-clay-700 shadow-neu-in-sm"
            >
              {key}
            </H>
          ))}
        </H>
      ) : null}
      {keys.length > 0 ? (
        <H as="div" className="mt-2 space-y-1">
          {keys.map((key) => (
            <FieldDiff
              key={key}
              fieldKey={key}
              before={payload.before?.[key]}
              after={payload.after?.[key]}
            />
          ))}
        </H>
      ) : null}
    </H>
  );
}

function FieldDiff({
  fieldKey,
  before,
  after,
}: {
  fieldKey: string;
  before: unknown;
  after: unknown;
}) {
  return (
    <H as="details" className="group rounded-neu-md bg-clay-50 px-3 py-2">
      <H
        as="summary"
        className="cursor-pointer list-none text-xs font-medium text-clay-900 transition-colors duration-200 hover:text-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss [&::-webkit-details-marker]:hidden"
      >
        {fieldKey}
        <H as="span" className="ml-2 font-normal text-clay-500">
          before → after
        </H>
      </H>
      <H className="mt-2 grid gap-2 text-[11px] leading-relaxed motion-reduce:transition-none sm:grid-cols-2">
        <DiffPane label="Before" value={before} />
        <DiffPane label="After" value={after} />
      </H>
    </H>
  );
}

function DiffPane({ label, value }: { label: string; value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const raw = formatAuditValue(value, true);
  const preview = formatAuditValue(value, false);
  const truncated = raw.length > DIFF_PREVIEW_CHARS;

  return (
    <H>
      <H as="p" className="text-[10px] font-semibold uppercase tracking-wide text-clay-500">
        {label}
      </H>
      <H
        as="pre"
        className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-clay-800"
      >
        {expanded ? raw : preview}
      </H>
      {truncated ? (
        <H
          as="button"
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 cursor-pointer border-0 bg-transparent p-0 text-[11px] font-medium text-moss transition-colors duration-200 hover:text-clay-900"
        >
          {expanded ? "Show less" : "Show full"}
        </H>
      ) : null}
    </H>
  );
}

function HistoryPill({
  label,
  tone,
}: {
  label: string;
  tone: "moss" | "ember" | "ochre" | "clay";
}) {
  const text =
    tone === "ember"
      ? "text-ember"
      : tone === "ochre"
        ? "text-ochre"
        : tone === "moss"
          ? "text-moss"
          : "text-clay-700";
  const dot =
    tone === "ember"
      ? "bg-ember"
      : tone === "ochre"
        ? "bg-ochre"
        : tone === "moss"
          ? "bg-moss"
          : "bg-clay-500";

  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-50 px-2.5 py-1 text-[11px] font-semibold shadow-neu-in-sm",
        text,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </H>
  );
}

function actorLabel(
  kind: ListingAuditActorKind,
  userId: string | null,
  clerkId: string | null,
): string {
  const role =
    kind === "poster" ? "Host" : kind === "system" ? "System" : "Admin";
  const raw = userId ?? clerkId;
  if (!raw) return role;
  return `${role} · ${raw.slice(0, 8)}`;
}

function editClassLabel(editClass: ListingEditClass): string {
  if (editClass === "hard") return "Hard";
  if (editClass === "mixed") return "Mixed";
  return "Soft";
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Unknown time";
  const delta = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return "Just now";
  if (delta < hour) {
    const n = Math.floor(delta / minute);
    return `${n} min ago`;
  }
  if (delta < day) {
    const n = Math.floor(delta / hour);
    return `${n}h ago`;
  }
  if (delta < 7 * day) {
    const n = Math.floor(delta / day);
    return `${n}d ago`;
  }
  return formatStamp(iso);
}

function formatAuditValue(value: unknown, expanded: boolean): string {
  if (value == null) return "—";
  const raw =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!expanded && raw.length > DIFF_PREVIEW_CHARS) {
    return `${raw.slice(0, DIFF_PREVIEW_CHARS)}…`;
  }
  return raw;
}

function emptyPayload(event: ListingAuditEvent): ListingAuditEvent["payload"] {
  return {
    channel: "host_patch",
    editClass: "soft",
    withinStructuralWindow: false,
    changedKeys: [],
    before: {},
    after: {},
    publishedAt: null,
    ...((event.payload as object | undefined) ?? {}),
  };
}
