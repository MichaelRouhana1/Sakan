import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { BroadcastCard } from "./BroadcastCard";
import { FeedbackInbox } from "./FeedbackInbox";
import { FeedbackReplyDialog } from "./FeedbackReplyDialog";
import { FeedbackToolbar } from "./FeedbackToolbar";
import { NudgeGrid } from "./NudgeGrid";
import { MOCK_FEEDBACK, MOCK_NUDGES } from "./mockCommunication";
import {
  AUDIENCE_OPTIONS,
  channelLabel,
  personName,
  type BroadcastAudience,
  type BroadcastChannel,
  type FeedbackActionKind,
  type FeedbackCategory,
  type FeedbackItem,
  type FeedbackQueue,
} from "./types";

export function CommunicationPage() {
  const [nudges, setNudges] = useState(MOCK_NUDGES);
  const [feedback, setFeedback] = useState(MOCK_FEEDBACK);
  const [queue, setQueue] = useState<FeedbackQueue>("unread");
  const [category, setCategory] = useState<FeedbackCategory | "all">("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replying, setReplying] = useState<FeedbackItem | null>(null);
  const [reply, setReply] = useState("");
  const [liveNote, setLiveNote] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<BroadcastChannel[]>(["in_app"]);
  const [audience, setAudience] = useState<BroadcastAudience[]>(["all"]);

  const counts = useMemo(
    () => ({
      unread: feedback.filter((row) => row.queue === "unread").length,
      read: feedback.filter((row) => row.queue === "read").length,
      archived: feedback.filter((row) => row.queue === "archived").length,
    }),
    [feedback],
  );

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return feedback
      .filter((row) => row.queue === queue)
      .filter((row) => (category === "all" ? true : row.category === category))
      .filter((row) => {
        if (!needle) return true;
        const hay =
          `${personName(row)} ${row.user.email} ${row.user.campus} ${row.message}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [feedback, queue, category, deferredQuery]);

  const activeNudges = nudges.filter((row) => row.enabled).length;

  function toggleChannel(channel: BroadcastChannel) {
    setChannels((current) => {
      if (current.includes(channel)) {
        const next = current.filter((row) => row !== channel);
        return next.length === 0 ? current : next;
      }
      return [...current, channel];
    });
  }

  function toggleAudience(id: BroadcastAudience) {
    setAudience((current) => {
      if (id === "all") return ["all"];
      const withoutAll = current.filter((row) => row !== "all");
      const next = withoutAll.includes(id)
        ? withoutAll.filter((row) => row !== id)
        : [...withoutAll, id];
      return next.length === 0 ? ["all"] : next;
    });
  }

  function sendBroadcast() {
    const slice = audience.includes("all")
      ? "all users"
      : audience
          .map((id) => AUDIENCE_OPTIONS.find((row) => row.id === id)?.label ?? id)
          .join(", ");
    const via = channels.map((row) => channelLabel(row)).join(" + ");
    setLiveNote(`Queued “${subject.trim()}” to ${slice} via ${via}. Demo only.`);
    setSubject("");
    setBody("");
  }

  function applyAction(item: FeedbackItem, kind: FeedbackActionKind) {
    const now = new Date().toISOString();
    setFeedback((current) =>
      current.map((row) => {
        if (row.id !== item.id) return row;
        if (kind === "read") {
          return { ...row, queue: row.queue === "unread" ? "read" : row.queue };
        }
        if (kind === "archive") {
          return { ...row, queue: "archived" };
        }
        return {
          ...row,
          queue: row.queue === "archived" ? "archived" : "read",
          repliedAt: now,
        };
      }),
    );
    if (kind === "reply") {
      setLiveNote(`Replied to ${personName(item)}. Demo only.`);
    } else if (kind === "read") {
      setLiveNote(`Marked ${personName(item)} as read.`);
    } else {
      setLiveNote(`Archived ${personName(item)}.`);
    }
  }

  function requestAction(item: FeedbackItem, kind: FeedbackActionKind) {
    if (kind === "reply") {
      setReplying(item);
      setReply("");
      setSelectedId(item.id);
      return;
    }
    applyAction(item, kind);
    setSelectedId(item.id);
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Engagement desk
          </H>
          <H as="h1" className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Communication & CRM
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Blast a slice of the campus, keep lifecycle nudges honest, and
            triage what students actually wrote.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Unread notes" value={String(counts.unread)} hint="Waiting on staff" />
        <Kpi
          label="Nudges live"
          value={`${activeNudges}/${nudges.length}`}
          hint="Automated triggers"
        />
        <Kpi
          label="Read this week"
          value={String(counts.read)}
          hint="Still in the inbox"
        />
        <Kpi
          label="Archived"
          value={String(counts.archived)}
          hint="Closed loops"
        />
      </H>

      {liveNote ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {liveNote}
        </H>
      ) : null}

      <H className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <BroadcastCard
          subject={subject}
          body={body}
          channels={channels}
          audience={audience}
          onSubject={setSubject}
          onBody={setBody}
          onToggleChannel={toggleChannel}
          onToggleAudience={toggleAudience}
          onSend={sendBroadcast}
        />
        <NudgeGrid
          nudges={nudges}
          onToggle={(id, enabled) => {
            const target = nudges.find((row) => row.id === id);
            setNudges((current) =>
              current.map((row) => (row.id === id ? { ...row, enabled } : row)),
            );
            if (target) {
              setLiveNote(
                `${enabled ? "Armed" : "Paused"} “${target.title}”.`,
              );
            }
          }}
        />
      </H>

      <H>
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          User feedback inbox
        </H>
        <H as="p" className="mt-1 mb-4 text-sm leading-relaxed text-clay-700">
          Feature asks, bugs, and stray notes. Reply, mark read, or file it
          away.
        </H>
        <FeedbackToolbar
          query={query}
          onQuery={setQuery}
          queue={queue}
          onQueue={(next) => {
            setQueue(next);
            setSelectedId(null);
          }}
          category={category}
          onCategory={setCategory}
          counts={counts}
        />
      </H>

      <FeedbackInbox
        items={visible}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        onAction={requestAction}
      />

      <FeedbackReplyDialog
        item={replying}
        reply={reply}
        onReply={setReply}
        onCancel={() => {
          setReplying(null);
          setReply("");
        }}
        onConfirm={() => {
          if (!replying) return;
          applyAction(replying, "reply");
          setReplying(null);
          setReply("");
        }}
      />
    </H>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold tabular-nums text-clay-900">
        {value}
      </H>
      <H as="p" className="mt-1 text-[11px] text-clay-500">
        {hint}
      </H>
    </NeuSurface>
  );
}
