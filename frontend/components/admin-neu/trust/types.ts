export type AccountStatus = "active" | "restricted" | "banned";
export type KycQueue = "pending" | "verified" | "rejected";
export type BadgeState = "none" | "verified" | "revoked";
export type DocKind = "national_id" | "passport" | "property_deed";
export type DocSide = "front" | "back" | "full";
export type ScamPattern =
  | "shared_ip"
  | "duplicate_phone"
  | "rapid_signup"
  | "cloned_listings";
export type AlertSeverity = "watch" | "high" | "critical";
export type AlertStatus = "open" | "reviewing" | "warned" | "suspended" | "cleared";
export type TrustActionKind =
  | "grant_badge"
  | "revoke_badge"
  | "reject_kyc"
  | "warn"
  | "restrict"
  | "review";

export type TrustPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountStatus: AccountStatus;
};

export type KycDocument = {
  id: string;
  kind: DocKind;
  side: DocSide;
  issuedOn: string;
  numberMasked: string;
  extra?: string;
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
};

export type AcademicDomain = {
  id: string;
  domain: string;
  institution: string;
  studentCount: number;
};

export function personName(person: Pick<TrustPerson, "firstName" | "lastName">): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(person: Pick<TrustPerson, "firstName" | "lastName">): string {
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
