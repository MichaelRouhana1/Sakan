export type BroadcastChannel = "in_app" | "email" | "whatsapp";
export type BroadcastAudience = "all" | "renters" | "posters" | "unverified";
export type BroadcastStatus = "queued";

export type FeedbackCategory = "feature" | "bug" | "general";
export type FeedbackQueue = "unread" | "read" | "archived";
export type FeedbackActionKind = "reply" | "read" | "unread" | "archive" | "unarchive";
export type FeedbackHistoryKind = Exclude<FeedbackActionKind, "reply"> | "reply";

export type CommsTab = "inbox" | "blast" | "nudges";

export type FeedbackUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  campus: string;
};

export type FeedbackListingRef = {
  id: string;
  title: string;
};

export type FeedbackReply = {
  at: string;
  body: string;
  actor: string;
};

export type FeedbackHistoryEntry = {
  id: string;
  kind: FeedbackHistoryKind;
  note: string;
  at: string;
  actor: string;
};

export type FeedbackItem = {
  id: string;
  category: FeedbackCategory;
  queue: FeedbackQueue;
  message: string;
  createdAt: string;
  replies: FeedbackReply[];
  history: FeedbackHistoryEntry[];
  listing: FeedbackListingRef | null;
  device: string | null;
  user: FeedbackUser;
};

export type LifecycleNudge = {
  id: string;
  title: string;
  trigger: string;
  channels: BroadcastChannel[];
  audience: string;
  enabled: boolean;
  lastFiredAt: string | null;
  sent30d: number;
  overlapHref?: string;
  overlapLabel?: string;
};

export type BroadcastJob = {
  id: string;
  subject: string;
  body: string;
  channels: BroadcastChannel[];
  audience: BroadcastAudience[];
  campusIds: string[];
  reach: number;
  queuedAt: string;
  status: BroadcastStatus;
};

export type BroadcastDraft = {
  subject: string;
  body: string;
  channels: BroadcastChannel[];
  audience: BroadcastAudience[];
  campusIds: string[];
};

export type FeedbackQueueCounts = Record<FeedbackQueue, number>;

export type CommsOverview = {
  unread: number;
  read: number;
  archived: number;
  readThisWeek: number;
  nudgesLive: number;
  nudgesTotal: number;
};

export type ListFeedbackParams = {
  q?: string;
  queue?: FeedbackQueue;
  category?: FeedbackCategory | "all";
  page?: number;
  pageSize?: number;
};

export type ListFeedbackResult = {
  items: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: FeedbackQueueCounts;
  overview: CommsOverview;
};

export type QueueBroadcastInput = BroadcastDraft;

export const ANCHOR_ISO = "2026-08-25T12:00:00.000Z";

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export const AUDIENCE_OPTIONS: {
  id: BroadcastAudience;
  label: string;
  hint: string;
}[] = [
  { id: "all", label: "All users", hint: "Every account on Skoun" },
  { id: "renters", label: "Renters only", hint: "Seeking a place" },
  { id: "posters", label: "Posters only", hint: "Listing hosts" },
  { id: "unverified", label: "Unverified email", hint: "Campus domain pending" },
];

export const CAMPUS_OPTIONS: { id: string; label: string }[] = [
  { id: "aub-hamra", label: "AUB, Hamra" },
  { id: "lau-beirut", label: "LAU, Beirut" },
  { id: "usj-beirut", label: "USJ, Beirut" },
  { id: "ndu-zouk", label: "NDU, Zouk" },
  { id: "usek-kaslik", label: "USEK, Kaslik" },
  { id: "balamand-koura", label: "Balamand, Koura" },
];

/** Headcount per campus. Sums to REACH.all. */
export const CAMPUS_REACH: Record<string, number> = {
  "aub-hamra": 3200,
  "lau-beirut": 2800,
  "usj-beirut": 2100,
  "ndu-zouk": 1600,
  "usek-kaslik": 1740,
  "balamand-koura": 1400,
};

/** Roles are disjoint. Unverified is nested inside those roles. */
export const REACH: Record<BroadcastAudience, number> = {
  all: 12840,
  renters: 9120,
  posters: 3720,
  unverified: 840,
};

export const COMMS_TABS: { id: CommsTab; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "blast", label: "Blast" },
  { id: "nudges", label: "Nudges" },
];

