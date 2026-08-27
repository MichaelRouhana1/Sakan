import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { BroadcastCard } from "./BroadcastCard";
import { BroadcastConfirmDialog } from "./BroadcastConfirmDialog";
import { CommunicationSwitcher, useCommsTab } from "./CommunicationSwitcher";
import { FeedbackActionDialog } from "./FeedbackActionDialog";
import { FeedbackDetailPane } from "./FeedbackDetailPane";
import { FeedbackInbox } from "./FeedbackInbox";
import { FeedbackReplyDialog } from "./FeedbackReplyDialog";
import { FeedbackToolbar } from "./FeedbackToolbar";
import { NudgeGrid } from "./NudgeGrid";
import { getAdminFeedback } from "./communicationSource";
import { useAdminCommunication } from "./useAdminCommunication";
import type { BroadcastAudience, BroadcastChannel } from "./types";

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

export function CommunicationPage() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    tab?: string | string[];
    nudge?: string | string[];
  }>();
  const tab = useCommsTab();
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const state = useAdminCommunication();
  const highlightNudge = firstParam(params.nudge);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<BroadcastChannel[]>(["in_app"]);
  const [audience, setAudience] = useState<BroadcastAudience[]>(["all"]);
  const [campusIds, setCampusIds] = useState<string[]>([]);

  useEffect(() => {
    const feedbackId = firstParam(params.id);
    if (!feedbackId) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await getAdminFeedback(feedbackId);
        if (cancelled) return;
        state.setQueue(row.queue);
        state.setQuery("");
        state.setCategory("all");
        state.setSelectedId(row.id);
      } catch {
        // deep-link miss
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once per id
  }, [params.id]);

  const showInbox = tab === "inbox";
  const showDetail = compact && showInbox && state.selected;
  const showList = showInbox && !showDetail;

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

  function toggleCampus(id: string) {
    setCampusIds((current) =>
      current.includes(id)
        ? current.filter((row) => row !== id)
        : [...current, id],
    );
  }

  const pendingFeedbackKind =
    state.pending?.mode === "feedback" ? state.pending.kind : null;

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
          Demo data · API-ready
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Unread notes"
          value={String(state.overview.unread)}
          hint="Waiting on staff"
        />
        <Kpi
          label="Nudges live"
          value={`${state.overview.nudgesLive}/${state.overview.nudgesTotal}`}
          hint="Automated triggers"
        />
        <Kpi
          label="Read this week"
          value={String(state.overview.readThisWeek)}
          hint="Last 7 days on the demo clock"
        />
        <Kpi
          label="Archived"
          value={String(state.overview.archived)}
          hint="Closed loops"
        />
      </H>

      <CommunicationSwitcher />

      {state.flash ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {state.flash}
        </H>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading communication…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load communication
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            {state.errorMessage ?? "Unknown error"}
          </H>
          <H className="mt-4 flex justify-center">
            <NeuButton tone="moss" onClick={state.retry}>
              Retry
            </NeuButton>
          </H>
        </NeuSurface>
      ) : null}

      {state.status === "ready" && tab === "blast" ? (
        <BroadcastCard
          subject={subject}
          body={body}
          channels={channels}
          audience={audience}
          campusIds={campusIds}
          jobs={state.broadcasts}
          onSubject={setSubject}
          onBody={setBody}
          onToggleChannel={toggleChannel}
          onToggleAudience={toggleAudience}
          onToggleCampus={toggleCampus}
          onSend={state.requestBlast}
        />
      ) : null}

      {state.status === "ready" && tab === "nudges" ? (
        <NudgeGrid
          nudges={state.nudges}
          highlightId={highlightNudge}
          onToggle={state.toggleNudge}
        />
      ) : null}

      {state.status === "ready" && showInbox ? (
        <>
          {showList || !compact ? (
            <FeedbackToolbar
              query={state.query}
              onQuery={state.setQuery}
              queue={state.queue}
              onQueue={(next) => {
                state.setQueue(next);
                state.setSelectedId(null);
              }}
              category={state.category}
              onCategory={state.setCategory}
              counts={state.counts}
              pageSize={state.pageSize}
              onPageSize={state.setPageSize}
            />
          ) : null}

          {compact ? (
            showDetail && state.selected ? (
              <FeedbackDetailPane
                item={state.selected}
                showBack
                onBack={() => state.setSelectedId(null)}
                onAction={(kind) => state.requestAction(state.selected!, kind)}
              />
            ) : showList ? (
              <FeedbackInbox
                items={state.items}
                queue={state.queue}
                selectedId={state.selectedId}
                hasQuery={state.hasQuery}
                page={state.page}
                pageCount={state.pageCount}
                total={state.total}
                onPage={state.setPage}
                onSelect={(item) => state.setSelectedId(item.id)}
                onAction={state.requestAction}
              />
            ) : null
          ) : (
            <H className="grid items-start gap-4 lg:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.08fr)]">
              <FeedbackInbox
                items={state.items}
                queue={state.queue}
                selectedId={
                  state.items.some((row) => row.id === state.selectedId)
                    ? state.selectedId
                    : null
                }
                hasQuery={state.hasQuery}
                page={state.page}
                pageCount={state.pageCount}
                total={state.total}
                onPage={state.setPage}
                onSelect={(item) => state.setSelectedId(item.id)}
                onAction={state.requestAction}
              />
              <H className="lg:sticky lg:top-6">
                <FeedbackDetailPane
                  item={
                    state.selected &&
                    state.items.some((row) => row.id === state.selected?.id)
                      ? state.selected
                      : null
                  }
                  onAction={(kind) => {
                    const focus = state.selected;
                    if (!focus) return;
                    if (!state.items.some((row) => row.id === focus.id)) {
                      return;
                    }
                    state.requestAction(focus, kind);
                  }}
                />
              </H>
            </H>
          )}
        </>
      ) : null}

      <FeedbackReplyDialog
        item={state.pending?.mode === "reply" ? state.pendingItem : null}
        reply={state.reply}
        onReply={state.setReply}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmPending();
        }}
        busy={state.busy}
      />

      <FeedbackActionDialog
        kind={pendingFeedbackKind}
        item={state.pending?.mode === "feedback" ? state.pendingItem : null}
        note={state.note}
        onNote={state.setNote}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmPending();
        }}
        busy={state.busy}
      />

      <BroadcastConfirmDialog
        open={state.pending?.mode === "blast"}
        subject={subject}
        body={body}
        channels={channels}
        audience={audience}
        campusIds={campusIds}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void (async () => {
            const ok = await state.confirmPending({
              subject,
              body,
              channels,
              audience,
              campusIds,
            });
            if (ok) {
              setSubject("");
              setBody("");
            }
          })();
        }}
        busy={state.busy}
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
