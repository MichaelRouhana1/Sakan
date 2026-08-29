import { ExternalLink, Eye, RotateCcw } from "lucide-react-native";
import { Link, type Href } from "expo-router";
import type { ReactNode } from "react";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_STACK_AFTER_HEAD,
} from "../tableChrome";
import { CreditKindPill, CreditStatusPill } from "./CreditPills";
import {
  bundleLabel,
  canRefund,
  channelLabel,
  creditsLabel,
  formatStamp,
  formatUsd,
  initials,
  personName,
  type LedgerTx,
} from "./types";

/** Must stay in source so `npm run admin:css` emits these arbitrary cols. */
const DESKTOP_ROW =
  "grid w-full min-w-0 grid-cols-[minmax(0,13rem)_minmax(0,8.5rem)_6.25rem_5rem_6.5rem_5rem_7.25rem_minmax(11.5rem,1fr)] items-center justify-start gap-x-3";

type Props = {
  transactions: LedgerTx[];
  hasQuery: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  onDetail: (tx: LedgerTx) => void;
  onRefund: (tx: LedgerTx) => void;
};

export function CreditsTable({
  transactions,
  hasQuery,
  page,
  pageCount,
  total,
  onPage,
  onDetail,
  onRefund,
}: Props) {
  const bp = useBreakpoint();
  const compact = bp !== "desktop";

  if (transactions.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          {hasQuery ? "No matches" : "No transactions"}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          {hasQuery
            ? "Try another name, reference, or listing id."
            : "Widen filters or date range."}
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="flex flex-col gap-3">
        <H className="flex items-center justify-between px-1">
          <H as="span" className="text-xs text-clay-500">
            {total} total
          </H>
        </H>
        <H className="grid gap-3">
          {transactions.map((tx) => (
            <TxCard
              key={tx.id}
              tx={tx}
              onDetail={() => onDetail(tx)}
              onRefund={() => onRefund(tx)}
            />
          ))}
        </H>
        <Pager page={page} pageCount={pageCount} onPage={onPage} />
      </H>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      <H className="flex items-center justify-between px-1">
        <H as="span" className="text-xs text-clay-500">
          {total} total
        </H>
      </H>

      <NeuSurface inset className="min-w-0 overflow-hidden p-3">
        <H className="neu-scroll overflow-x-auto">
          <H className="min-w-[1120px]">
            <H className={[DESKTOP_ROW, ADMIN_TABLE_HEAD].join(" ")}>
              <H as="span">User</H>
              <H as="span">Reference</H>
              <H as="span">Amount</H>
              <H as="span">Method</H>
              <H as="span">Status</H>
              <H as="span">Listing</H>
              <H as="span">When</H>
              <H as="span" className="text-right">
                Actions
              </H>
            </H>

            <H className={ADMIN_TABLE_STACK_AFTER_HEAD}>
            {transactions.map((tx) => (
              <H
                key={tx.id}
                className={[DESKTOP_ROW, ADMIN_TABLE_ROW].join(" ")}
              >
                <H className="flex min-w-0 items-center gap-3">
                  <Avatar user={tx.user} />
                  <H className="min-w-0">
                    <H as="p" className="truncate font-display text-sm font-semibold">
                      {personName(tx.user)}
                    </H>
                    <H as="p" className="truncate text-xs text-clay-700">
                      {tx.user.email}
                    </H>
                  </H>
                </H>

                <H className="min-w-0">
                  <CreditKindPill kind={tx.kind} />
                  <H
                    as="p"
                    className="mt-1 truncate font-display text-xs tabular-nums text-clay-700"
                  >
                    {tx.referenceId}
                  </H>
                </H>

                <AmountCell tx={tx} />

                <H as="span" className="text-sm text-clay-700">
                  {channelLabel(tx.channel)}
                </H>

                <CreditStatusPill status={tx.status} />

                <ListingCell listingId={tx.listingId} />

                <H as="span" className="whitespace-nowrap text-sm text-clay-700">
                  {formatStamp(tx.createdAt)}
                </H>

                <H className="flex justify-end">
                  <RowActions
                    compact
                    tx={tx}
                    onDetail={() => onDetail(tx)}
                    onRefund={() => onRefund(tx)}
                  />
                </H>
              </H>
            ))}
            </H>
          </H>
        </H>
      </NeuSurface>

      <Pager page={page} pageCount={pageCount} onPage={onPage} />
    </H>
  );
}

