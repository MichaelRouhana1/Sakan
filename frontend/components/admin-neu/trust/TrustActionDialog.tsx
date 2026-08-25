import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { personName, type KycCase, type ScamAlert, type TrustActionKind } from "./types";

const COPY: Record<
  TrustActionKind,
  { title: string; body: string; confirm: string }
> = {
  grant_badge: {
    title: "Grant Verified Poster",
    body: "Badge shows on this poster's listings. Confirm the ID or deed matches the Clerk account.",
    confirm: "Grant badge",
  },
  revoke_badge: {
    title: "Revoke Verified Poster",
    body: "Listings lose the badge immediately. The account stays active unless you suspend separately.",
    confirm: "Revoke badge",
  },
  reject_kyc: {
    title: "Reject this submission",
    body: "Poster can upload again. No badge is granted.",
    confirm: "Reject",
  },
  warn: {
    title: "Warn these accounts",
    body: "A warning stays on each record. Accounts stay active.",
    confirm: "Send warning",
  },
  restrict: {
    title: "Suspend these accounts",
    body: "Suspended accounts cannot publish until restored from Users.",
    confirm: "Suspend",
  },
  review: {
    title: "Start manual review",
    body: "Marks the alert in review so the cluster stays on someone's desk.",
    confirm: "Start review",
  },
};

type Props = {
  kind: TrustActionKind | null;
  kyc: KycCase | null;
  alert: ScamAlert | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function TrustActionDialog({
  kind,
  kyc,
  alert,
  note,
  onNote,
  onCancel,
  onConfirm,
}: Props) {
  if (!kind) return null;
  const copy = COPY[kind];
  const canSubmit = kind === "review" || note.trim().length > 0;
  const danger = kind === "restrict" || kind === "reject_kyc" || kind === "revoke_badge";
  const moss = kind === "grant_badge" || kind === "review";
  const target = kyc
    ? personName(kyc.poster)
    : alert
      ? `${alert.accounts.length} accounts · ${alert.signal}`
      : "";

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
          {copy.body} Target: {target}.
        </H>
        {kind !== "review" ? (
          <H as="label" className="mt-4 block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              Staff note
            </H>
            <H
              as="textarea"
              value={note}
              rows={4}
              onChange={(event: { target: { value: string } }) =>
                onNote(event.target.value)
              }
              placeholder="Why this action, in one or two lines"
              className="w-full resize-y rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            />
          </H>
        ) : null}
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton
            tone={danger ? "ember" : moss ? "moss" : "ochre"}
            disabled={!canSubmit}
            onClick={onConfirm}
          >
            {copy.confirm}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}
