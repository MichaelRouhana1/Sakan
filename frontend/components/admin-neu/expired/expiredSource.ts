/**
 * API-shaped expired listings source.
 * Today: in-memory mock store + delay.
 * Later: swap to admin/listings archive-remove + messaging endpoints.
 */
import {
  archiveInStore,
  bulkInStore,
  getFromStore,
  listFromStore,
  nudgeInStore,
  purgeInStore,
  queueDeleteInStore,
  renewInStore,
} from "./mockStore";
import type {
  ExpiredActionKind,
  ExpiredAsset,
  ListExpiredParams,
  ListExpiredResult,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listExpiredAssets(
  params: ListExpiredParams = {},
): Promise<ListExpiredResult> {
  await delay();
  return listFromStore(params);
}

export async function getExpiredAsset(id: string): Promise<ExpiredAsset> {
  await delay();
  return getFromStore(id);
}

export async function nudgeExpiredAsset(
  id: string,
  adminNote: string,
): Promise<ExpiredAsset> {
  await delay();
  return structuredClone(nudgeInStore(id, adminNote));
}

export async function archiveExpiredAsset(
  id: string,
  adminNote: string,
): Promise<ExpiredAsset> {
  await delay();
  return structuredClone(archiveInStore(id, adminNote));
}

export async function queueDeleteExpiredAsset(
  id: string,
  adminNote: string,
): Promise<ExpiredAsset> {
  await delay();
  return structuredClone(queueDeleteInStore(id, adminNote));
}

export async function purgeExpiredAsset(
  id: string,
  adminNote: string,
): Promise<ExpiredAsset> {
  await delay();
  return structuredClone(purgeInStore(id, adminNote));
}

export async function renewExpiredAsset(
  id: string,
  adminNote: string,
): Promise<ExpiredAsset> {
  await delay();
  return structuredClone(renewInStore(id, adminNote));
}

export async function bulkExpiredAction(
  ids: string[],
  kind: Extract<
    ExpiredActionKind,
    "nudge" | "archive" | "queue_delete" | "purge"
  >,
  adminNote: string,
): Promise<ExpiredAsset[]> {
  await delay();
  return bulkInStore(ids, kind, adminNote).map((row) => structuredClone(row));
}
