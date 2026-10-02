import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DraftPhoto } from "@/components/listings/PhotoPickerGrid";
import { PROPERTY_TYPE_OPTIONS, WIZARD_STEPS } from "@/constants/listingWizard";
import { emptyCutWindow } from "@/lib/electricityCuts";
import { numbersFromLegacy } from "@/lib/lebanonPhone";
import {
  effectiveCommittedStep,
  firstInvalidStepIndex,
} from "./validators";
import {
  CREATE_DRAFT_CHECKPOINT_KEY,
  CREATE_DRAFT_LEGACY_OWNER_KEY,
  CREATE_DRAFT_STORAGE_KEY,
  CREATE_DRAFT_WORKING_KEY,
  INITIAL_DRAFT,
  type CreateListingDraft,
  type DraftCheckpoint,
  type DraftSlot,
} from "./draft";

function persistable(draft: CreateListingDraft): CreateListingDraft {
  return {
    ...draft,
    photos: draft.photos.map((p) => {
      const status = p.status === "uploading" ? "error" : p.status;
      const uri =
        status === "ready" && (p.url || p.uri)
          ? p.url || p.uri
          : p.uri.startsWith("blob:")
            ? ""
            : p.uri;
      return {
        ...p,
        uri,
        url: p.url ?? (status === "ready" && uri ? uri : p.url),
        status: uri ? status : "error",
        error: uri ? p.error : "Photo expired — remove and add again",
      };
    }),
  };
}

export function hydrateDraft(parsed: CreateListingDraft): CreateListingDraft {
  const photos = (parsed.photos ?? []).map((p) => {
    if (p.status === "ready" && (p.url || p.uri)) {
      const src = p.url || p.uri;
      return { ...p, uri: src, url: p.url ?? src };
    }
    if (!p.uri || p.uri.startsWith("blob:")) {
      return {
        ...p,
        status: "error" as const,
        error: "Photo expired — remove and add again",
      };
    }
    if (p.status === "uploading") {
      return { ...p, status: "error" as const, error: "Upload interrupted" };
    }
    return p;
  });

  let pin = parsed.pin ?? INITIAL_DRAFT.pin;
  if (parsed.area && !pin.confirmed && pin.lat != null && pin.lng != null) {
    pin = { ...pin, confirmed: true };
  }

  const windows =
    parsed.electricityCutWindows?.length > 0
      ? parsed.electricityCutWindows
      : parsed.electricityCutsStart || parsed.electricityCutsEnd
        ? [
            {
              start: parsed.electricityCutsStart ?? "",
              end: parsed.electricityCutsEnd ?? "",
            },
          ]
        : [emptyCutWindow()];

  return {
    ...parsed,
    pin,
    photos,
    electricityCutWindows: windows,
    contactNumbers: numbersFromLegacy(parsed),
    cardBadges: Array.isArray(parsed.cardBadges) ? parsed.cardBadges : null,
  };
}

export function resumeStepFromCheckpoint(checkpoint: DraftCheckpoint): number {
  const committed = effectiveCommittedStep(
    checkpoint.draft,
    checkpoint.committedStep,
  );
  const { savedStep } = checkpoint;
  const draftStep = checkpoint.draft.step;

  let preferred: number;
  if (savedStep != null) {
    preferred = savedStep;
  } else if (draftStep > 0) {
    preferred = draftStep;
  } else if (committed < 0) {
    preferred = 0;
  } else {
    preferred = committed + 1;
  }
  preferred = Math.min(WIZARD_STEPS.length - 1, Math.max(0, preferred));

  const invalid = firstInvalidStepIndex(checkpoint.draft, preferred);
  if (invalid != null && invalid < preferred) return invalid;
  return preferred;
}

let activeDraftUserId: string | null = null;
let draftRevision = 0;

type DraftSyncHooks = {
  ensure: () => Promise<void>;
  onWrite: (slot: DraftSlot, checkpoint: DraftCheckpoint) => void;
  onClear: (slot: DraftSlot) => void;
  flush: () => Promise<void>;
};

const draftSyncHooks: DraftSyncHooks = {
  ensure: async () => {},
  onWrite: () => {},
  onClear: () => {},
  flush: async () => {},
};

export function setActiveDraftUserId(userId: string | null): void {
  activeDraftUserId = userId;
}

export function getActiveDraftUserId(): string | null {
  return activeDraftUserId;
}

export function getDraftRevision(): number {
  return draftRevision;
}

export function setDraftSyncHooks(next: DraftSyncHooks): void {
  draftSyncHooks.ensure = next.ensure;
  draftSyncHooks.onWrite = next.onWrite;
  draftSyncHooks.onClear = next.onClear;
  draftSyncHooks.flush = next.flush;
}

function storageKey(slot: DraftSlot): string {
  const base =
    slot === "working" ? CREATE_DRAFT_WORKING_KEY : CREATE_DRAFT_CHECKPOINT_KEY;
  return activeDraftUserId ? `${base}:${activeDraftUserId}` : base;
}

