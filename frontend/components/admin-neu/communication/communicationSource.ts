/**
 * API-shaped communication source.
 * Today: in-memory mock store + delay.
 *
 * Mapping to current backend: none. No notifications table, feedback table,
 * broadcast, or nudge config. Future swap:
 * - listFeedback ≈ GET /api/admin/feedback
 * - reply/read/archive ≈ PATCH /api/admin/feedback/:id
 * - listNudges / toggleNudge ≈ GET/PATCH /api/admin/nudges
 * - queueBroadcast ≈ POST /api/admin/broadcasts (demo queue only; no send worker)
 */
import {
  archiveInStore,
  getFeedbackFromStore,
  listBroadcastsFromStore,
  listFeedbackFromStore,
  listNudgesFromStore,
  overviewFromStore,
  queueBroadcastInStore,
  readInStore,
  replyInStore,
  toggleNudgeInStore,
  unarchiveInStore,
  unreadInStore,
} from "./mockStore";
import type {
  BroadcastDraft,
  BroadcastJob,
  CommsOverview,
  FeedbackItem,
  LifecycleNudge,
  ListFeedbackParams,
  ListFeedbackResult,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listAdminFeedback(
  params: ListFeedbackParams = {},
): Promise<ListFeedbackResult> {
  await delay();
  return listFeedbackFromStore(params);
}

export async function getAdminFeedback(id: string): Promise<FeedbackItem> {
  await delay();
  return getFeedbackFromStore(id);
}

export async function replyAdminFeedback(
  id: string,
  body: string,
): Promise<FeedbackItem> {
  await delay();
  return structuredClone(replyInStore(id, body));
}

export async function readAdminFeedback(id: string): Promise<FeedbackItem> {
  await delay();
  return structuredClone(readInStore(id));
}

export async function unreadAdminFeedback(id: string): Promise<FeedbackItem> {
  await delay();
  return structuredClone(unreadInStore(id));
}

export async function archiveAdminFeedback(
  id: string,
  adminNote: string,
): Promise<FeedbackItem> {
  await delay();
  return structuredClone(archiveInStore(id, adminNote));
}

export async function unarchiveAdminFeedback(
  id: string,
  adminNote: string,
): Promise<FeedbackItem> {
  await delay();
  return structuredClone(unarchiveInStore(id, adminNote));
}

export async function listAdminNudges(): Promise<LifecycleNudge[]> {
  await delay();
  return listNudgesFromStore();
}

export async function toggleAdminNudge(
  id: string,
  enabled: boolean,
): Promise<LifecycleNudge> {
  await delay();
  return structuredClone(toggleNudgeInStore(id, enabled));
}

export async function listAdminBroadcasts(): Promise<BroadcastJob[]> {
  await delay();
  return listBroadcastsFromStore();
}

export async function queueAdminBroadcast(
  draft: BroadcastDraft,
): Promise<BroadcastJob> {
  await delay();
  return structuredClone(queueBroadcastInStore(draft));
}

export async function getCommsOverview(): Promise<CommsOverview> {
  await delay();
  return overviewFromStore();
}
