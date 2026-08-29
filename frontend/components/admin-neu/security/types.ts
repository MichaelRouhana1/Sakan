export type AdminTier = "super_admin" | "moderator" | "support" | "analyst";

/** Adapter-shaped toward GET /api/admin/audit action strings. */
export type AuditActionKind =
  | "listing.archive"
  | "listing.remove"
  | "listing.restore"
  | "user.status"
  | "report.dismiss"
  | "credit_tx.approve"
  | "credit_tx.reject"
  | "institution.create"
  | "institution.update"
  | "campus.create"
  | "campus.update"
  | "rbac.update"
  | "logs.export"
  | "pricing.edit"
  | "zone.change";

export type ActionCategory =
  | "moderation"
  | "money"
  | "geo"
  | "access"
  | "ops";

export type PermissionId =
  | "users_view"
  | "users_edit"
  | "users_delete"
  | "listings_view"
  | "listings_edit"
  | "listings_delete"
  | "credits_grant"
  | "zones_edit"
  | "reports_review"
  | "rbac_manage"
  | "logs_export"
  | "analytics_view";

export type PermissionLevel = "view" | "edit" | "delete";

export type AuditActor = {
  id: string;
  name: string;
  email: string;
  role: AdminTier;
};

export type AuditEvent = {
  id: string;
  actor: AuditActor;
  action: AuditActionKind;
  detail: string;
  target: string;
  ip: string;
  createdAt: string;
};

export type RoleMatrix = Record<AdminTier, Record<PermissionId, boolean>>;

export type TrafficPoint = {
  label: string;
  requests: number;
  scrapes: number;
  /** Dominant listing endpoint in this bucket. */
  endpoint: string;
};

export type SpikeAlert = {
  id: string;
  label: string;
  endpoint: string;
  scrapes: number;
  requests: number;
  share: number;
  severity: "high" | "medium";
};

export type RangeId = "24h" | "7d" | "30d" | "custom";
export type ChartRangeId = "24h" | "7d" | "30d";
export type SecuritySection = "monitor" | "access";

export const RANGE_TABS: { id: RangeId; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "custom", label: "Custom" },
];

export const TIER_LABEL: Record<AdminTier, string> = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  support: "Support",
  analyst: "Analyst",
};

export const TIER_HINT: Record<AdminTier, string> = {
  super_admin: "Full desk control",
  moderator: "Listings, reports, users",
  support: "Inbox + light edits",
  analyst: "Read-only trends",
};

export const ACTION_LABEL: Record<AuditActionKind, string> = {
  "listing.archive": "Archived Listing",
  "listing.remove": "Removed Listing",
  "listing.restore": "Restored Listing",
  "user.status": "User Status",
  "report.dismiss": "Dismissed Report",
  "credit_tx.approve": "Approved Credits",
  "credit_tx.reject": "Rejected Credits",
  "institution.create": "Created Institution",
  "institution.update": "Updated Institution",
  "campus.create": "Created Campus",
  "campus.update": "Updated Campus",
  "rbac.update": "Updated RBAC",
  "logs.export": "Exported Logs",
  "pricing.edit": "Edited Pricing",
  "zone.change": "Changed Zone",
};

export const ACTION_CATEGORY: Record<AuditActionKind, ActionCategory> = {
  "listing.archive": "moderation",
  "listing.remove": "moderation",
  "listing.restore": "moderation",
  "user.status": "moderation",
  "report.dismiss": "moderation",
  "credit_tx.approve": "money",
  "credit_tx.reject": "money",
  "institution.create": "ops",
  "institution.update": "ops",
  "campus.create": "ops",
  "campus.update": "ops",
  "zone.change": "geo",
  "rbac.update": "access",
  "logs.export": "access",
  "pricing.edit": "ops",
};

export const CATEGORY_TABS: { id: ActionCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "moderation", label: "Moderation" },
  { id: "money", label: "Credits" },
  { id: "geo", label: "Zones" },
  { id: "access", label: "Access" },
  { id: "ops", label: "Ops" },
];

export const ROLE_FILTER_TABS: { id: AdminTier | "all"; label: string }[] = [
  { id: "all", label: "All roles" },
  { id: "super_admin", label: "Super" },
  { id: "moderator", label: "Mods" },
  { id: "support", label: "Support" },
  { id: "analyst", label: "Analyst" },
];

