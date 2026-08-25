import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { router } from "expo-router";
import { Platform } from "react-native";
import type { DraftPhoto } from "@/components/listings/PhotoPickerGrid";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";
import { createListingReducer } from "./createListingReducer";
import {
  clearAllDraftStorage,
  draftHasMeaningfulProgress,
  parkWorkingDraftBeforeFresh,
  readCheckpoint,
  readWorkingCheckpoint,
  resumeStepFromCheckpoint,
  setCheckpointCache,
  writeCheckpoint,
  writeWorkingCheckpoint,
} from "./createDraftCheckpoint";
import { INITIAL_DRAFT, type CreateListingDraft, type DraftSlot } from "./draft";
import { WIZARD_STEPS } from "@/constants/listingWizard";
import { stepFieldErrors } from "./validators";

type Ctx = {
  draft: CreateListingDraft;
  committedStep: number;
  patch: (patch: Partial<CreateListingDraft>) => void;
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>;
  setStep: (step: number) => void;
  goNext: () => boolean;
  goBack: () => void;
  saveAndExit: () => Promise<void>;
  reset: () => void;
  showValidation: boolean;
  fieldErrors: string[];
  fieldInvalid: (field: string) => boolean;
};

const CreateListingContext = createContext<Ctx | null>(null);

export function CreateListingProvider({
  children,
  startFresh = false,
  draftSlot = "main",
}: {
  children: ReactNode;
  startFresh?: boolean;
  draftSlot?: DraftSlot;
}) {
  const [draft, dispatch] = useReducer(createListingReducer, INITIAL_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const committedStepRef = useRef(-1);
  const draftRef = useRef(draft);
  const draftSlotRef = useRef(draftSlot);

  useEffect(() => {
    draftSlotRef.current = draftSlot;
  }, [draftSlot]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    const slot = draftSlot;
    const readForSlot = slot === "working" ? readWorkingCheckpoint : readCheckpoint;

    if (startFresh) {
      void parkWorkingDraftBeforeFresh().then(() => {
        if (cancelled) return;
        committedStepRef.current = -1;
        dispatch({ type: "reset" });
        setHydrated(true);
      });
      return;
    }

    void readForSlot().then((checkpoint) => {
      if (cancelled) return;
      if (checkpoint) {
        committedStepRef.current = checkpoint.committedStep;
        if (slot === "working") {
          // working cache updated on write; main cache unchanged
        } else {
          setCheckpointCache(checkpoint);
        }
        const resumeStep = resumeStepFromCheckpoint(checkpoint);
        dispatch({
          type: "hydrate",
          draft: { ...checkpoint.draft, step: resumeStep },
        });
      } else if (slot === "main") {
        setCheckpointCache(null);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [startFresh, draftSlot]);

  const fieldErrors = stepFieldErrors(draft, draft.step);

  useEffect(() => {
    setShowValidation(false);
  }, [draft.step]);

  const fieldInvalid = useCallback(
    (field: string) => showValidation && fieldErrors.includes(field),
    [showValidation, fieldErrors],
  );

  const patch = useCallback((next: Partial<CreateListingDraft>) => {
    dispatch({ type: "patch", patch: next });
  }, []);

  const setPhotos = useCallback((updater: SetStateAction<DraftPhoto[]>) => {
    dispatch({ type: "updatePhotos", updater });
  }, []);

  const setStep = useCallback((step: number) => {
    dispatch({
      type: "setStep",
      step: Math.max(0, Math.min(WIZARD_STEPS.length - 1, step)),
    });
  }, []);

  const persistCheckpoint = useCallback(
    async (
      nextDraft: CreateListingDraft,
      committedStep: number,
      savedStep?: number,
    ) => {
      committedStepRef.current = committedStep;
      const slot = draftSlotRef.current;
      const write =
        slot === "working" ? writeWorkingCheckpoint : writeCheckpoint;
      await write(nextDraft, committedStep, savedStep);
    },
    [],
  );

  const goNext = useCallback(() => {
    const errors = stepFieldErrors(draft, draft.step);
    if (errors.length > 0) {
      setShowValidation(true);
      return false;
    }
    setShowValidation(false);
    const committedStep = draft.step;
    const nextStep = Math.min(WIZARD_STEPS.length - 1, draft.step + 1);
    const nextDraft = { ...draft, step: nextStep };
    void persistCheckpoint(nextDraft, committedStep);
    dispatch({ type: "setStep", step: nextStep });
    return true;
  }, [draft, persistCheckpoint]);

  const goBack = useCallback(() => {
    dispatch({ type: "prevStep" });
  }, []);

  const saveAndExit = useCallback(async () => {
    const current = draftRef.current;
    const committedStep = committedStepRef.current;
    const hasProgress = draftHasMeaningfulProgress({
      committedStep,
      draft: current,
      savedAt: new Date().toISOString(),
    });
    if (hasProgress) {
      await persistCheckpoint(current, committedStep, current.step);
    }
    if (Platform.OS === "web") {
      router.replace(HOST_LISTINGS_PATH as never);
    } else {
      router.replace("/(poster)/(tabs)" as never);
    }
  }, [persistCheckpoint]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    committedStepRef.current = -1;
    setCheckpointCache(null);
    void clearAllDraftStorage();
  }, []);

  const value = useMemo(
    () => ({
      draft,
      committedStep: committedStepRef.current,
      patch,
      setPhotos,
      setStep,
      goNext,
      goBack,
      saveAndExit,
      reset,
      showValidation,
      fieldErrors,
      fieldInvalid,
    }),
    [
      draft,
      patch,
      setPhotos,
      setStep,
      goNext,
      goBack,
      saveAndExit,
      reset,
      showValidation,
      fieldErrors,
      fieldInvalid,
    ],
  );

  return (
    <CreateListingContext.Provider value={value}>
      {hydrated ? children : null}
    </CreateListingContext.Provider>
  );
}

export function useCreateListingDraft() {
  const ctx = useContext(CreateListingContext);
  if (!ctx) {
    throw new Error("useCreateListingDraft must be inside CreateListingProvider");
  }
  return ctx;
}
