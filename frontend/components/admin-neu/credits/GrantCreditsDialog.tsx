import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { personName, type LedgerUser } from "./types";

export type GrantDraft = {
  userId: string;
  postCredits: string;
  boostCredits: string;
  note: string;
};

type Props = {
  open: boolean;
  users: LedgerUser[];
  draft: GrantDraft;
  onDraft: (draft: GrantDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function GrantCreditsDialog({
  open,
  users,
  draft,
  onDraft,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;
  const post = Number(draft.postCredits);
  const boost = Number(draft.boostCredits);
  const canSubmit =
    draft.userId.length > 0 &&
    draft.note.trim().length > 0 &&
    ((Number.isFinite(post) && post > 0) || (Number.isFinite(boost) && boost > 0));

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
          Grant credits
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Promo or compensation. No cash moves. Demo only until API wiring.
        </H>

        <H className="mt-4 space-y-3">
          <H as="label" className="block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              Poster
            </H>
            <H
              as="select"
              value={draft.userId}
              onChange={(event: { target: { value: string } }) =>
                onDraft({ ...draft, userId: event.target.value })
              }
              className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              <H as="option" value="">
                Select a poster
              </H>
              {users.map((user) => (
                <H as="option" key={user.id} value={user.id}>
                  {personName(user)} · {user.email}
                </H>
              ))}
            </H>
          </H>

          <H className="grid grid-cols-2 gap-3">
            <Field
              label="Post credits"
              value={draft.postCredits}
              onChange={(postCredits) => onDraft({ ...draft, postCredits })}
            />
            <Field
              label="Boost credits"
              value={draft.boostCredits}
              onChange={(boostCredits) => onDraft({ ...draft, boostCredits })}
            />
          </H>

          <H as="label" className="block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              Staff note
            </H>
            <H
              as="textarea"
              value={draft.note}
              rows={4}
              onChange={(event: { target: { value: string } }) =>
                onDraft({ ...draft, note: event.target.value })
              }
              placeholder="Why this grant, in one or two lines"
              className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            />
          </H>
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            Grant credits
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <H as="label" className="block">
      <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
        {label}
      </H>
      <H
        as="input"
        inputMode="numeric"
        value={value}
        onChange={(event: { target: { value: string } }) =>
          onChange(event.target.value)
        }
        className="w-full rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm tabular-nums text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      />
    </H>
  );
}
