export type UserRole = "renter" | "poster";
export type AccountStatus = "active" | "restricted" | "banned";
export type ModerationKind = "warn" | "restrict" | "ban" | "restore";

export type ModerationEvent = {
  id: string;
  kind: ModerationKind;
  note: string;
  at: string;
  actor: string;
};

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  campus: string;
  reportsFiled: number;
  reportsAgainst: number;
  listingCount: number;
  activeListingCount: number;
  history: ModerationEvent[];
};

export function displayName(user: AdminUser): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: AdminUser): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

export function statusLabel(status: AccountStatus): string {
  if (status === "restricted") return "Suspended";
  if (status === "banned") return "Banned";
  return "Active";
}

export function kindLabel(kind: ModerationKind): string {
  if (kind === "restrict") return "Suspended";
  if (kind === "ban") return "Banned";
  if (kind === "restore") return "Restored";
  return "Warned";
}
