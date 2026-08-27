import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  audienceLabel,
  campusLabel,
  channelsLabel,
  estimateReach,
  type BroadcastAudience,
  type BroadcastChannel,
} from "./types";

type Props = {
  open: boolean;
  subject: string;
  body: string;
  channels: BroadcastChannel[];
  audience: BroadcastAudience[];
  campusIds: string[];
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function BroadcastConfirmDialog({
  open,
  subject,
  body,
  channels,
  audience,
  campusIds,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!open) return null;
  const reach = estimateReach(audience, campusIds);

  return (
    <H className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <H
        as="button"
        type="button"
        aria-label="Dismiss"
        className="admin-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onCancel}
      />
      <NeuSurface className="relative w-full max-w-lg p-5 sm:p-6" as="section">
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          Queue this blast?
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Demo queue only. Nothing sends. Approx reach{" "}
          {reach.toLocaleString("en-GB")}.
        </H>
        <H className="mt-4 grid gap-2 rounded-neu-md bg-clay-100 px-4 py-3 text-sm shadow-neu-in-sm">
          <Row label="Subject" value={subject} />
          <Row label="Channels" value={channelsLabel(channels)} />
          <Row label="Audience" value={audienceLabel(audience)} />
          <Row label="Campus" value={campusLabel(campusIds)} />
        </H>
        <H className="mt-3 rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm">
          <H as="p" className="text-[11px] font-semibold uppercase tracking-wide text-clay-500">
            Message
          </H>
          <H as="p" className="mt-1.5 text-sm leading-relaxed text-clay-700">
            {body}
          </H>
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton tone="moss" disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : "Queue blast"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <H>
      <H as="span" className="text-[11px] font-semibold uppercase tracking-wide text-clay-500">
        {label}
      </H>
      <H as="p" className="text-clay-900">
        {value}
      </H>
    </H>
  );
}
