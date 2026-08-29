import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  personName,
  type AcademicDomain,
  type KycCase,
  type ScamAlert,
  type TrustActionKind,
} from "./types";

const COPY: Record<
  Exclude<TrustActionKind, "review">,
  { title: string; body: string; confirm: string }
> = {
  grant_badge: {
    title: "Grant Verified Poster",
    body: "Manual poster badge. Confirm the ID or deed matches the account. Not a Veriff or Clerk student badge.",
    confirm: "Grant badge",
  },
  revoke_badge: {
    title: "Revoke Verified Poster",
    body: "Moves the case to Revoked. Listings lose the badge. Account stays active unless you suspend separately.",
    confirm: "Revoke badge",
  },
  reject_kyc: {
    title: "Reject this submission",
    body: "Pending only. Poster can upload again after you reopen.",
    confirm: "Reject",
  },
  reopen: {
    title: "Reopen this case",
    body: "Returns rejected or revoked cases to Pending. Badge stays off until you grant again.",
    confirm: "Reopen",
  },
  warn: {
    title: "Warn these accounts",
    body: "Adds a warning on each clustered account. Accounts stay active. Demo does not write Users.",
    confirm: "Send warning",
  },
  restrict: {
    title: "Suspend these accounts",
    body: "Marks clustered accounts restricted here and on matching KYC posters. Restore from Users later (not wired).",
    confirm: "Suspend",
  },
  clear: {
    title: "Clear this alert",
    body: "Closes the pattern as handled. Does not change account status.",
    confirm: "Clear alert",
  },
  remove_domain: {
    title: "Remove this domain",
    body: "Drops it from the demo student-domain map. Institutions registry stays untouched.",
    confirm: "Remove domain",
  },
};

type DialogKind = Exclude<TrustActionKind, "review">;

type Props = {
  kind: DialogKind | null;
  kyc: KycCase | null;
  alert: ScamAlert | null;
  domain: AcademicDomain | null;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function TrustActionDialog({
  kind,
  kyc,
  alert,
  domain,
  note,
  onNote,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  if (!kind) return null;
  const copy = COPY[kind];
  const canSubmit = note.trim().length > 0 && !busy;
  const danger =
    kind === "restrict" ||
    kind === "reject_kyc" ||
    kind === "revoke_badge" ||
    kind === "remove_domain";
  const moss = kind === "grant_badge" || kind === "reopen" || kind === "clear";
  const target = kyc
    ? personName(kyc.poster)
    : alert
      ? `${alert.accounts.length} accounts · ${alert.signal}`
      : domain
        ? `@${domain.domain}`
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
        <H as="label" className="mt-4 block">
          <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
            Staff note
          </H>
          <H className="rounded-neu-md bg-clay-100 shadow-neu-in-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-moss">
            <H
              as="textarea"
              value={note}
              rows={4}
              onChange={(event: { target: { value: string } }) =>
                onNote(event.target.value)
              }
              placeholder="Why this action, in one or two lines"
              className="w-full resize-y border-0 bg-transparent px-3 py-2.5 text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
            />
          </H>
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel} disabled={busy}>
            Cancel
          </NeuButton>
          <NeuButton
            tone={danger ? "ember" : moss ? "moss" : "ochre"}
            disabled={!canSubmit}
            onClick={onConfirm}
          >
            {busy ? "Working…" : copy.confirm}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}