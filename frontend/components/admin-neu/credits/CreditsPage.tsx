import { Plus } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { CreditReviewDialog } from "./CreditReviewDialog";
import { CreditsTable } from "./CreditsTable";
import { CreditsToolbar } from "./CreditsToolbar";
import { GrantCreditsDialog, type GrantDraft } from "./GrantCreditsDialog";
import { GRANT_TARGETS, MOCK_TRANSACTIONS } from "./mockTransactions";
import {
  formatUsd,
  personName,
  type LedgerTx,
  type TxKind,
  type TxStatus,
} from "./types";

type StatusFilter = TxStatus | "all";

const EMPTY_GRANT: GrantDraft = {
  userId: "",
  postCredits: "1",
  boostCredits: "0",
  note: "",
};

export function CreditsPage() {
  const [rows, setRows] = useState(MOCK_TRANSACTIONS);
  const [kind, setKind] = useState<TxKind>("purchased");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grant, setGrant] = useState(EMPTY_GRANT);
  const [review, setReview] = useState<{
    txId: string;
    kind: "approve" | "reject";
  } | null>(null);
  const [note, setNote] = useState("");

  const purchased = rows.filter((row) => row.kind === "purchased");
  const granted = rows.filter((row) => row.kind === "granted");
  const revenueCents = purchased
    .filter((row) => row.status === "success")
    .reduce((sum, row) => sum + row.amountUsdCents, 0);
  const creditsBought = purchased
    .filter((row) => row.status === "success")
    .reduce((sum, row) => sum + row.postCredits + row.boostCredits, 0);
  const creditsGranted = granted.reduce(
    (sum, row) => sum + row.postCredits + row.boostCredits,
    0,
  );

  const kindRows = kind === "purchased" ? purchased : granted;
  const statusCounts = {
    all: kindRows.length,
    success: kindRows.filter((row) => row.status === "success").length,
    pending: kindRows.filter((row) => row.status === "pending").length,
    failed: kindRows.filter((row) => row.status === "failed").length,
  };

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return rows
      .filter((row) => row.kind === kind)
      .filter((row) => (status === "all" ? true : row.status === status))
      .filter((row) => {
        if (!needle) return true;
        const hay =
          `${personName(row.user)} ${row.user.email} ${row.referenceId}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [rows, kind, status, deferredQuery]);

  const reviewTx = rows.find((row) => row.id === review?.txId) ?? null;

  function applyReview(txId: string, next: TxStatus, staffNote: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === txId
          ? { ...row, status: next, note: staffNote.trim() || row.note }
          : row,
      ),
    );
  }

  function applyGrant() {
    const user = GRANT_TARGETS.find((item) => item.id === grant.userId);
    if (!user) return;
    const post = Math.max(0, Math.floor(Number(grant.postCredits)) || 0);
    const boost = Math.max(0, Math.floor(Number(grant.boostCredits)) || 0);
    const next: LedgerTx = {
      id: `tx-${Date.now()}`,
      referenceId: `GR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      kind: "granted",
      status: "success",
      channel: "staff",
      bundleType: "custom",
      amountUsdCents: 0,
      postCredits: post,
      boostCredits: boost,
      createdAt: new Date().toISOString(),
      note: grant.note.trim(),
      user,
    };
    setRows((current) => [next, ...current]);
    setKind("granted");
    setStatus("all");
    setGrantOpen(false);
    setGrant(EMPTY_GRANT);
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Financial Ledger
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Track Whish and OMT credit buys. Approve slips, reject misses, and
            grant promo credits by hand.
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data
          </H>
          <NeuButton tone="moss" onClick={() => setGrantOpen(true)}>
            <Plus size={16} strokeWidth={1.75} />
            Grant credits
          </NeuButton>
        </H>
      </H>

      <H className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Total revenue" value={formatUsd(revenueCents)} hint="Approved purchases" />
        <Kpi label="Credits purchased" value={String(creditsBought)} hint="Post + boost, settled" />
        <Kpi label="Credits granted" value={String(creditsGranted)} hint="Staff promo / compensation" />
      </H>

      <CreditsToolbar
        query={query}
        onQuery={setQuery}
        kind={kind}
        onKind={(next) => {
          setKind(next);
          setStatus("all");
        }}
        status={status}
        onStatus={setStatus}
        purchasedCount={purchased.length}
        grantedCount={granted.length}
        statusCounts={statusCounts}
      />

      <CreditsTable
        transactions={visible}
        onApprove={(tx) => {
          setReview({ txId: tx.id, kind: "approve" });
          setNote("");
        }}
        onReject={(tx) => {
          setReview({ txId: tx.id, kind: "reject" });
          setNote("");
        }}
      />

      <GrantCreditsDialog
        open={grantOpen}
        users={GRANT_TARGETS}
        draft={grant}
        onDraft={setGrant}
        onCancel={() => {
          setGrantOpen(false);
          setGrant(EMPTY_GRANT);
        }}
        onConfirm={applyGrant}
      />

      <CreditReviewDialog
        kind={review?.kind ?? null}
        tx={reviewTx}
        note={note}
        onNote={setNote}
        onCancel={() => setReview(null)}
        onConfirm={() => {
          if (!review) return;
          applyReview(
            review.txId,
            review.kind === "approve" ? "success" : "failed",
            note,
          );
          setReview(null);
          setNote("");
        }}
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
