import { MOCK_ALERTS, MOCK_DOMAINS, MOCK_KYC } from "./mockTrust";
import {
  ANCHOR_ISO,
  canClear,
  canGrant,
  canReject,
  canReopen,
  canRestrict,
  canReview,
  canRevoke,
  canWarn,
  countKycByQueue,
  emptyOverview,
  institutionGuess,
  isOpenAlert,
  personName,
  severityRank,
  type AcademicDomain,
  type AlertStatus,
  type KycCase,
  type KycQueue,
  type ListAlertsParams,
  type ListAlertsResult,
  type ListKycParams,
  type ListKycResult,
  type ScamAlert,
  type TrustHistoryEntry,
  type TrustOverview,
  type TrustPerson,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

let kycStore: KycCase[] = clone(MOCK_KYC);
let alertStore: ScamAlert[] = clone(MOCK_ALERTS);
let domainStore: AcademicDomain[] = clone(MOCK_DOMAINS);

export function resetTrustMockStore(): void {
  kycStore = clone(MOCK_KYC);
  alertStore = clone(MOCK_ALERTS);
  domainStore = clone(MOCK_DOMAINS);
}

function historyEntry(
  kind: TrustHistoryEntry["kind"],
  note: string,
): TrustHistoryEntry {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    note,
    at: ANCHOR_ISO,
    actor: "You",
  };
}

function requireNote(note: string): string {
  const trimmed = note.trim();
  if (!trimmed) throw new Error("Staff note required");
  return trimmed;
}

function findKycOrThrow(id: string): KycCase {
  const row = kycStore.find((item) => item.id === id);
  if (!row) throw new Error(`KYC case not found: ${id}`);
  return row;
}

function findAlertOrThrow(id: string): ScamAlert {
  const row = alertStore.find((item) => item.id === id);
  if (!row) throw new Error(`Alert not found: ${id}`);
  return row;
}

function findDomainOrThrow(id: string): AcademicDomain {
  const row = domainStore.find((item) => item.id === id);
  if (!row) throw new Error(`Domain not found: ${id}`);
  return row;
}

function matchesKyc(row: KycCase, needle: string): boolean {
  if (!needle) return true;
  const hay =
    `${personName(row.poster)} ${row.poster.email} ${row.poster.phone} ${row.poster.area} ${row.id}`.toLowerCase();
  return hay.includes(needle);
}

function matchesAlert(row: ScamAlert, needle: string): boolean {
  if (!needle) return true;
  const names = row.accounts
    .map((account) => `${personName(account)} ${account.email} ${account.phone}`)
    .join(" ");
  const hay =
    `${row.title} ${row.detail} ${row.signal} ${row.pattern} ${names} ${row.id}`.toLowerCase();
  return hay.includes(needle);
}

function alertStatusWeight(status: AlertStatus): number {
  if (status === "open") return 0;
  if (status === "reviewing") return 1;
  if (status === "warned") return 2;
  if (status === "suspended") return 3;
  return 4;
}

function buildOverview(): TrustOverview {
  return {
    pending: kycStore.filter((row) => row.queue === "pending").length,
    verifiedBadges: kycStore.filter((row) => row.badge === "verified").length,
    openAlerts: alertStore.filter((row) => isOpenAlert(row.status)).length,
    domainCount: domainStore.length,
  };
}

export function overviewFromStore(): TrustOverview {
  return buildOverview();
}

function patchAccounts(
  ids: Set<string>,
  patch: (person: TrustPerson) => TrustPerson,
) {
  kycStore = kycStore.map((row) =>
    ids.has(row.poster.id)
      ? { ...row, poster: { ...row.poster, ...patch(row.poster) } }
      : row,
  );
  alertStore = alertStore.map((row) => ({
    ...row,
    accounts: row.accounts.map((account) =>
      ids.has(account.id) ? { ...account, ...patch(account) } : account,
    ),
  }));
}

function appendKycHistory(ids: Set<string>, kind: TrustHistoryEntry["kind"], note: string) {
  const entry = historyEntry(kind, note);
  kycStore = kycStore.map((row) =>
    ids.has(row.poster.id)
      ? { ...row, history: [...row.history, { ...entry, id: `${entry.id}-${row.id}` }] }
      : row,
  );
}

export function listKycFromStore(params: ListKycParams = {}): ListKycResult {
  const queue: KycQueue = params.queue ?? "pending";
  const pageSize = params.pageSize ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const needle = params.q?.trim().toLowerCase() ?? "";

  const counts = countKycByQueue(kycStore);
  const filtered = kycStore
    .filter((row) => row.queue === queue)
    .filter((row) => matchesKyc(row, needle))
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((row) => clone(row));

  return {
    items,
    total,
    page,
    pageSize,
    counts,
    overview: buildOverview(),
  };
}

export function getKycFromStore(id: string): KycCase {
  return clone(findKycOrThrow(id));
}

export function grantBadgeInStore(id: string, note: string): KycCase {
  const row = findKycOrThrow(id);
  if (!canGrant(row)) {
    throw new Error("Grant only from pending or revoked. Reopen rejected cases first.");
  }
  const trimmed = requireNote(note);
  const next: KycCase = {
    ...row,
    queue: "verified",
    badge: "verified",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note: trimmed,
    history: [...row.history, historyEntry("grant_badge", trimmed)],
  };
  kycStore = kycStore.map((item) => (item.id === id ? next : item));
  return clone(next);
}

