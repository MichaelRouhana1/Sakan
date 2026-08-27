export type AccountStatus = "active" | "restricted" | "banned";
export type KycQueue = "pending" | "verified" | "rejected" | "revoked";
export type BadgeState = "none" | "verified" | "revoked";
export type DocKind = "national_id" | "passport" | "property_deed";
export type DocSide = "front" | "back" | "full";
export type ScamPattern =
  | "shared_ip"
  | "duplicate_phone"
  | "rapid_signup"
  | "cloned_listings";
export type AlertSeverity = "watch" | "high" | "critical";
export type AlertStatus =
  | "open"
  | "reviewing"
  | "warned"
  | "suspended"
  | "cleared";

export type KycActionKind =
  | "grant_badge"
  | "revoke_badge"
  | "reject_kyc"
  | "reopen";
export type AlertActionKind = "warn" | "restrict" | "review" | "clear";
export type DomainActionKind = "remove_domain";
export type TrustActionKind = KycActionKind | AlertActionKind | DomainActionKind;
export type TrustHistoryKind = TrustActionKind;

export type TrustTab = "kyc" | "alerts" | "domains";

export type TrustPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountStatus: AccountStatus;
  warningCount: number;
};

export type KycDocument = {
  id: string;
  kind: DocKind;
  side: DocSide;
  issuedOn: string;
  numberMasked: string;
  extra?: string;
  url?: string;
};

export type TrustHistoryEntry = {
  id: string;
  kind: TrustHistoryKind;
  note: string;
  at: string;
  actor: string;
};

export type KycCase = {
  id: string;
  queue: KycQueue;
  submittedAt: string;
  reviewedAt: string | null;
  reviewer: string | null;
  note: string | null;
  poster: TrustPerson & {
    listingCount: number;
    area: string;
  };
  badge: BadgeState;
  documents: KycDocument[];
  history: TrustHistoryEntry[];
};

export type ScamAlert = {
  id: string;
  pattern: ScamPattern;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  title: string;
  detail: string;
  signal: string;
  accounts: TrustPerson[];
  listingIds: string[];
  history: TrustHistoryEntry[];
};

export type AcademicDomain = {
  id: string;
  domain: string;
  institution: string;
  studentCount: number;
};

export type KycQueueCounts = Record<KycQueue, number>;

export type TrustOverview = {
  pending: number;
  verifiedBadges: number;
  openAlerts: number;
  domainCount: number;
};

export type ListKycParams = {
  q?: string;
  queue?: KycQueue;
  page?: number;
  pageSize?: number;
};

export type ListKycResult = {
  items: KycCase[];
  total: number;
  page: number;
  pageSize: number;
  counts: KycQueueCounts;
  overview: TrustOverview;
};

export type ListAlertsParams = {
  q?: string;
  severity?: AlertSeverity | "all";
  status?: AlertStatus | "all";
  page?: number;
  pageSize?: number;
};

export type ListAlertsResult = {
  items: ScamAlert[];
  total: number;
  page: number;
  pageSize: number;
  overview: TrustOverview;
};

export const ANCHOR_ISO = "2026-08-25T12:00:00.000Z";

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export const TRUST_TABS: { id: TrustTab; label: string }[] = [
  { id: "kyc", label: "KYC" },
  { id: "alerts", label: "Alerts" },
  { id: "domains", label: "Domains" },
];

export const KYC_QUEUES: KycQueue[] = [
  "pending",
  "verified",
  "rejected",
  "revoked",
];

export const ALERT_SEVERITIES: (AlertSeverity | "all")[] = [
  "all",
  "critical",
  "high",
  "watch",
];

export const ALERT_STATUSES: (AlertStatus | "all")[] = [
  "all",
  "open",
  "reviewing",
  "warned",
  "suspended",
  "cleared",
];

