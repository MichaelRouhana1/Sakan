import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { PromoActionKind, PromoCode } from "./types";

const COPY: Record<
  Exclude<PromoActionKind, "copy">,
  { title: string; body: string; confirm: string; tone: "moss" | "ochre" | "ember" }
> = {
  pause: {
    title: "Pause this campaign?",
    body: "Redemptions stop until you resume. Dates stay put.",
    confirm: "Pause",
    tone: "ochre",
  },
  resume: {
    title: "Resume this campaign?",
    body: "Code goes live again if the window still allows. Cap and dates stay as they are.",
    confirm: "Resume",
    tone: "moss",
  },
  expire: {
    title: "End this campaign?",
    body: "Stops the code now. Cannot restart. Scheduled rows stay expired.",
    confirm: "End campaign",
    tone: "ember",
  },
};

type Props = {
  kind: Exclude<PromoActionKind, "copy"> | null;
  promo: PromoCode | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PromoActionDialog({
  kind,
  promo,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  if (!kind || !promo) return null;
  const copy = COPY[kind];

  return (
    <H className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <H
        as="button"
        type="button"
        aria-label="Dismiss"
        className="admin-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onCancel}
      />
      <NeuSurface className="relative w-full max-w-md p-5 sm:p-6" as="section">
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {copy.title}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {copy.body} Target: {promo.code}.
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton tone={copy.tone} disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : copy.confirm}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}
