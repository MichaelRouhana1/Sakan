import { MOCK_BROADCASTS, MOCK_FEEDBACK, MOCK_NUDGES } from "./mockCommunication";
import {
  ANCHOR_ISO,
  canArchive,
  canRead,
  canReply,
  canUnarchive,
  canUnread,
  countByQueue,
  estimateReach,
  isReadThisWeek,
  personName,
  type BroadcastDraft,
  type BroadcastJob,
  type CommsOverview,
  type FeedbackHistoryEntry,
  type FeedbackItem,
  type FeedbackQueue,
  type LifecycleNudge,
  type ListFeedbackParams,
  type ListFeedbackResult,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

let feedbackStore: FeedbackItem[] = clone(MOCK_FEEDBACK);
let nudgeStore: LifecycleNudge[] = clone(MOCK_NUDGES);
let broadcastStore: BroadcastJob[] = clone(MOCK_BROADCASTS);

export function resetCommunicationMockStore(): void {
  feedbackStore = clone(MOCK_FEEDBACK);
  nudgeStore = clone(MOCK_NUDGES);
  broadcastStore = clone(MOCK_BROADCASTS);
}

function historyEntry(
  kind: FeedbackHistoryEntry["kind"],
  note: string,
): FeedbackHistoryEntry {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    note,
    at: ANCHOR_ISO,
    actor: "You",
  };
}

function findFeedbackOrThrow(id: string): FeedbackItem {
  const row = feedbackStore.find((item) => item.id === id);
  if (!row) throw new Error(`Feedback not found: ${id}`);
  return row;
}

function findNudgeOrThrow(id: string): LifecycleNudge {
  const row = nudgeStore.find((item) => item.id === id);
  if (!row) throw new Error(`Nudge not found: ${id}`);
  return row;
}

function matchesQuery(row: FeedbackItem, needle: string): boolean {
  if (!needle) return true;
  const listing = row.listing?.title ?? "";
  const hay =
    `${personName(row.user)} ${row.user.email} ${row.user.campus} ${row.message} ${listing} ${row.id}`.toLowerCase();
  return hay.includes(needle);
}

function buildOverview(): CommsOverview {
  const counts = countByQueue(feedbackStore);
  return {
    unread: counts.unread,
    read: counts.read,
    archived: counts.archived,
    readThisWeek: feedbackStore.filter((row) => isReadThisWeek(row)).length,
    nudgesLive: nudgeStore.filter((row) => row.enabled).length,
    nudgesTotal: nudgeStore.length,
  };
}

export function overviewFromStore(): CommsOverview {
  return buildOverview();
}

export function listFeedbackFromStore(
  params: ListFeedbackParams = {},
): ListFeedbackResult {
  const queue: FeedbackQueue = params.queue ?? "unread";
  const category = params.category ?? "all";
  const pageSize = params.pageSize ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const needle = params.q?.trim().toLowerCase() ?? "";

  const counts = countByQueue(feedbackStore);
  const filtered = feedbackStore
    .filter((row) => row.queue === queue)
    .filter((row) => (category === "all" ? true : row.category === category))
    .filter((row) => matchesQuery(row, needle))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

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

export function getFeedbackFromStore(id: string): FeedbackItem {
  return clone(findFeedbackOrThrow(id));
}

export function replyInStore(id: string, body: string): FeedbackItem {
  const row = findFeedbackOrThrow(id);
  if (!canReply(row)) throw new Error("Unarchive before replying");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Reply cannot be empty");
  const next: FeedbackItem = {
    ...row,
    queue: "read",
    replies: [
      ...row.replies,
      { at: ANCHOR_ISO, body: trimmed, actor: "You" },
    ],
    history: [
      ...row.history,
      historyEntry("reply", trimmed),
      ...(row.queue === "unread" ? [historyEntry("read", "Moved to read after reply.")] : []),
    ],
  };
  feedbackStore = feedbackStore.map((item) => (item.id === id ? next : item));
  return next;
}

export function readInStore(id: string): FeedbackItem {
  const row = findFeedbackOrThrow(id);
  if (!canRead(row)) throw new Error("Only unread notes can be marked read");
  const next: FeedbackItem = {
    ...row,
    queue: "read",
    history: [...row.history, historyEntry("read", "Marked read.")],
  };
  feedbackStore = feedbackStore.map((item) => (item.id === id ? next : item));
  return next;
}

export function unreadInStore(id: string): FeedbackItem {
  const row = findFeedbackOrThrow(id);
  if (!canUnread(row)) throw new Error("Only read notes can be marked unread");
  const next: FeedbackItem = {
    ...row,
    queue: "unread",
    history: [...row.history, historyEntry("unread", "Returned to unread.")],
  };
  feedbackStore = feedbackStore.map((item) => (item.id === id ? next : item));
  return next;
}

export function archiveInStore(id: string, note: string): FeedbackItem {
  const row = findFeedbackOrThrow(id);
  if (!canArchive(row)) throw new Error("Already archived");
  const trimmed = note.trim();
  if (!trimmed) throw new Error("Staff note required");
  const next: FeedbackItem = {
    ...row,
    queue: "archived",
    history: [...row.history, historyEntry("archive", trimmed)],
  };
  feedbackStore = feedbackStore.map((item) => (item.id === id ? next : item));
  return next;
}

export function unarchiveInStore(id: string, note: string): FeedbackItem {
  const row = findFeedbackOrThrow(id);
  if (!canUnarchive(row)) throw new Error("Only archived notes can be restored");
  const trimmed = note.trim();
  if (!trimmed) throw new Error("Staff note required");
  const nextQueue: FeedbackQueue = row.replies.length > 0 ? "read" : "unread";
  const next: FeedbackItem = {
    ...row,
    queue: nextQueue,
    history: [...row.history, historyEntry("unarchive", trimmed)],
  };
  feedbackStore = feedbackStore.map((item) => (item.id === id ? next : item));
  return next;
}

export function listNudgesFromStore(): LifecycleNudge[] {
  return nudgeStore.map((row) => clone(row));
}

export function toggleNudgeInStore(
  id: string,
  enabled: boolean,
): LifecycleNudge {
  findNudgeOrThrow(id);
  nudgeStore = nudgeStore.map((row) =>
    row.id === id ? { ...row, enabled } : row,
  );
  return clone(findNudgeOrThrow(id));
}

export function listBroadcastsFromStore(): BroadcastJob[] {
  return [...broadcastStore]
    .sort((a, b) => (a.queuedAt < b.queuedAt ? 1 : -1))
    .map((row) => clone(row));
}

export function queueBroadcastInStore(draft: BroadcastDraft): BroadcastJob {
  const subject = draft.subject.trim();
  const body = draft.body.trim();
  if (!subject) throw new Error("Subject required");
  if (!body) throw new Error("Message required");
  if (draft.channels.length === 0) throw new Error("Pick a channel");
  const audience =
    draft.audience.length === 0 || draft.audience.includes("all")
      ? (["all"] as BroadcastDraft["audience"])
      : draft.audience;
  const job: BroadcastJob = {
    id: `b-${Date.now().toString(36)}`,
    subject,
    body,
    channels: [...draft.channels],
    audience,
    campusIds: [...draft.campusIds],
    reach: estimateReach(audience, draft.campusIds),
    queuedAt: ANCHOR_ISO,
    status: "queued",
  };
  broadcastStore = [job, ...broadcastStore];
  return clone(job);
}