export function revokeBadgeInStore(id: string, note: string): KycCase {
  const row = findKycOrThrow(id);
  if (!canRevoke(row)) throw new Error("Only verified posters can be revoked");
  const trimmed = requireNote(note);
  const next: KycCase = {
    ...row,
    queue: "revoked",
    badge: "revoked",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note: trimmed,
    history: [...row.history, historyEntry("revoke_badge", trimmed)],
  };
  kycStore = kycStore.map((item) => (item.id === id ? next : item));
  return clone(next);
}

export function rejectKycInStore(id: string, note: string): KycCase {
  const row = findKycOrThrow(id);
  if (!canReject(row)) throw new Error("Reject only applies to pending submissions");
  const trimmed = requireNote(note);
  const next: KycCase = {
    ...row,
    queue: "rejected",
    badge: "none",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note: trimmed,
    history: [...row.history, historyEntry("reject_kyc", trimmed)],
  };
  kycStore = kycStore.map((item) => (item.id === id ? next : item));
  return clone(next);
}

export function reopenKycInStore(id: string, note: string): KycCase {
  const row = findKycOrThrow(id);
  if (!canReopen(row)) throw new Error("Reopen only rejected or revoked cases");
  const trimmed = requireNote(note);
  const next: KycCase = {
    ...row,
    queue: "pending",
    badge: "none",
    reviewer: "You",
    reviewedAt: ANCHOR_ISO,
    note: trimmed,
    history: [...row.history, historyEntry("reopen", trimmed)],
  };
  kycStore = kycStore.map((item) => (item.id === id ? next : item));
  return clone(next);
}

export function listAlertsFromStore(
  params: ListAlertsParams = {},
): ListAlertsResult {
  const pageSize = params.pageSize ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const needle = params.q?.trim().toLowerCase() ?? "";
  const severity = params.severity ?? "all";
  const status = params.status ?? "all";

  const filtered = alertStore
    .filter((row) => (severity === "all" ? true : row.severity === severity))
    .filter((row) => (status === "all" ? true : row.status === status))
    .filter((row) => matchesAlert(row, needle))
    .sort((a, b) => {
      const byStatus = alertStatusWeight(a.status) - alertStatusWeight(b.status);
      if (byStatus !== 0) return byStatus;
      const bySev = severityRank(a.severity) - severityRank(b.severity);
      if (bySev !== 0) return bySev;
      return a.createdAt < b.createdAt ? 1 : -1;
    });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((row) => clone(row));

  return {
    items,
    total,
    page,
    pageSize,
    overview: buildOverview(),
  };
}

export function getAlertFromStore(id: string): ScamAlert {
  return clone(findAlertOrThrow(id));
}

export function warnAlertInStore(id: string, note: string): ScamAlert {
  const row = findAlertOrThrow(id);
  if (!canWarn(row)) throw new Error("Settled alerts cannot be warned");
  const trimmed = requireNote(note);
  const ids = new Set(row.accounts.map((account) => account.id));
  patchAccounts(ids, (person) => ({
    ...person,
    warningCount: person.warningCount + 1,
  }));
  appendKycHistory(ids, "warn", trimmed);
  const current = findAlertOrThrow(id);
  const next: ScamAlert = {
    ...current,
    status: "warned",
    history: [...current.history, historyEntry("warn", trimmed)],
  };
  alertStore = alertStore.map((item) => (item.id === id ? next : item));
  return clone(findAlertOrThrow(id));
}

export function restrictAlertInStore(id: string, note: string): ScamAlert {
  const row = findAlertOrThrow(id);
  if (!canRestrict(row)) throw new Error("Settled alerts cannot be suspended");
  const trimmed = requireNote(note);
  const ids = new Set(row.accounts.map((account) => account.id));
  patchAccounts(ids, (person) => ({
    ...person,
    accountStatus: "restricted",
  }));
  appendKycHistory(ids, "restrict", trimmed);
  const current = findAlertOrThrow(id);
  const next: ScamAlert = {
    ...current,
    status: "suspended",
    history: [...current.history, historyEntry("restrict", trimmed)],
  };
  alertStore = alertStore.map((item) => (item.id === id ? next : item));
  return clone(findAlertOrThrow(id));
}

export function reviewAlertInStore(id: string): ScamAlert {
  const row = findAlertOrThrow(id);
  if (!canReview(row)) throw new Error("Alert is already in review or settled");
  const next: ScamAlert = {
    ...row,
    status: "reviewing",
    history: [...row.history, historyEntry("review", "Moved to review.")],
  };
  alertStore = alertStore.map((item) => (item.id === id ? next : item));
  return clone(next);
}

export function clearAlertInStore(id: string, note: string): ScamAlert {
  const row = findAlertOrThrow(id);
  if (!canClear(row)) throw new Error("Alert is already cleared");
  const trimmed = requireNote(note);
  const next: ScamAlert = {
    ...row,
    status: "cleared",
    history: [...row.history, historyEntry("clear", trimmed)],
  };
  alertStore = alertStore.map((item) => (item.id === id ? next : item));
  return clone(next);
}

export function listDomainsFromStore(): AcademicDomain[] {
  return domainStore.map((row) => clone(row));
}

export function addDomainInStore(domain: string): AcademicDomain {
  const existing = domainStore.find((row) => row.domain === domain);
  if (existing) throw new Error("That domain is already mapped");
  const next: AcademicDomain = {
    id: `dom-${Date.now().toString(36)}`,
    domain,
    institution: institutionGuess(domain),
    studentCount: 0,
  };
  domainStore = [...domainStore, next];
  return clone(next);
}

export function removeDomainInStore(id: string, note: string): AcademicDomain {
  const row = findDomainOrThrow(id);
  requireNote(note);
  domainStore = domainStore.filter((item) => item.id !== id);
  return clone(row);
}

export function emptyTrustOverview(): TrustOverview {
  return emptyOverview();
}