export function personName(
  person: Pick<TrustPerson, "firstName" | "lastName">,
): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(
  person: Pick<TrustPerson, "firstName" | "lastName">,
): string {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function queueLabel(queue: KycQueue): string {
  if (queue === "pending") return "Pending";
  if (queue === "verified") return "Verified";
  if (queue === "revoked") return "Revoked";
  return "Rejected";
}

export function badgeLabel(badge: BadgeState): string {
  if (badge === "verified") return "Verified Poster";
  if (badge === "revoked") return "Badge revoked";
  return "No badge";
}

export function docKindLabel(kind: DocKind): string {
  if (kind === "national_id") return "National ID";
  if (kind === "passport") return "Passport";
  return "Property deed";
}

export function docSideLabel(side: DocSide): string {
  if (side === "front") return "Front";
  if (side === "back") return "Back";
  return "Full page";
}

export function patternLabel(pattern: ScamPattern): string {
  if (pattern === "shared_ip") return "Shared IP";
  if (pattern === "duplicate_phone") return "Duplicate phone";
  if (pattern === "rapid_signup") return "Rapid signups";
  return "Cloned listings";
}

export function severityLabel(severity: AlertSeverity): string {
  if (severity === "watch") return "Watch";
  if (severity === "high") return "High";
  return "Critical";
}

export function alertStatusLabel(status: AlertStatus): string {
  if (status === "open") return "Open";
  if (status === "reviewing") return "In review";
  if (status === "warned") return "Warned";
  if (status === "suspended") return "Suspended";
  return "Cleared";
}

export function accountStatusLabel(status: AccountStatus): string {
  if (status === "restricted") return "Suspended";
  if (status === "banned") return "Banned";
  return "Active";
}

export function parseDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^@/, "");
  if (!trimmed) return null;
  if (
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      trimmed,
    )
  ) {
    return null;
  }
  return trimmed;
}

export function severityRank(severity: AlertSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "high") return 1;
  return 2;
}

export function emptyKycCounts(): KycQueueCounts {
  return { pending: 0, verified: 0, rejected: 0, revoked: 0 };
}

export function countKycByQueue(items: KycCase[]): KycQueueCounts {
  const counts = emptyKycCounts();
  for (const row of items) counts[row.queue] += 1;
  return counts;
}

export function emptyOverview(): TrustOverview {
  return {
    pending: 0,
    verifiedBadges: 0,
    openAlerts: 0,
    domainCount: 0,
  };
}

export function isOpenAlert(status: AlertStatus): boolean {
  return status === "open" || status === "reviewing";
}

export function isSettledAlert(status: AlertStatus): boolean {
  return status === "suspended" || status === "cleared";
}

export function canGrant(kyc: KycCase): boolean {
  return (
    (kyc.queue === "pending" || kyc.queue === "revoked") &&
    kyc.badge !== "verified" &&
    kyc.poster.accountStatus !== "banned"
  );
}

export function canRevoke(kyc: KycCase): boolean {
  return kyc.badge === "verified";
}

export function canReject(kyc: KycCase): boolean {
  return kyc.queue === "pending";
}

export function canReopen(kyc: KycCase): boolean {
  return kyc.queue === "rejected" || kyc.queue === "revoked";
}

export function canWarn(alert: ScamAlert): boolean {
  return !isSettledAlert(alert.status);
}

export function canRestrict(alert: ScamAlert): boolean {
  return !isSettledAlert(alert.status);
}

export function canReview(alert: ScamAlert): boolean {
  return !isSettledAlert(alert.status) && alert.status !== "reviewing";
}

export function canClear(alert: ScamAlert): boolean {
  return alert.status !== "cleared";
}

export function actionNeedsNote(kind: TrustActionKind): boolean {
  return kind !== "review";
}

export function actionLabel(kind: TrustActionKind): string {
  if (kind === "grant_badge") return "Badge granted";
  if (kind === "revoke_badge") return "Badge revoked";
  if (kind === "reject_kyc") return "Rejected";
  if (kind === "reopen") return "Reopened";
  if (kind === "warn") return "Warned";
  if (kind === "restrict") return "Suspended";
  if (kind === "review") return "In review";
  if (kind === "clear") return "Cleared";
  return "Domain removed";
}

export function historyKindLabel(kind: TrustHistoryKind): string {
  return actionLabel(kind);
}

export function parseTrustTab(value: string | null): TrustTab {
  if (value === "alerts" || value === "domains" || value === "kyc") return value;
  return "kyc";
}

export function institutionGuess(domain: string): string {
  const host = domain.replace(/^mail\./, "").split(".")[0] ?? domain;
  return host.toUpperCase();
}
