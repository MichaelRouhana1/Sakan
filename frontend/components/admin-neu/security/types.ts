export type AdminTier = "super_admin" | "moderator" | "support" | "analyst";

export type AuditActionKind =
  | "archived_listing"
  | "removed_listing"
  | "granted_credits"
  | "approved_purchase"
  | "rejected_purchase"
  | "changed_zone"
  | "banned_user"
  | "restricted_user"
  | "unrestricted_user"
  | "resolved_report"
  | "updated_rbac"
  | "exported_logs"
  | "cut_power_window"
  | "edited_pricing";

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
export type LogRangeId = "24h" | "7d" | "30d" | "custom";

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
  archived_listing: "Archived Listing",
  removed_listing: "Removed Listing",
  granted_credits: "Granted Credits",
  approved_purchase: "Approved Purchase",
  rejected_purchase: "Rejected Purchase",
  changed_zone: "Changed Zone",
  banned_user: "Banned User",
  restricted_user: "Restricted User",
  unrestricted_user: "Unrestricted User",
  resolved_report: "Resolved Report",
  updated_rbac: "Updated RBAC",
  exported_logs: "Exported Logs",
  cut_power_window: "Cut Power Window",
  edited_pricing: "Edited Pricing",
};

export const ACTION_CATEGORY: Record<AuditActionKind, ActionCategory> = {
  archived_listing: "moderation",
  removed_listing: "moderation",
  banned_user: "moderation",
  restricted_user: "moderation",
  unrestricted_user: "moderation",
  resolved_report: "moderation",
  granted_credits: "money",
  approved_purchase: "money",
  rejected_purchase: "money",
  changed_zone: "geo",
  cut_power_window: "geo",
  updated_rbac: "access",
  exported_logs: "access",
  edited_pricing: "ops",
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
  return iso.slice(0, 10);
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function scrapeShare(point: TrafficPoint): number {
  if (point.requests <= 0) return 0;
  return (point.scrapes / point.requests) * 100;
}

export function isSpike(point: TrafficPoint): boolean {
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
