import { Check, Mail, Megaphone, MessageCircle, Send } from "lucide-react-native";
import type { ReactNode } from "react";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  AUDIENCE_OPTIONS,
  CAMPUS_OPTIONS,
  audienceLabel,
  campusLabel,
  channelsLabel,
  estimateReach,
  formatStamp,
  type BroadcastAudience,
  type BroadcastChannel,
  type BroadcastJob,
} from "./types";

type Props = {
  subject: string;
  body: string;
  channels: BroadcastChannel[];
  audience: BroadcastAudience[];
  campusIds: string[];
  jobs: BroadcastJob[];
  onSubject: (value: string) => void;
  onBody: (value: string) => void;
  onToggleChannel: (channel: BroadcastChannel) => void;
  onToggleAudience: (audience: BroadcastAudience) => void;
  onToggleCampus: (campusId: string) => void;
  onSend: () => void;
};

export function BroadcastCard({
  subject,
  body,
  channels,
  audience,
  campusIds,
  jobs,
  onSubject,
  onBody,
  onToggleChannel,
  onToggleAudience,
  onToggleCampus,
  onSend,
}: Props) {
  const reach = estimateReach(audience, campusIds);
  const canSend =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    channels.length > 0 &&
    audience.length > 0;

  return (
    <H className="grid gap-4">
      <NeuSurface as="section" className="flex flex-col p-5 sm:p-6">
        <H className="flex items-start justify-between gap-3">
          <H>
            <H
              as="p"
              className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-moss"
            >
              Targeted broadcasting
            </H>
            <H as="h2" className="mt-1 font-display text-lg font-semibold text-clay-900">
              Compose a blast
            </H>
            <H as="p" className="mt-1 max-w-md text-sm leading-relaxed text-clay-700">
              In-app banner, email, or WhatsApp. Pick a slice so Hamra renters
              are not hit with poster credit copy.
            </H>
          </H>
          <H
            as="span"
            className="shrink-0 rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-moss shadow-neu-in-sm"
          >
            ~{reach.toLocaleString("en-GB")} reach
          </H>
        </H>

        <H className="mt-5">
          <H as="p" className="mb-2 text-sm font-medium text-clay-900">
            Channel
          </H>
          <H className="flex flex-wrap gap-2">
            <ChannelCheck
              checked={channels.includes("in_app")}
              label="In-app"
              hint="Banner + inbox"
              icon={<Megaphone size={15} strokeWidth={1.75} />}
              onToggle={() => onToggleChannel("in_app")}
            />
            <ChannelCheck
              checked={channels.includes("email")}
              label="Email"
              hint="Campus inbox"
              icon={<Mail size={15} strokeWidth={1.75} />}
              onToggle={() => onToggleChannel("email")}
            />
            <ChannelCheck
              checked={channels.includes("whatsapp")}
              label="WhatsApp"
              hint="PRD contact path"
              icon={<MessageCircle size={15} strokeWidth={1.75} />}
              onToggle={() => onToggleChannel("whatsapp")}
            />
          </H>
        </H>

        <H className="mt-5">
          <H as="p" className="mb-2 text-sm font-medium text-clay-900">
            Audience
          </H>
          <H className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AUDIENCE_OPTIONS.map((option) => (
              <AudienceCheck
                key={option.id}
                checked={audience.includes(option.id)}
                label={option.label}
                hint={option.hint}
                onToggle={() => onToggleAudience(option.id)}
              />
            ))}
          </H>
        </H>

        <H className="mt-5">
          <H as="p" className="mb-2 text-sm font-medium text-clay-900">
            Campus
          </H>
          <H as="p" className="mb-2 text-[11px] text-clay-500">
            Optional. Empty means all campuses.
          </H>
          <H className="flex flex-wrap gap-2">
            {CAMPUS_OPTIONS.map((option) => (
              <H
                key={option.id}
                as="button"
                type="button"
                role="checkbox"
                aria-checked={campusIds.includes(option.id)}
                onClick={() => onToggleCampus(option.id)}
                className={[
                  "cursor-pointer rounded-full bg-clay-100 px-3 py-1.5 text-xs font-medium transition-shadow duration-press",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                  campusIds.includes(option.id)
                    ? "text-moss shadow-press"
                    : "text-clay-700 shadow-neu-sm",
                ].join(" ")}
              >
                {option.label}
              </H>
            ))}
          </H>
        </H>

        <H as="label" className="mt-5 block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Subject
          </H>
          <H className="rounded-neu-md bg-clay-100 shadow-neu-in-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss">
            <H
              as="input"
              value={subject}
              onChange={(event: { target: { value: string } }) =>
                onSubject(event.target.value)
              }
              placeholder="Short line. This is the banner title too."
              className="w-full border-0 bg-transparent px-3 py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
            />
          </H>
        </H>

        <H as="label" className="mt-4 block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Message
          </H>
          <H className="rounded-neu-md bg-clay-100 shadow-neu-in-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss">
            <H
              as="textarea"
              value={body}
              rows={7}
              onChange={(event: { target: { value: string } }) =>
                onBody(event.target.value)
              }
              placeholder="What should they do, in two or three lines."
              className="min-h-[8.5rem] w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
            />
          </H>
        </H>

        <H className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <H as="p" className="text-[11px] leading-relaxed text-clay-500">
            Demo queue. Nothing leaves this desk.
          </H>
          <NeuButton tone="moss" disabled={!canSend} onClick={onSend}>
            <Send size={16} strokeWidth={1.75} />
            Queue blast
          </NeuButton>
        </H>
      </NeuSurface>

      <NeuSurface as="section" className="p-5 sm:p-6">
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          Queue history
        </H>
        <H as="p" className="mt-1 text-sm text-clay-700">
          Demo jobs only. No send worker.
        </H>
        {jobs.length === 0 ? (
          <H as="p" className="mt-4 text-sm text-clay-500">
            No blasts queued yet.
          </H>
        ) : (
          <H className="mt-4 grid gap-3">
            {jobs.map((job) => (
              <H
                key={job.id}
                className="rounded-neu-md bg-clay-100 px-3.5 py-3 shadow-neu-in-sm"
              >
                <H className="flex flex-wrap items-start justify-between gap-2">
                  <H as="p" className="font-display text-sm font-semibold text-clay-900">
                    {job.subject}
                  </H>
                  <H
                    as="span"
                    className="rounded-full bg-clay-100 px-2.5 py-0.5 text-[11px] font-semibold text-ochre shadow-neu-sm"
                  >
                    Queued
                  </H>
                </H>
                <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
                  {job.body}
                </H>
                <H as="p" className="mt-2 text-[11px] text-clay-500">
                  {channelsLabel(job.channels)} · {audienceLabel(job.audience)} ·{" "}
                  {campusLabel(job.campusIds)} · ~
                  {job.reach.toLocaleString("en-GB")} · {formatStamp(job.queuedAt)}
                </H>
              </H>
            ))}
          </H>
        )}
      </NeuSurface>
    </H>
  );
}

