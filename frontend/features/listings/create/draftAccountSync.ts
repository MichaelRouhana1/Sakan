import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api";
import {
  CREATE_DRAFT_CHECKPOINT_KEY,
  CREATE_DRAFT_LEGACY_OWNER_KEY,
  CREATE_DRAFT_STORAGE_KEY,
  CREATE_DRAFT_WORKING_KEY,
  type DraftCheckpoint,
  type DraftSlot,
} from "./draft";
import {
  getActiveDraftUserId,
  getDraftRevision,
  readLegacyDraftSlot,
  readLocalDraftSlot,
  setDraftSyncHooks,
  storeDraftSlot,
} from "./createDraftCheckpoint";
import { preferNewerDraft } from "./preferNewerDraft";

type RemoteSlots = {
  main: DraftCheckpoint | null;
  working: DraftCheckpoint | null;
};

function tombstoneKey(userId: string, slot: DraftSlot): string {
  return `skoun.createListing.draftTombstone.v1:${userId}:${slot}`;
}

let tail: Promise<void> = Promise.resolve();
let inflight: Promise<void> | null = null;

function enqueue(task: () => Promise<void>): void {
  const run = () => task().catch(() => {});
  tail = tail.then(run, run);
}

export function flushDraftAccountSync(): Promise<void> {
  return tail;
}

async function putDraft(
  slot: DraftSlot,
  checkpoint: DraftCheckpoint,
): Promise<void> {
  await api.put(`/api/listings/drafts/${slot}`, checkpoint);
}

async function deleteDraft(userId: string, slot: DraftSlot): Promise<void> {
  try {
    await api.delete(`/api/listings/drafts/${slot}`);
    await AsyncStorage.removeItem(tombstoneKey(userId, slot));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      await AsyncStorage.removeItem(tombstoneKey(userId, slot));
      return;
    }
    throw error;
  }
}

function onWrite(slot: DraftSlot, checkpoint: DraftCheckpoint): void {
  const userId = getActiveDraftUserId();
  if (!userId) return;
  enqueue(async () => {
    await AsyncStorage.removeItem(tombstoneKey(userId, slot));
    await putDraft(slot, checkpoint);
  });
}

function onClear(slot: DraftSlot): void {
  const userId = getActiveDraftUserId();
  if (!userId) return;
  enqueue(async () => {
    await AsyncStorage.setItem(
      tombstoneKey(userId, slot),
      new Date().toISOString(),
    );
    await removeClaimableLegacy(userId, slot);
    await deleteDraft(userId, slot);
  });
}

async function removeClaimableLegacy(
  userId: string,
  slot: DraftSlot,
): Promise<void> {
  const owner = await AsyncStorage.getItem(CREATE_DRAFT_LEGACY_OWNER_KEY);
  if (owner && owner !== userId) return;
  const key =
    slot === "working" ? CREATE_DRAFT_WORKING_KEY : CREATE_DRAFT_CHECKPOINT_KEY;
  await AsyncStorage.removeItem(key);
  if (slot === "main") {
    await AsyncStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
  }
}

async function claimLegacy(userId: string): Promise<void> {
  const start = getDraftRevision();
  const owner = await AsyncStorage.getItem(CREATE_DRAFT_LEGACY_OWNER_KEY);
  if (owner && owner !== userId) return;
  if (getDraftRevision() !== start) return;

  const [main, working] = await Promise.all([
    readLegacyDraftSlot("main"),
    readLegacyDraftSlot("working"),
  ]);
  if (getDraftRevision() !== start) return;
  if (!main && !working) return;

  if (!owner) await AsyncStorage.setItem(CREATE_DRAFT_LEGACY_OWNER_KEY, userId);
  if (getDraftRevision() !== start) return;

  for (const slot of ["main", "working"] as const) {
    const legacy = slot === "main" ? main : working;
    if (!legacy) continue;
    const scoped = await readLocalDraftSlot(slot);
    if (getDraftRevision() !== start) return;
    const winner = preferNewerDraft(scoped, legacy);
    if (winner && (!scoped || winner.savedAt > scoped.savedAt)) {
      await storeDraftSlot(slot, winner, { notify: false, bump: false });
    }
  }
  if (getDraftRevision() !== start) return;

  await AsyncStorage.multiRemove([
    CREATE_DRAFT_CHECKPOINT_KEY,
    CREATE_DRAFT_WORKING_KEY,
    CREATE_DRAFT_STORAGE_KEY,
    CREATE_DRAFT_LEGACY_OWNER_KEY,
  ]);
}

async function fetchRemote(): Promise<RemoteSlots> {
  const { data } = await api.get<{ data: RemoteSlots }>("/api/listings/drafts");
  return {
    main: data.data?.main ?? null,
    working: data.data?.working ?? null,
  };
}

async function mergeSlot(
  userId: string,
  slot: DraftSlot,
  remote: DraftCheckpoint | null,
): Promise<void> {
  if (await AsyncStorage.getItem(tombstoneKey(userId, slot))) {
    await deleteDraft(userId, slot);
    return;
  }
  const local = await readLocalDraftSlot(slot);
  if (local && (!remote || local.savedAt > remote.savedAt)) {
    await putDraft(slot, local);
    return;
  }
  if (remote && (!local || remote.savedAt > local.savedAt)) {
    await storeDraftSlot(slot, remote, { notify: false, bump: false });
  }
}

async function runSync(): Promise<void> {
  const userId = getActiveDraftUserId();
  if (!userId) return;
  try {
    await flushDraftAccountSync();
    const start = getDraftRevision();
    for (const slot of ["main", "working"] as const) {
      if (await AsyncStorage.getItem(tombstoneKey(userId, slot))) {
        await deleteDraft(userId, slot);
      }
    }
    if (getDraftRevision() !== start) return;
    await claimLegacy(userId);
    if (getDraftRevision() !== start) return;
    const remote = await fetchRemote();
    if (getActiveDraftUserId() !== userId || getDraftRevision() !== start) {
      return;
    }
    await mergeSlot(userId, "main", remote.main);
    if (getDraftRevision() !== start) return;
    await mergeSlot(userId, "working", remote.working);
  } catch {
    // Keep the on-device copy when the account sync cannot reach the API.
  }
}

function ensureAccountDraftSync(): Promise<void> {
  if (!getActiveDraftUserId()) return Promise.resolve();
  if (!inflight) {
    inflight = runSync().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

setDraftSyncHooks({
  ensure: ensureAccountDraftSync,
  onWrite,
  onClear,
  flush: flushDraftAccountSync,
});
