import { Bell, Check } from "lucide-react-native";
import { Link, type Href } from "expo-router";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ADMIN_MUTED } from "../theme";
import {
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_STACK_AFTER_HEAD,
} from "../tableChrome";
import {
  daysStalled,
  formatStamp,
  initials,
  personName,
  stalledLabel,
  stepLabel,
  type AbandonedDraft,
  type FunnelStepId,
} from "./types";

const DESKTOP_ROW =
  "grid grid-cols-[minmax(200px,1.6fr)_minmax(120px,1fr)_88px_120px_minmax(132px,1fr)] items-center gap-3";

type Props = {
  drafts: AbandonedDraft[];
  nowIso: string;
  busy?: boolean;
  onRemind: (draft: AbandonedDraft) => void;
};

export function AbandonedTable({ drafts, nowIso, busy, onRemind }: Props) {
  const bp = useBreakpoint();
  const compact = bp === "mobile";

  if (drafts.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No abandoned drafts in this range
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Widen the dates, or clear the step filter.
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="grid gap-3">
        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            nowIso={nowIso}
            busy={busy}
            onRemind={() => onRemind(draft)}
          />
        ))}
      </H>
    );
  }

  return (
    <NeuSurface inset className="overflow-hidden p-3">
      <H className="neu-scroll overflow-x-auto">
        <H className="min-w-[820px]">
          <H className={[DESKTOP_ROW, ADMIN_TABLE_HEAD].join(" ")}>
            <H as="span">Poster</H>
            <H as="span">Last step</H>
            <H as="span">Stalled</H>
            <H as="span">Last active</H>
            <H as="span" className="text-right">
              Follow-up
            </H>
          </H>
          <H className={ADMIN_TABLE_STACK_AFTER_HEAD}>
          {drafts.map((draft) => (
            <H
              key={draft.id}
              className={[DESKTOP_ROW, ADMIN_TABLE_ROW].join(" ")}
            >
              <PosterCell draft={draft} />
              <StepPill id={draft.lastStepId} />
              <H as="span" className="text-sm tabular-nums text-clay-900">
                {stalledLabel(daysStalled(draft.lastActiveAt, nowIso))}
              </H>
              <H as="span" className="text-sm text-clay-700">
                {formatStamp(draft.lastActiveAt)}
              </H>
              <H className="flex justify-end">
                <RemindButton
                  compact
                  sent={Boolean(draft.reminderSentAt)}
                  name={personName(draft.poster)}
                  disabled={busy}
                  onClick={() => onRemind(draft)}
                />
              </H>
            </H>
          ))}
          </H>
        </H>
      </H>
    </NeuSurface>
  );
}

function DraftCard({
  draft,
  nowIso,
  busy,
  onRemind,
}: {
  draft: AbandonedDraft;
  nowIso: string;
  busy?: boolean;
  onRemind: () => void;
}) {
  return (
    <NeuSurface className="px-4 py-4">
      <H className="flex items-start justify-between gap-3">
        <PosterCell draft={draft} />
        <StepPill id={draft.lastStepId} />
      </H>
      <H className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-clay-700">
        <H as="span">
          Stalled {stalledLabel(daysStalled(draft.lastActiveAt, nowIso)).toLowerCase()}
        </H>
        <H as="span">Last {formatStamp(draft.lastActiveAt)}</H>
      </H>
      <H className="mt-3">
        <RemindButton
          sent={Boolean(draft.reminderSentAt)}
          name={personName(draft.poster)}
          disabled={busy}
          onClick={onRemind}
        />
      </H>
    </NeuSurface>
  );
}

function PosterCell({ draft }: { draft: AbandonedDraft }) {
  return (
    <H className="flex min-w-0 items-center gap-3">
      <H
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-xs font-semibold text-moss shadow-neu-in-sm"
        aria-hidden
      >
        {initials(draft.poster)}
      </H>
      <H className="min-w-0">
        <Link
          href={`/admin/users?id=${draft.poster.id}` as Href}
          className="block truncate font-display text-sm font-semibold text-moss"
        >
          {personName(draft.poster)}
        </Link>
        <H as="p" className="truncate text-xs text-clay-700">
          {draft.title ?? "Untitled draft"} · {draft.area}
        </H>
      </H>
    </H>
  );
}

function StepPill({ id }: { id: FunnelStepId }) {
  return (
    <H
      as="span"
      className="inline-flex w-fit rounded-full bg-clay-100 px-2.5 py-0.5 text-[11px] font-medium text-clay-900 shadow-neu-in-sm"
    >
      {stepLabel(id)}
    </H>
  );
}

function RemindButton({
  sent,
  name,
  onClick,
  compact,
  disabled,
}: {
  sent: boolean;
  name: string;
  onClick: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  if (sent) {
    return (
      <NeuButton
        inset
        disabled
        ariaLabel={`Reminder already sent to ${name}`}
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
      >
        <Check size={compact ? 14 : 16} strokeWidth={1.75} color={ADMIN_MUTED} />
        Sent
      </NeuButton>
    );
  }
  return (
    <NeuButton
      tone="moss"
      ariaLabel={`Send reminder to ${name}`}
      className={compact ? "px-2.5 py-1.5 text-xs" : ""}
      disabled={disabled}
      onClick={onClick}
    >
      <Bell size={compact ? 14 : 16} strokeWidth={1.75} />
      Remind
    </NeuButton>
  );
}