function TxCard({
  tx,
  onDetail,
  onRefund,
}: {
  tx: LedgerTx;
  onDetail: () => void;
  onRefund: () => void;
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
              {tx.user.email}
            </H>
          </H>
        </H>
        <CreditStatusPill status={tx.status} />
      </H>

      <H className="mt-3 flex flex-wrap items-center gap-2">
        <CreditKindPill kind={tx.kind} />
        <H
          as="span"
          className="rounded-full bg-clay-100 px-2.5 py-1 font-display text-xs tabular-nums text-clay-700 shadow-neu-in-sm"
        >
          {tx.referenceId}
        </H>
      </H>

      <H className="mt-3 grid grid-cols-2 gap-2">
        <Meta label="Amount">
          <AmountCell tx={tx} />
        </Meta>
        <Meta label="Method">
          <H as="span" className="text-sm text-clay-900">
            {channelLabel(tx.channel)}
          </H>
        </Meta>
        <Meta label="When">
          <H as="span" className="text-sm text-clay-900">
            {formatStamp(tx.createdAt)}
          </H>
        </Meta>
        <Meta label="Listing">
          <ListingCell listingId={tx.listingId} />
        </Meta>
      </H>

      <H className="mt-3">
        <RowActions tx={tx} onDetail={onDetail} onRefund={onRefund} />
      </H>
    </H>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm">
      <H
        as="p"
        className="text-[10px] font-semibold uppercase tracking-wide text-clay-500"
      >
        {label}
      </H>
      <H className="mt-1">{children}</H>
    </H>
  );
}

function AmountCell({ tx }: { tx: LedgerTx }) {
  return (
    <H>
      <H as="p" className="font-display text-sm font-semibold tabular-nums">
        {tx.amountUsdCents !== 0 ? formatUsd(tx.amountUsdCents) : "—"}
      </H>
      <H as="p" className="text-xs text-clay-700">
        {creditsLabel(tx)}
        {tx.kind === "purchase" ? ` · ${bundleLabel(tx.bundleType)}` : ""}
      </H>
    </H>
  );
}

function ListingCell({ listingId }: { listingId: string | null }) {
  if (!listingId) {
    return (
      <H as="span" className="text-sm text-clay-500">
        —
      </H>
    );
  }
  return (
    <Link
      href={`/admin/listings?id=${listingId}` as Href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-moss"
    >
      <ExternalLink size={14} strokeWidth={2} color="currentColor" />
      {listingId}
    </Link>
  );
}

function RowActions({
  tx,
  compact,
  onDetail,
  onRefund,
}: {
  tx: LedgerTx;
  compact?: boolean;
  onDetail: () => void;
  onRefund: () => void;
}) {
  const refund = canRefund(tx);
  const iconSize = compact ? 20 : 18;
  const iconBtn = compact ? "h-10 w-10 shrink-0 !px-0 !py-0" : "";

  return (
    <H
      className={
        compact
          ? "flex flex-wrap items-center justify-end gap-2"
          : "flex flex-wrap gap-2"
      }
    >
      <NeuButton
        ariaLabel="View transaction"
        className={iconBtn}
        onClick={onDetail}
      >
        <Eye size={iconSize} strokeWidth={2} color="currentColor" />
        {compact ? null : "View"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={!refund}
        ariaLabel="Issue credit refund"
        className={iconBtn}
        onClick={onRefund}
      >
        <RotateCcw size={iconSize} strokeWidth={2} color="currentColor" />
        {compact ? null : "Refund"}
      </NeuButton>
      {tx.listingId ? (
        <Link
          href={`/admin/listings?id=${tx.listingId}` as Href}
          className={[
            "inline-flex items-center gap-2 rounded-full bg-clay-100 font-medium text-moss shadow-neu-sm",
            "transition-shadow duration-press active:shadow-press",
            compact ? "h-10 px-3.5 text-sm" : "px-3.5 py-2 text-sm",
          ].join(" ")}
        >
          <ExternalLink size={compact ? 16 : 15} strokeWidth={2} color="currentColor" />
          {compact ? "Listing" : "Revoke listing"}
        </Link>
      ) : null}
    </H>
  );
}

function Pager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <H className="flex items-center justify-between gap-3 px-1">
      <NeuButton
        disabled={page <= 1}
        className="text-xs"
        onClick={() => onPage(page - 1)}
      >
        Previous
      </NeuButton>
      <H as="span" className="text-xs text-clay-700">
        Page {page} / {pageCount}
      </H>
      <NeuButton
        disabled={page >= pageCount}
        className="text-xs"
        onClick={() => onPage(page + 1)}
      >
        Next
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