export function personName(
  person: Pick<FeedbackUser, "firstName" | "lastName">,
): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(
  person: Pick<FeedbackUser, "firstName" | "lastName">,
): string {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

export function formatDay(iso: string): string {
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

export function categoryLabel(category: FeedbackCategory): string {
  if (category === "feature") return "Feature";
  if (category === "bug") return "Bug";
  return "General";
}

export function queueLabel(queue: FeedbackQueue): string {
  if (queue === "unread") return "Unread";
  if (queue === "read") return "Read";
  return "Archived";
}

export function channelLabel(channel: BroadcastChannel): string {
  if (channel === "in_app") return "In-app";
  if (channel === "email") return "Email";
  return "WhatsApp";
}

export function channelsLabel(channels: BroadcastChannel[]): string {
  return channels.map(channelLabel).join(" + ");
}

export function audienceLabel(audience: BroadcastAudience[]): string {
  if (audience.includes("all") || audience.length === 0) return "All users";
  return audience
    .map((id) => AUDIENCE_OPTIONS.find((row) => row.id === id)?.label ?? id)
    .join(", ");
}

export function campusLabel(campusIds: string[]): string {
  if (campusIds.length === 0) return "All campuses";
  return campusIds
    .map((id) => CAMPUS_OPTIONS.find((row) => row.id === id)?.label ?? id)
    .join(", ");
}

export function previewText(message: string, max = 72): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trim()}…`;
}

export function lastRepliedAt(item: FeedbackItem): string | null {
  const last = item.replies[item.replies.length - 1];
  return last?.at ?? null;
}

export function isReadThisWeek(
  row: FeedbackItem,
  anchorIso = ANCHOR_ISO,
): boolean {
  if (row.queue !== "read") return false;
  const anchor = new Date(anchorIso).getTime();
  const start = anchor - 7 * 24 * 60 * 60 * 1000;
  const stamp = lastRepliedAt(row) ?? row.createdAt;
  const t = new Date(stamp).getTime();
  return t >= start && t <= anchor;
}

export function emptyCounts(): FeedbackQueueCounts {
  return { unread: 0, read: 0, archived: 0 };
}

export function countByQueue(items: FeedbackItem[]): FeedbackQueueCounts {
  const counts = emptyCounts();
  for (const row of items) counts[row.queue] += 1;
  return counts;
}

export function emptyOverview(): CommsOverview {
  return {
    unread: 0,
    read: 0,
    archived: 0,
    readThisWeek: 0,
    nudgesLive: 0,
    nudgesTotal: 0,
  };
}

/**
 * Roles disjoint. Unverified nested — never add it on top of a role slice.
 * Campus chips scale the base by campus share of all users.
 */
export function estimateReach(
  audience: BroadcastAudience[],
  campusIds: string[] = [],
): number {
  let base = REACH.all;
  if (!audience.includes("all") && audience.length > 0) {
    const hasR = audience.includes("renters");
    const hasP = audience.includes("posters");
    const hasU = audience.includes("unverified");
    if (hasR && hasP) base = REACH.all;
    else if (hasR) base = REACH.renters;
    else if (hasP) base = REACH.posters;
    else if (hasU) base = REACH.unverified;
  }
  if (campusIds.length === 0) return base;
  const campusSum = campusIds.reduce(
    (sum, id) => sum + (CAMPUS_REACH[id] ?? 0),
    0,
  );
  const fraction = Math.min(1, campusSum / REACH.all);
  return Math.max(1, Math.round(base * fraction));
}

export function canReply(item: FeedbackItem): boolean {
  return item.queue !== "archived";
}

export function canRead(item: FeedbackItem): boolean {
  return item.queue === "unread";
}

export function canUnread(item: FeedbackItem): boolean {
  return item.queue === "read";
}

export function canArchive(item: FeedbackItem): boolean {
  return item.queue !== "archived";
}

export function canUnarchive(item: FeedbackItem): boolean {
  return item.queue === "archived";
}

export function actionNeedsNote(kind: FeedbackActionKind): boolean {
  return kind === "archive" || kind === "unarchive";
}

export function actionLabel(kind: FeedbackActionKind): string {
  if (kind === "reply") return "Replied";
  if (kind === "read") return "Marked read";
  if (kind === "unread") return "Marked unread";
  if (kind === "archive") return "Archived";
  return "Unarchived";
}

export function historyKindLabel(kind: FeedbackHistoryKind): string {
  return actionLabel(kind);
}

export function parseCommsTab(value: string | null): CommsTab {
  if (value === "blast" || value === "nudges" || value === "inbox") return value;
  return "inbox";
}