function legacyStorageKey(slot: DraftSlot): string {
  return slot === "working"
    ? CREATE_DRAFT_WORKING_KEY
    : CREATE_DRAFT_CHECKPOINT_KEY;
}

export async function readCheckpoint(): Promise<DraftCheckpoint | null> {
  await draftSyncHooks.ensure();
  return readVisibleDraftSlot("main");
}

async function readVisibleDraftSlot(
  slot: DraftSlot,
): Promise<DraftCheckpoint | null> {
  const saved = await readLocalDraftSlot(slot);
  if (saved || !activeDraftUserId) return saved;
  const owner = await AsyncStorage.getItem(CREATE_DRAFT_LEGACY_OWNER_KEY);
  if (owner && owner !== activeDraftUserId) return null;
  return readLegacyDraftSlot(slot);
}

/** Device copy for the signed-in account. Does not talk to the server. */
export async function readLocalDraftSlot(
  slot: DraftSlot,
): Promise<DraftCheckpoint | null> {
  const key = storageKey(slot);
  const raw = await AsyncStorage.getItem(key);
  if (raw) {
    try {
      return parseCheckpointJson(raw);
    } catch {
      if (slot !== "main" || activeDraftUserId) return null;
    }
  } else if (slot !== "main" || activeDraftUserId) {
    return null;
  }

  const legacy = await AsyncStorage.getItem(CREATE_DRAFT_STORAGE_KEY);
  if (!legacy) return null;

  try {
    const parsed = JSON.parse(legacy) as CreateListingDraft;
    const draft = hydrateDraft(parsed);
    const committedStep = draft.step > 0 ? Math.max(-1, draft.step - 1) : -1;
    const checkpoint: DraftCheckpoint = {
      committedStep,
      draft,
      savedAt: new Date().toISOString(),
    };
    await writeCheckpoint(draft, committedStep);
    await AsyncStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
    return checkpoint;
  } catch {
    return null;
  }
}

/** Pre-account drafts saved on this device before checkpoints were scoped. */
export async function readLegacyDraftSlot(
  slot: DraftSlot,
): Promise<DraftCheckpoint | null> {
  const raw = await AsyncStorage.getItem(legacyStorageKey(slot));
  if (raw) {
    try {
      return parseCheckpointJson(raw);
    } catch {
      if (slot !== "main") return null;
    }
  } else if (slot !== "main") {
    return null;
  }

  const legacy = await AsyncStorage.getItem(CREATE_DRAFT_STORAGE_KEY);
  if (!legacy) return null;
  try {
    const parsed = JSON.parse(legacy) as CreateListingDraft;
    const draft = hydrateDraft(parsed);
    const committedStep = draft.step > 0 ? Math.max(-1, draft.step - 1) : -1;
    return {
      committedStep,
      draft,
      savedAt: "1970-01-01T00:00:00.000Z",
    };
  } catch {
    return null;
  }
}

export async function storeDraftSlot(
  slot: DraftSlot,
  checkpoint: DraftCheckpoint | null,
  options?: { notify?: boolean; bump?: boolean },
): Promise<void> {
  const notify = options?.notify !== false;
  const bump = options?.bump !== false;
  if (bump) draftRevision += 1;

  if (!checkpoint) {
    await AsyncStorage.removeItem(storageKey(slot));
    if (slot === "working") setWorkingCheckpointCache(null);
    else setCheckpointCache(null);
    if (notify) draftSyncHooks.onClear(slot);
    return;
  }

  await AsyncStorage.setItem(storageKey(slot), JSON.stringify(checkpoint));
  if (slot === "working") setWorkingCheckpointCache(checkpoint);
  else setCheckpointCache(checkpoint);
  if (notify) draftSyncHooks.onWrite(slot, checkpoint);
}

function parseCheckpointJson(raw: string): DraftCheckpoint {
  const parsed = JSON.parse(raw) as DraftCheckpoint;
  return {
    committedStep: effectiveCommittedStep(
      hydrateDraft(parsed.draft),
      parsed.committedStep ?? -1,
    ),
    savedStep: parsed.savedStep,
    savedAt: parsed.savedAt ?? new Date().toISOString(),
    draft: hydrateDraft(parsed.draft),
  };
}

export async function readWorkingCheckpoint(): Promise<DraftCheckpoint | null> {
  await draftSyncHooks.ensure();
  return readVisibleDraftSlot("working");
}

async function writeCheckpointToSlot(
  slot: DraftSlot,
  draft: CreateListingDraft,
  committedStep: number,
  savedStep?: number,
): Promise<DraftCheckpoint> {
  const checkpoint: DraftCheckpoint = {
    committedStep,
    draft: persistable(draft),
    savedAt: new Date().toISOString(),
    ...(savedStep !== undefined ? { savedStep } : {}),
  };
  await storeDraftSlot(slot, checkpoint);
  return checkpoint;
}

export async function writeCheckpoint(
  draft: CreateListingDraft,
  committedStep: number,
  savedStep?: number,
): Promise<DraftCheckpoint> {
  return writeCheckpointToSlot("main", draft, committedStep, savedStep);
}

