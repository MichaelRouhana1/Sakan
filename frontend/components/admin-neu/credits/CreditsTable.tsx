import { Check, X } from "lucide-react-native";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { CreditKindPill, CreditStatusPill } from "./CreditPills";
import {
  bundleLabel,
  channelLabel,
  creditsLabel,
  formatDay,
  formatUsd,
  initials,
  personName,
  type LedgerTx,
} from "./types";

const DESKTOP_ROW =
  "grid grid-cols-[minmax(200px,1.5fr)_minmax(140px,1fr)_110px_100px_110px_minmax(120px,1fr)] items-center gap-3";

type Props = {
  transactions: LedgerTx[];
  onApprove: (tx: LedgerTx) => void;
  onReject: (tx: LedgerTx) => void;
};

export function CreditsTable({ transactions, onApprove, onReject }: Props) {
  const bp = useBreakpoint();
  const compact = bp === "mobile";

  if (transactions.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No transactions in this view
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Switch Purchased and Granted, or another status.
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="grid gap-3">
        {transactions.map((tx) => (
          <TxCard
            key={tx.id}
            tx={tx}
            onApprove={() => onApprove(tx)}
            onReject={() => onReject(tx)}
          />
        ))}
      </H>
    );
  }

  return (
    <NeuSurface inset className="overflow-hidden">
      <H className="neu-scroll overflow-x-auto">
        <H className="min-w-[860px]">
          <H
            className={[
              DESKTOP_ROW,
              "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
            ].join(" ")}
          >
            <H as="span">Poster</H>
            <H as="span">Amount</H>
            <H as="span">Type</H>
            <H as="span">Status</H>
            <H as="span">Date</H>
            <H as="span" className="text-right">
              Review
            </H>
          </H>

          {transactions.map((tx) => (
            <H
              key={tx.id}
              className={[
                DESKTOP_ROW,
                "border-t border-clay-200/80 px-5 py-3.5",
              ].join(" ")}
            >
              <H className="flex min-w-0 items-center gap-3">
                <Avatar user={tx.user} />
                <H className="min-w-0">
                  <H as="p" className="truncate font-display text-sm font-semibold">
                    {personName(tx.user)}
                  </H>
                  <H as="p" className="truncate text-xs text-clay-700">
                    {tx.referenceId} · {channelLabel(tx.channel)}
                  </H>
                </H>
              </H>
              <AmountCell tx={tx} />
              <CreditKindPill kind={tx.kind} />
              <CreditStatusPill status={tx.status} />
              <H as="span" className="text-sm text-clay-700">
                {formatDay(tx.createdAt)}
              </H>
              <H className="flex justify-end">
                <ReviewActions
                  compact
                  tx={tx}
                  onApprove={() => onApprove(tx)}
                  onReject={() => onReject(tx)}
                />
              </H>
            </H>
          ))}
        </H>
      </H>
    </NeuSurface>
  );
}

function TxCard({
  tx,
  onApprove,
  onReject,
}: {
  tx: LedgerTx;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <H className="rounded-neu bg-clay-100 p-4 shadow-neu-sm">
      <H className="flex items-start justify-between gap-3">
        <H className="flex min-w-0 items-center gap-3">
          <Avatar user={tx.user} />
          <H className="min-w-0">
            <H as="p" className="truncate font-display font-semibold">
              {personName(tx.user)}
            </H>
            <H as="p" className="truncate text-xs text-clay-700">
              {tx.referenceId}
            </H>
          </H>
        </H>
        <CreditStatusPill status={tx.status} />
      </H>
      <H className="mt-3 flex flex-wrap items-center gap-2">
        <CreditKindPill kind={tx.kind} />
        <H as="span" className="text-xs text-clay-700">
          {formatDay(tx.createdAt)}
        </H>
      </H>
      <H className="mt-3">
        <AmountCell tx={tx} />
      </H>
      <H className="mt-3">
        <ReviewActions tx={tx} onApprove={onApprove} onReject={onReject} />
      </H>
    </H>
  );
}

function AmountCell({ tx }: { tx: LedgerTx }) {
  return (
    <H>
      <H as="p" className="font-display text-sm font-semibold tabular-nums">
        {tx.kind === "purchased" ? formatUsd(tx.amountUsdCents) : "—"}
      </H>
      <H as="p" className="text-xs text-clay-700">
        {creditsLabel(tx)}
        {tx.kind === "purchased" ? ` · ${bundleLabel(tx.bundleType)}` : ""}
      </H>
    </H>
  );
}

function ReviewActions({
  tx,
  compact,
  onApprove,
  onReject,
}: {
  tx: LedgerTx;
  compact?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (tx.status !== "pending" || tx.kind !== "purchased") {
    return (
      <H as="span" className="text-xs text-clay-500">
        {tx.kind === "granted" ? "Staff grant" : "Settled"}
      </H>
    );
  }

  return (
    <H className={compact ? "flex justify-end gap-1.5" : "flex flex-wrap gap-2"}>
      <NeuButton
        tone="moss"
        ariaLabel="Approve purchase"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onApprove}
      >
        <Check size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Approve"}
      </NeuButton>
      <NeuButton
        tone="ember"
        ariaLabel="Reject purchase"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onReject}
      >
        <X size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Reject"}
      </NeuButton>
    </H>
  );
}

function Avatar({ user }: { user: LedgerTx["user"] }) {
  return (
    <H
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-xs font-semibold text-moss shadow-neu-in-sm"
      aria-hidden
    >
      {initials(user)}
    </H>
  );
}
