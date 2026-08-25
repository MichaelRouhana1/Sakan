import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { personName, type FeedbackItem } from "./types";

type Props = {
  item: FeedbackItem | null;
  reply: string;
  onReply: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function FeedbackReplyDialog({
  item,
  reply,
  onReply,
  onCancel,
  onConfirm,
}: Props) {
  if (!item) return null;
  const canSubmit = reply.trim().length > 0;

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
          Reply to {personName(item)}
        </H>
        <H as="p" className="mt-1 text-xs text-clay-500">
          {item.user.email} · {item.user.campus}
        </H>
        <H className="mt-4 rounded-neu-md bg-clay-100 px-3 py-3 shadow-neu-in-sm">
          <H as="p" className="text-[11px] font-semibold uppercase tracking-wide text-clay-500">
            Their note
          </H>
          <H as="p" className="mt-1.5 text-sm leading-relaxed text-clay-700">
            {item.message}
          </H>
        </H>
        <H as="label" className="mt-4 block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Reply
          </H>
          <H
            as="textarea"
            value={reply}
            rows={5}
            onChange={(event: { target: { value: string } }) =>
              onReply(event.target.value)
            }
            placeholder="In-app reply. Keep it short and specific."
            className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          />
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            Send reply
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}