function ChannelCheck({
  checked,
  label,
  hint,
  icon,
  onToggle,
}: {
  checked: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  onToggle: () => void;
}) {
  return (
    <H
      as="button"
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={[
        "flex min-w-[9.5rem] flex-1 cursor-pointer items-center gap-3 rounded-neu-md bg-clay-100 px-3 py-2.5 text-left transition-shadow duration-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        checked ? "shadow-press" : "shadow-neu-sm",
      ].join(" ")}
    >
      <CheckBox checked={checked} />
      <H className="min-w-0">
        <H className="flex items-center gap-1.5 text-sm font-medium text-clay-900">
          {icon}
          {label}
        </H>
        <H as="span" className="block text-[11px] text-clay-500">
          {hint}
        </H>
      </H>
    </H>
  );
}

function AudienceCheck({
  checked,
  label,
  hint,
  onToggle,
}: {
  checked: boolean;
  label: string;
  hint: string;
  onToggle: () => void;
}) {
  return (
    <H
      as="button"
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={[
        "flex cursor-pointer items-center gap-3 rounded-neu-md bg-clay-100 px-3 py-2.5 text-left transition-shadow duration-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        checked ? "shadow-press" : "shadow-neu-sm",
      ].join(" ")}
    >
      <CheckBox checked={checked} />
      <H className="min-w-0">
        <H as="span" className="block text-sm font-medium text-clay-900">
          {label}
        </H>
        <H as="span" className="block text-[11px] text-clay-500">
          {hint}
        </H>
      </H>
    </H>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <H
      className={[
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-clay-100",
        checked ? "text-moss shadow-press" : "text-transparent shadow-neu-sm",
      ].join(" ")}
      aria-hidden
    >
      <Check size={14} strokeWidth={2.4} />
    </H>
  );
}