export async function writeWorkingCheckpoint(
  draft: CreateListingDraft,
  committedStep: number,
  savedStep?: number,
): Promise<DraftCheckpoint> {
  return writeCheckpointToSlot("working", draft, committedStep, savedStep);
}

export type FreshStartPlan = "fresh" | "resume-working";

/**
 * Decide whether "+" can start an empty working draft, or must resume the
 * existing working draft because both slots already have progress.
 */
export function planFreshStart(
  working: DraftCheckpoint | null,
  main: DraftCheckpoint | null,
): FreshStartPlan {
  if (
    draftHasMeaningfulProgress(working) &&
    draftHasMeaningfulProgress(main)
  ) {
    return "resume-working";
  }
  return "fresh";
}

/**
 * + always writes the working slot. Park that draft on main first so a
 * new listing cannot overwrite the only copy. If both slots already have
 * progress, leave them intact and resume working instead of wiping one.
 */
export async function parkWorkingDraftBeforeFresh(): Promise<FreshStartPlan> {
  const [working, main] = await Promise.all([
    readWorkingCheckpoint(),
    readCheckpoint(),
  ]);
  const plan = planFreshStart(working, main);
  if (plan === "resume-working") return plan;

  if (
    working &&
    draftHasMeaningfulProgress(working) &&
    !draftHasMeaningfulProgress(main)
  ) {
    await writeCheckpoint(
      working.draft,
      working.committedStep,
      working.savedStep,
    );
    await clearWorkingCheckpoint();
  }
  return "fresh";
}

export async function clearWorkingCheckpoint(): Promise<void> {
  await storeDraftSlot("working", null);
  await draftSyncHooks.flush();
}

export async function clearMainCheckpoint(): Promise<void> {
  await storeDraftSlot("main", null);
  if (!activeDraftUserId) {
    await AsyncStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
  }
  await draftSyncHooks.flush();
}

/** Clear only the slot that was just published or discarded. */
export async function clearDraftSlot(slot: DraftSlot): Promise<void> {
  if (slot === "working") {
    await clearWorkingCheckpoint();
    return;
  }
  await clearMainCheckpoint();
}

export async function clearAllDraftStorage(): Promise<void> {
  await storeDraftSlot("main", null);
  await storeDraftSlot("working", null);
  if (!activeDraftUserId) {
    await AsyncStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
  }
  await draftSyncHooks.flush();
}

export function draftHasMeaningfulProgress(
  checkpoint: DraftCheckpoint | null,
): boolean {
  if (!checkpoint) return false;
  if (checkpoint.committedStep >= 0) return true;
  const d = checkpoint.draft;
  return (
    d.spaceType != null ||
    d.propertyType != null ||
    d.area != null ||
    d.title.trim().length > 0 ||
    d.photos.length > 0
  );
}

export function checkpointCoverPhoto(
  checkpoint: DraftCheckpoint,
): DraftPhoto | undefined {
  return checkpoint.draft.photos.find((p) => p.status === "ready" && p.uri);
}

export function checkpointDisplayTitle(checkpoint: DraftCheckpoint): string {
  const d = checkpoint.draft;
  if (d.title.trim()) return d.title.trim();
  const property =
    PROPERTY_TYPE_OPTIONS.find((o) => o.value === d.propertyType)?.label ??
    "House";
  const started = new Date(checkpoint.savedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `Your ${property} listing started ${started}`;
}

export function checkpointLocationLine(checkpoint: DraftCheckpoint): string {
  const d = checkpoint.draft;
  const typeLabel =
    d.spaceType === "entire_place"
      ? "Home"
      : d.spaceType === "private_room"
        ? "Private room"
        : d.spaceType === "shared_room"
          ? "Shared room"
          : "Home";
  const area = d.area ?? "Lebanon";
  return `${typeLabel} in ${area}`;
}

/** In-memory cache so nav hooks can read last-known checkpoint synchronously on web. */
let checkpointCache: DraftCheckpoint | null = null;
let workingCheckpointCache: DraftCheckpoint | null = null;

export function getCheckpointCache(): DraftCheckpoint | null {
  return checkpointCache;
}

export function getWorkingCheckpointCache(): DraftCheckpoint | null {
  return workingCheckpointCache;
}

export function setCheckpointCache(checkpoint: DraftCheckpoint | null): void {
  checkpointCache = checkpoint;
}

export function setWorkingCheckpointCache(
  checkpoint: DraftCheckpoint | null,
): void {
  workingCheckpointCache = checkpoint;
}

export async function refreshCheckpointCache(): Promise<DraftCheckpoint | null> {
  const cp = await readCheckpoint();
  setCheckpointCache(cp);
  return cp;
}

export async function refreshWorkingCheckpointCache(): Promise<DraftCheckpoint | null> {
  const cp = await readWorkingCheckpoint();
  setWorkingCheckpointCache(cp);
  return cp;
}

export function emptyCheckpointDraft(): CreateListingDraft {
  return { ...INITIAL_DRAFT };
}