export const PERMISSIONS: {
  id: PermissionId;
  label: string;
  group: string;
  level: PermissionLevel;
  hint: string;
}[] = [
  {
    id: "users_view",
    label: "View users",
    group: "Users",
    level: "view",
    hint: "Search and open profiles",
  },
  {
    id: "users_edit",
    label: "Edit / restrict",
    group: "Users",
    level: "edit",
    hint: "Restrict messaging and flags",
  },
  {
    id: "users_delete",
    label: "Ban / delete",
    group: "Users",
    level: "delete",
    hint: "Hard bans and account removal",
  },
  {
    id: "listings_view",
    label: "View listings",
    group: "Listings",
    level: "view",
    hint: "Open review drawers",
  },
  {
    id: "listings_edit",
    label: "Edit / archive",
    group: "Listings",
    level: "edit",
    hint: "Archive and soft moderation",
  },
  {
    id: "listings_delete",
    label: "Remove listings",
    group: "Listings",
    level: "delete",
    hint: "Hard remove from catalog",
  },
  {
    id: "credits_grant",
    label: "Grant credits",
    group: "Credits",
    level: "edit",
    hint: "Comp packs and boosts",
  },
  {
    id: "zones_edit",
    label: "Change zones",
    group: "Zoning",
    level: "edit",
    hint: "Neighborhood assignment",
  },
  {
    id: "reports_review",
    label: "Review reports",
    group: "Trust",
    level: "edit",
    hint: "Dismiss or escalate reports",
  },
  {
    id: "rbac_manage",
    label: "Manage RBAC",
    group: "Security",
    level: "delete",
    hint: "Edit role permission matrix",
  },
  {
    id: "logs_export",
    label: "Export audit logs",
    group: "Security",
    level: "view",
    hint: "Download CSV ledger",
  },
  {
    id: "analytics_view",
    label: "View analytics",
    group: "Analytics",
    level: "view",
    hint: "Trends and conversion desk",
  },
];

export const TIERS: AdminTier[] = [
  "super_admin",
  "moderator",
  "support",
  "analyst",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function scrapeShare(point: TrafficPoint | null | undefined): number {
  if (!point || point.requests <= 0) return 0;
  return (point.scrapes / point.requests) * 100;
}

export function isSpike(point: TrafficPoint | null | undefined): boolean {
  if (!point) return false;
  return scrapeShare(point) >= 25;
}

export function grantedCount(matrix: RoleMatrix, tier: AdminTier): number {
  return PERMISSIONS.reduce(
    (sum, perm) => sum + (matrix[tier][perm.id] ? 1 : 0),
    0,
  );
}

export function buildSpikeAlerts(points: TrafficPoint[]): SpikeAlert[] {
  return points
    .map((point, i) => {
      const share = scrapeShare(point);
      if (share < 25) return null;
      return {
        id: `spike_${i}_${point.label}`,
        label: point.label,
        endpoint: point.endpoint,
        scrapes: point.scrapes,
        requests: point.requests,
        share,
        severity: share >= 45 ? ("high" as const) : ("medium" as const),
      };
    })
    .filter((row): row is SpikeAlert => row != null)
    .sort((a, b) => b.share - a.share)
    .slice(0, 6);
}

export function toCsv(events: AuditEvent[]): string {
  const header = [
    "id",
    "admin",
    "email",
    "role",
    "action",
    "detail",
    "target",
    "ip",
    "timestamp",
  ];
  const rows = events.map((e) =>
    [
      e.id,
      e.actor.name,
      e.actor.email,
      TIER_LABEL[e.actor.role],
      ACTION_LABEL[e.action],
      e.detail,
      e.target,
      e.ip,
      e.createdAt,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function cloneMatrix(matrix: RoleMatrix): RoleMatrix {
  const next = {} as RoleMatrix;
  for (const tier of TIERS) {
    next[tier] = { ...matrix[tier] };
  }
  return next;
}

export function matricesEqual(a: RoleMatrix, b: RoleMatrix): boolean {
  for (const tier of TIERS) {
    for (const perm of PERMISSIONS) {
      if (a[tier][perm.id] !== b[tier][perm.id]) return false;
    }
  }
  return true;
}

export function matchesCategory(
  action: AuditActionKind,
  category: ActionCategory | "all",
): boolean {
  if (category === "all") return true;
  return ACTION_CATEGORY[action] === category;
}

/** Log range bounds. 24h = rolling wall-clock window; others = calendar days. */
export function resolveLogRange(
  range: RangeId,
  customFrom: string,
  customTo: string,
  seedStart: string,
  seedEnd: string,
): { mode: "rolling" | "days"; fromIso?: string; toIso?: string; fromDay?: string; toDay?: string } {
  if (range === "custom") {
    return {
      mode: "days",
      fromDay: customFrom || seedStart,
      toDay: customTo || seedEnd,
    };
  }
  if (range === "24h") {
    const to = Date.now();
    const from = to - 24 * 60 * 60 * 1000;
    return {
      mode: "rolling",
      fromIso: new Date(from).toISOString(),
      toIso: new Date(to).toISOString(),
    };
  }
  const today = formatDay(new Date().toISOString());
  const end = new Date(`${today}T12:00:00.000Z`);
  const days = range === "7d" ? 6 : 29;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return {
    mode: "days",
    fromDay: start.toISOString().slice(0, 10),
    toDay: today,
  };
}

export function eventInLogRange(
  event: AuditEvent,
  bounds: ReturnType<typeof resolveLogRange>,
): boolean {
  if (!event?.createdAt) return false;
  if (bounds.mode === "rolling") {
    return (
      event.createdAt >= (bounds.fromIso ?? "") &&
      event.createdAt <= (bounds.toIso ?? "")
    );
  }
  const day = formatDay(event.createdAt);
  return day >= (bounds.fromDay ?? "") && day <= (bounds.toDay ?? "");
}
