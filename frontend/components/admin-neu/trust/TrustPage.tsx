import { useDeferredValue, useMemo, useState } from "react";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { DomainMappingCard } from "./DomainMappingCard";
import { ScamAlertsFeed } from "./ScamAlertsFeed";
import { TrustActionDialog } from "./TrustActionDialog";
import { TrustToolbar } from "./TrustToolbar";
import { VerificationDetail } from "./VerificationDetail";
import { VerificationQueue } from "./VerificationQueue";
import { MOCK_ALERTS, MOCK_DOMAINS, MOCK_KYC } from "./mockTrust";
import {
  severityRank,
  type AcademicDomain,
  type AlertStatus,
  type KycCase,
  type KycQueue,
  type ScamAlert,
  type TrustActionKind,
} from "./types";

export function TrustPage() {
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const [cases, setCases] = useState(MOCK_KYC);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [domains, setDomains] = useState(MOCK_DOMAINS);
  const [queue, setQueue] = useState<KycQueue>("pending");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    kind: TrustActionKind;
    kycId?: string;
    alertId?: string;
  } | null>(null);
  const [note, setNote] = useState("");

  const counts = useMemo(
    () => ({
      pending: cases.filter((row) => row.queue === "pending").length,
      verified: cases.filter((row) => row.queue === "verified").length,
      rejected: cases.filter((row) => row.queue === "rejected").length,
    }),
    [cases],
  );

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return cases
      .filter((row) => row.queue === queue)
      .filter((row) => {
        if (!needle) return true;
        const hay =
          `${row.poster.firstName} ${row.poster.lastName} ${row.poster.email} ${row.poster.phone} ${row.poster.area}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }, [cases, queue, deferredQuery]);

  const resolvedId = compact
    ? selectedId
    : visible.some((row) => row.id === selectedId)
      ? selectedId
      : (visible[0]?.id ?? null);

  const selected = cases.find((row) => row.id === resolvedId) ?? null;
  const pendingKyc = cases.find((row) => row.id === pending?.kycId) ?? null;
  const pendingAlert = alerts.find((row) => row.id === pending?.alertId) ?? null;

  const openAlerts = alerts.filter(
    (row) => row.status === "open" || row.status === "reviewing",
  ).length;
  const verifiedBadges = cases.filter((row) => row.badge === "verified").length;

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const statusWeight = (status: AlertStatus) =>
          status === "open" ? 0 : status === "reviewing" ? 1 : 2;
        const byStatus = statusWeight(a.status) - statusWeight(b.status);
        if (byStatus !== 0) return byStatus;
        const bySev = severityRank(a.severity) - severityRank(b.severity);
        if (bySev !== 0) return bySev;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [alerts],
  );

  function applyKyc(kycId: string, kind: TrustActionKind, staffNote: string) {
    const now = new Date().toISOString();
    setCases((current) =>
      current.map((row) => {
        if (row.id !== kycId) return row;
        if (kind === "grant_badge") {
          return {
            ...row,
            queue: "verified",
            badge: "verified",
            reviewer: "You",
            reviewedAt: now,
            note: staffNote,
          };
        }
        if (kind === "revoke_badge") {
          return {
            ...row,
            badge: "revoked",
            reviewer: "You",
            reviewedAt: now,
            note: staffNote,
          };
        }
        return {
          ...row,
          queue: "rejected",
          badge: row.badge === "verified" ? "revoked" : "none",
          reviewer: "You",
          reviewedAt: now,
          note: staffNote,
        };
      }),
    );
    if (kind === "grant_badge") setQueue("verified");
    if (kind === "reject_kyc") setQueue("rejected");
  }

  function applyAlert(alertId: string, kind: TrustActionKind, staffNote: string) {
    setAlerts((current) =>
      current.map((row) => {
        if (row.id !== alertId) return row;
        const nextStatus: AlertStatus =
          kind === "restrict"
            ? "suspended"
            : kind === "warn"
              ? "warned"
              : "reviewing";
        const nextAccounts =
          kind === "restrict"
            ? row.accounts.map((account) => ({
                ...account,
                accountStatus: "restricted" as const,
              }))
            : row.accounts;
        return { ...row, status: nextStatus, accounts: nextAccounts };
      }),
    );
    if (kind === "restrict" || kind === "warn") {
      const target = alerts.find((row) => row.id === alertId);
      if (!target) return;
      const ids = new Set(target.accounts.map((account) => account.id));
      setCases((current) =>
        current.map((row) =>
          ids.has(row.poster.id)
            ? {
                ...row,
                poster: {
                  ...row.poster,
                  accountStatus:
                    kind === "restrict" ? "restricted" : row.poster.accountStatus,
                },
                note: staffNote || row.note,
              }
            : row,
        ),
      );
    }
  }

  function requestKyc(
    kyc: KycCase,
    kind: Extract<TrustActionKind, "grant_badge" | "revoke_badge" | "reject_kyc">,
  ) {
    setPending({ kind, kycId: kyc.id });
    setNote("");
  }

  function requestAlert(
    alert: ScamAlert,
    kind: Extract<TrustActionKind, "warn" | "restrict" | "review">,
  ) {
    if (kind === "review") {
      applyAlert(alert.id, "review", "");
      return;
    }
    setPending({ kind, alertId: alert.id });
    setNote("");
  }

  function addDomain(domain: string): boolean {
    if (domains.some((row) => row.domain === domain)) return false;
    const next: AcademicDomain = {
      id: `dom-${Date.now()}`,
      domain,
      institution: institutionGuess(domain),
      studentCount: 0,
    };
    setDomains((current) => [...current, next]);
    return true;
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Trust Center
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Review poster IDs, catch shared IPs and phones, map student domains
            for Clerk.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pending KYC" value={String(counts.pending)} />
        <Kpi label="Open alerts" value={String(openAlerts)} />
        <Kpi label="Verified posters" value={String(verifiedBadges)} />
        <Kpi label="Mapped domains" value={String(domains.length)} />
      </H>

      <H>
        <H as="h2" className="font-display text-lg font-semibold">
          Poster verification
        </H>
        <H as="p" className="mt-1 text-sm text-clay-700">
          Government ID or deed in the tray. Grant or revoke the badge from here.
        </H>
      </H>

      <TrustToolbar
        query={query}
        onQuery={setQuery}
        queue={queue}
        onQueue={(next) => {
          setQueue(next);
          setSelectedId(null);
        }}
        counts={counts}
      />

      {compact && selected ? (
        <VerificationDetail
          kyc={selected}
          showBack
          onBack={() => setSelectedId(null)}
          onAction={(kind) => requestKyc(selected, kind)}
        />
      ) : compact ? (
        <VerificationQueue
          cases={visible}
          selectedId={resolvedId}
          onSelect={(row) => setSelectedId(row.id)}
        />
      ) : (
        <H className="grid items-start gap-4 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <VerificationQueue
            cases={visible}
            selectedId={resolvedId}
            onSelect={(row) => setSelectedId(row.id)}
          />
          <H className="lg:sticky lg:top-6">
            <VerificationDetail
              kyc={selected}
              onAction={(kind) => {
                if (!selected) return;
                requestKyc(selected, kind);
              }}
            />
          </H>
        </H>
      )}

      <H className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <ScamAlertsFeed alerts={sortedAlerts} onAction={requestAlert} />
        <H className="lg:sticky lg:top-6">
          <DomainMappingCard
            domains={domains}
            onAdd={addDomain}
            onRemove={(id) =>
              setDomains((current) => current.filter((row) => row.id !== id))
            }
          />
        </H>
      </H>

      <TrustActionDialog
        kind={pending?.kind ?? null}
        kyc={pendingKyc}
        alert={pendingAlert}
        note={note}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kycId) applyKyc(pending.kycId, pending.kind, note.trim());
          if (pending.alertId) applyAlert(pending.alertId, pending.kind, note.trim());
          setPending(null);
          setNote("");
        }}
      />
    </H>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold text-clay-900">
        {value}
      </H>
    </NeuSurface>
  );
}

function institutionGuess(domain: string): string {
  const host = domain.replace(/^mail\./, "").split(".")[0] ?? domain;
  return host.toUpperCase();
}
