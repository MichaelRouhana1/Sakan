import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { personName, type AbandonedDraft } from "./types";

type Props = {
  draft: AbandonedDraft | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConversionRemindDialog({
  draft,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  if (!draft) return null;

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
          Queue this reminder?
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Demo queue only. Nothing sends. Target: {personName(draft.poster)}.
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton tone="moss" disabled={busy} onClick={onConfirm}>
            {busy ? "Working…" : "Queue reminder"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}
