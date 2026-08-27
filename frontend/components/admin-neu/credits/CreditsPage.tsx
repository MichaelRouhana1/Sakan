import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { CreditReviewDialog } from "./CreditReviewDialog";
import { CreditsTable } from "./CreditsTable";
import { CreditsToolbar } from "./CreditsToolbar";
import { GrantCreditsDialog } from "./GrantCreditsDialog";
import { useAdminPayments } from "./useAdminPayments";
import { formatUsd } from "./types";

export function CreditsPage() {
  const state = useAdminPayments();

  const reviewKind =
    state.pending?.mode === "refund"
      ? "refund"
      : state.pending?.mode === "detail"
        ? "detail"
        : null;

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Finance desk
          </H>
          <H as="h1" className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Payments & ledger
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Audit purchases, listing spend, refunds, and staff adjustments.
            Not an approval queue. Demo gateway settles checkout instantly.
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data · API-ready
          </H>
          <NeuButton tone="moss" onClick={state.requestAdjust}>
            Manual adjustment
          </NeuButton>
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total revenue"
          value={formatUsd(state.overview.revenueCents)}
          hint="Completed purchases"
        />
        <Kpi
          label="Credits purchased"
          value={String(state.overview.creditsPurchased)}
          hint="Post + boost, settled"
        />
        <Kpi
          label="Credits spent"
          value={String(state.overview.creditsSpent)}
          hint="On listings"
        />
        <Kpi
          label="Completed / failed"
          value={`${state.overview.completed} / ${state.overview.failed}`}
          hint={`${state.overview.refunded} refunded · ${state.overview.disputed} disputed`}
        />
      </H>

      {state.flash ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {state.flash}
        </H>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading ledger…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load payments
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            {state.errorMessage ?? "Unknown error"}
          </H>
          <H className="mt-4 flex justify-center">
            <NeuButton tone="moss" onClick={state.retry}>
              Retry
            </NeuButton>
          </H>
        </NeuSurface>
      ) : null}

      {state.status === "ready" ? (
        <>
          <CreditsToolbar
            query={state.query}
            onQuery={state.setQuery}
            kind={state.kind}
            onKind={state.setKind}
            status={state.txStatus}
            onStatus={state.setTxStatus}
            channel={state.channel}
            onChannel={state.setChannel}
            range={state.range}
            onRange={state.setRange}
          />
          <CreditsTable
            transactions={state.items}
            hasQuery={state.hasQuery}
            page={state.page}
            pageCount={state.pageCount}
            total={state.total}
            onPage={state.setPage}
            onDetail={state.requestDetail}
            onRefund={state.requestRefund}
          />
        </>
      ) : null}

      <GrantCreditsDialog
        open={state.pending?.mode === "adjust"}
        users={state.targets}
        draft={state.adjust}
        onDraft={state.setAdjust}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmPending();
        }}
        busy={state.busy}
      />

      <CreditReviewDialog
        kind={reviewKind}
        tx={
          state.pending?.mode === "refund" || state.pending?.mode === "detail"
            ? state.pendingTx
            : null
        }
        note={state.note}
        onNote={state.setNote}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmPending();
        }}
        busy={state.busy}
      />
    </H>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold tabular-nums text-clay-900">
        {value}
      </H>
      <H as="p" className="mt-1 text-[11px] text-clay-500">
        {hint}
      </H>
    </NeuSurface>
  );
}
