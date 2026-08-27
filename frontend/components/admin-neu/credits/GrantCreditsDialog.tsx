import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { personName, type AdjustmentDraft, type LedgerUser } from "./types";

type Props = {
  open: boolean;
  users: LedgerUser[];
  draft: AdjustmentDraft;
  onDraft: (draft: AdjustmentDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function GrantCreditsDialog({
  open,
  users,
  draft,
  onDraft,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!open) return null;
  const post = Number(draft.postCredits);
  const boost = Number(draft.boostCredits);
  const canSubmit =
    !busy &&
    draft.userId.length > 0 &&
    draft.note.trim().length > 0 &&
    Number.isFinite(post) &&
    Number.isFinite(boost) &&
    (Math.trunc(post) !== 0 || Math.trunc(boost) !== 0);

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
          Manual credit adjustment
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          Promo, compensation, or claw-back. Positive grants, negative debit.
          Demo only — does not write Users.
        </H>

        <H className="mt-4 space-y-3">
          <H as="label" className="block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              Poster
            </H>
            <H className="rounded-neu-md bg-clay-100 shadow-neu-in-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss">
              <H
                as="select"
                value={draft.userId}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({ ...draft, userId: event.target.value })
                }
                className="w-full cursor-pointer border-0 bg-transparent px-3 py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
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
            <H className="rounded-neu-md bg-clay-100 shadow-neu-in-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss">
              <H
                as="textarea"
                value={draft.note}
                rows={4}
                onChange={(event: { target: { value: string } }) =>
                  onDraft({ ...draft, note: event.target.value })
                }
                placeholder="Why this adjustment, in one or two lines"
                className="w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
              />
            </H>
          </H>
        </H>

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton tone="moss" disabled={!canSubmit} onClick={onConfirm}>
            {busy ? "Working…" : "Record adjustment"}
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
      <H className="rounded-neu-md bg-clay-100 shadow-neu-in-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss">
        <H
          as="input"
          inputMode="numeric"
          value={value}
          onChange={(event: { target: { value: string } }) =>
            onChange(event.target.value)
          }
          className="w-full border-0 bg-transparent px-3 py-2.5 text-sm tabular-nums text-clay-900 shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
        />
      </H>
    </H>
  );
}
