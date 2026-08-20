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

export async function readCheckpoint(): Promise<DraftCheckpoint | null> {
  const raw = await AsyncStorage.getItem(CREATE_DRAFT_CHECKPOINT_KEY);
  if (raw) {
    try {
      return parseCheckpointJson(raw);
    } catch {
      /* fall through to legacy migration */
    }
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
  const raw = await AsyncStorage.getItem(CREATE_DRAFT_WORKING_KEY);
  if (!raw) return null;
  try {
    return parseCheckpointJson(raw);
  } catch {
    return null;
  }
}

async function writeCheckpointToSlot(
  slot: DraftSlot,
  draft: CreateListingDraft,
  committedStep: number,
  savedStep?: number,
): Promise<DraftCheckpoint> {
  const storageKey =
    slot === "working" ? CREATE_DRAFT_WORKING_KEY : CREATE_DRAFT_CHECKPOINT_KEY;
  const checkpoint: DraftCheckpoint = {
    committedStep,
    draft: persistable(draft),
    savedAt: new Date().toISOString(),
    ...(savedStep !== undefined ? { savedStep } : {}),
  };
  await AsyncStorage.setItem(storageKey, JSON.stringify(checkpoint));
  if (slot === "working") {
    setWorkingCheckpointCache(checkpoint);
  } else {
    setCheckpointCache(checkpoint);
  }
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

/**
 * + always writes the working slot. Park that draft on main first so a
 * new listing cannot overwrite the only copy.
 */
export async function parkWorkingDraftBeforeFresh(): Promise<void> {
  const [working, main] = await Promise.all([
    readWorkingCheckpoint(),
    readCheckpoint(),
  ]);
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
}

export async function clearWorkingCheckpoint(): Promise<void> {
  await AsyncStorage.removeItem(CREATE_DRAFT_WORKING_KEY);
  setWorkingCheckpointCache(null);
}

export async function clearMainCheckpoint(): Promise<void> {
  await AsyncStorage.removeItem(CREATE_DRAFT_CHECKPOINT_KEY);
  setCheckpointCache(null);
}

export async function clearAllDraftStorage(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(CREATE_DRAFT_CHECKPOINT_KEY),
    AsyncStorage.removeItem(CREATE_DRAFT_WORKING_KEY),
    AsyncStorage.removeItem(CREATE_DRAFT_STORAGE_KEY),
  ]);
  setCheckpointCache(null);
  setWorkingCheckpointCache(null);
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
