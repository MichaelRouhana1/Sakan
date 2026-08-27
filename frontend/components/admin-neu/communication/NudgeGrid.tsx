import { Bell, ExternalLink, Mail, MessageCircle } from "lucide-react-native";
import { Link, type Href } from "expo-router";
import { useEffect } from "react";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { ADMIN_MUTED } from "../theme";
import {
  channelLabel,
  formatStamp,
  type BroadcastChannel,
  type LifecycleNudge,
} from "./types";

type Props = {
  nudges: LifecycleNudge[];
  highlightId?: string | null;
  onToggle: (id: string, enabled: boolean) => void;
};

export function NudgeGrid({ nudges, highlightId, onToggle }: Props) {
  useEffect(() => {
    if (!highlightId || typeof document === "undefined") return;
    const node = document.getElementById(`nudge-${highlightId}`);
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId, nudges]);
  return (
    <NeuSurface as="section" className="flex flex-col p-5 sm:p-6">
      <H>
        <H
          as="p"
          className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-moss"
        >
          Lifecycle nudges
        </H>
        <H as="h2" className="mt-1 font-display text-lg font-semibold text-clay-900">
          Automated triggers
        </H>
        <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
          Flip a switch. Off means that moment stays quiet until you turn it
          back on. Overlap links go to the desk that already owns the manual
          version.
        </H>
      </H>

      <H className="mt-5 grid gap-3 sm:grid-cols-2">
        {nudges.map((nudge) => (
          <NudgeCard
            key={nudge.id}
            nudge={nudge}
            highlighted={highlightId === nudge.id}
            onToggle={(enabled) => onToggle(nudge.id, enabled)}
          />
        ))}
      </H>
    </NeuSurface>
  );
}

function NudgeCard({
  nudge,
  highlighted,
  onToggle,
}: {
  nudge: LifecycleNudge;
  highlighted: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <H
      id={`nudge-${nudge.id}`}
      className={[
        "rounded-neu-md bg-clay-100 px-3.5 py-3.5 shadow-neu-in-sm",
        highlighted ? "outline outline-2 outline-offset-2 outline-moss" : "",
      ].join(" ")}
    >
      <H className="flex items-start justify-between gap-3">
        <H className="min-w-0">
          <H as="p" className="font-display text-sm font-semibold text-clay-900">
            {nudge.title}
          </H>
          <H as="p" className="mt-1 text-[11px] leading-relaxed text-clay-700">
            {nudge.trigger}
          </H>
        </H>
        <NeuSwitch
          active={nudge.enabled}
          label={`${nudge.enabled ? "Disable" : "Enable"} ${nudge.title}`}
          onChange={onToggle}
        />
      </H>
      <H className="mt-3 flex flex-wrap items-center gap-2">
        {nudge.channels.map((channel) => (
          <ChannelChip key={channel} channel={channel} />
        ))}
        <H
          as="span"
          className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-medium text-clay-700 shadow-neu-sm"
        >
          {nudge.audience}
        </H>
        {nudge.overlapHref && nudge.overlapLabel ? (
          <Link
            href={nudge.overlapHref as Href}
            className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-medium text-moss shadow-neu-sm"
          >
            <ExternalLink size={11} strokeWidth={1.75} />
            {nudge.overlapLabel}
          </Link>
        ) : null}
        <H as="span" className="ml-auto text-[11px] tabular-nums text-clay-500">
          {nudge.enabled ? `${nudge.sent30d} / 30d` : "Paused"}
        </H>
      </H>
      <H as="p" className="mt-2 text-[11px] text-clay-500">
        {nudge.lastFiredAt
          ? `Last fire ${formatStamp(nudge.lastFiredAt)}`
          : "Never fired"}
      </H>
    </H>
  );
}

function ChannelChip({ channel }: { channel: BroadcastChannel }) {
  const Icon =
    channel === "email" ? Mail : channel === "whatsapp" ? MessageCircle : Bell;
  return (
    <H
      as="span"
      className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-medium text-clay-700 shadow-neu-sm"
    >
      <Icon size={12} strokeWidth={1.75} color={ADMIN_MUTED} />
      {channelLabel(channel)}
    </H>
  );
}

function NeuSwitch({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: (active: boolean) => void;
}) {
  return (
    <H
      as="button"
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={() => onChange(!active)}
      className="relative h-8 w-14 shrink-0 cursor-pointer rounded-full bg-clay-100 p-1 shadow-neu-in-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
    >
      <H
        className={[
          "pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-clay-100 shadow-neu-sm transition-transform duration-panel",
          active ? "translate-x-6" : "translate-x-0",
        ].join(" ")}
      >
        <H
          as="span"
          className={[
            "h-2 w-2 rounded-full",
            active ? "bg-moss shadow-dot-moss" : "bg-clay-500",
          ].join(" ")}
          aria-hidden
        />
      </H>
    </H>
  );
}
