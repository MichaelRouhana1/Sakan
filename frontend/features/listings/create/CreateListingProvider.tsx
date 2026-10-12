import { eventId } from '@/features/promotions/activity';
import { adjacentStep } from './unitDrafts';
import { api } from '@/lib/api';
import { placeToDraft } from './placeToDraft';
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
import { Platform, View, Text, Pressable } from "react-native";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { flushDraftAccountSync } from "./draftAccountSync";
import type { DraftPhoto } from "@/components/listings/PhotoPickerGrid";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";
import { createListingReducer } from "./createListingReducer";
import {
  clearDraftSlot,
  draftHasMeaningfulProgress,
  parkWorkingDraftBeforeFresh,
  readCheckpoint,
  readWorkingCheckpoint,
  resumeStepFromCheckpoint,
  setActiveDraftUserId,
  setCheckpointCache,
  writeCheckpoint,
  writeWorkingCheckpoint,
} from "./createDraftCheckpoint";
import { INITIAL_DRAFT, type CreateListingDraft, type DraftSlot } from "./draft";
import { WIZARD_STEPS } from "@/constants/listingWizard";
import { stepFieldErrors } from "./validators";

export type ListingFormChrome = "wizard" | "edit";

export type ListingFormApi = {
  draft: CreateListingDraft;
  committedStep: number;
  patch: (patch: Partial<CreateListingDraft>) => void;
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>;
  patchUnit?: (index: number, patch: Partial<CreateListingDraft>) => void;
  setGallery?: (index: number | 'shared', updater: SetStateAction<DraftPhoto[]>) => void;
  setStep: (step: number) => void;
  goNext: () => boolean;
  goBack: () => void;
  saveAndExit: () => Promise<void>;
  persistDraft?: () => Promise<void>;
  reset: () => Promise<void>;
  showValidation: boolean;
  fieldErrors: string[];
  fieldInvalid: (field: string) => boolean;
  setShowValidation: (show: boolean) => void;
  formChrome: ListingFormChrome;
  lockedFields: ReadonlySet<string>;
  isLocked: (field: string) => boolean;
};

const CreateListingContext = createContext<ListingFormApi | null>(null);

export { CreateListingContext };

const NO_LOCKED_FIELDS: ReadonlySet<string> = new Set();

export function CreateListingProvider({
  children,
  startFresh = false,
  draftSlot = "main",
  placeId,
}: {
  children: ReactNode;
  startFresh?: boolean;
  draftSlot?: DraftSlot;
  placeId?: string;
}) {
  const [draft, dispatch] = useReducer(createListingReducer, INITIAL_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [loadError,setLoadError]=useState<string|null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const committedStepRef = useRef(-1);
  const hydratedOwnerRef = useRef<string|null|undefined>(undefined);
  const draftRef = useRef(draft);
  const draftSlotRef = useRef(draftSlot);
  const releasedRef = useRef(false);
  const { session, isLoading: authLoading } = useAuthSession();
  const initializedScope = useRef<string | undefined>(undefined);
  const userId = session?.userId ?? null;

  useEffect(() => {
    draftSlotRef.current = draftSlot;
  }, [draftSlot]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (authLoading) return;
    const scope = JSON.stringify([userId, draftSlot, placeId]);
    if (initializedScope.current === scope) return;
    let cancelled = false;
    const slot = draftSlot;
    hydratedOwnerRef.current=undefined;
    releasedRef.current = false;
    setHydrated(false);
    setLoadError(null);
    setActiveDraftUserId(userId);

    async function hydrate() {
      if (startFresh) {
        const plan = await parkWorkingDraftBeforeFresh();
        if (cancelled) return;
        if (plan === "resume-working") {
          const checkpoint = await readWorkingCheckpoint();
          if (cancelled) return;
          if (checkpoint) {
            if(placeId && checkpoint.draft.existingPlaceId!==placeId)throw new Error('Both draft slots have saved work. Finish or discard a saved draft from the dashboard before adding this unit.');
            committedStepRef.current = checkpoint.committedStep;
            const resumeStep = resumeStepFromCheckpoint(checkpoint);
            dispatch({
              type: "hydrate",
              draft: { ...checkpoint.draft, step: resumeStep },
            });
            initializedScope.current=scope;
            hydratedOwnerRef.current=userId;
            setHydrated(true);
            return;
          }
        }
        committedStepRef.current = -1;
        if (placeId) {
          const {data} = await api.get(`/api/listings/places/${placeId}`);
          if(cancelled)return;
          dispatch({type:'hydrate',draft:{...INITIAL_DRAFT,...placeToDraft(data.data),existingPlaceId:placeId}});
        } else dispatch({ type: "reset" });
        initializedScope.current=scope;
        hydratedOwnerRef.current=userId;
            setHydrated(true);
        return;
      }

      const readForSlot =
        slot === "working" ? readWorkingCheckpoint : readCheckpoint;
      const checkpoint = await readForSlot();
      if (cancelled) return;
      if (checkpoint) {
        committedStepRef.current = checkpoint.committedStep;
        if (slot !== "working") {
          setCheckpointCache(checkpoint);
        }
        const resumeStep = resumeStepFromCheckpoint(checkpoint);
        dispatch({
          type: "hydrate",
          draft: { ...checkpoint.draft, step: resumeStep },
        });
      } else {
        committedStepRef.current = -1;
        dispatch({ type: "reset" });
        if (slot === "main") setCheckpointCache(null);
      }
      initializedScope.current=scope;
      hydratedOwnerRef.current=userId;
            setHydrated(true);
    }

    void hydrate().catch(e=>{if(!cancelled)setLoadError(e instanceof Error?e.message:"Could not load your draft.");});
    return () => {
      cancelled = true;
    };
  }, [startFresh, draftSlot, userId, placeId, authLoading]);

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

  const patchUnit = useCallback((index:number, patch:Partial<CreateListingDraft>)=>dispatch({type:'patchUnit',index,patch}),[]);
  const setGallery = useCallback((index:number|'shared',updater:SetStateAction<DraftPhoto[]>)=>dispatch({type:'gallery',index,updater}),[]);

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
      if (releasedRef.current || hydratedOwnerRef.current!==userId) return;
      committedStepRef.current = committedStep;
      const slot = draftSlotRef.current;
      const write =
        slot === "working" ? writeWorkingCheckpoint : writeCheckpoint;
      await write(nextDraft, committedStep, savedStep);
    },
    [userId],
  );

  const persistDraft = useCallback(async()=>{
    await persistCheckpoint(draftRef.current,committedStepRef.current,draftRef.current.step);
    await flushDraftAccountSync();
  },[persistCheckpoint]);
  useEffect(() => {
    if (!hydrated || !startFresh) return;
    let cancelled = false;
    // Consume the fresh-start URL only after the working checkpoint is durable.
    void persistCheckpoint(draftRef.current, committedStepRef.current, draftRef.current.step).then(() => {
      if (!cancelled) router.setParams({ new: undefined, working: '1' });
    });
    return () => { cancelled = true; };
  }, [hydrated, startFresh, persistCheckpoint]);
  useEffect(()=>{
    if(!hydrated || releasedRef.current)return;
    if(!draft.publishRequestId){patch({publishRequestId:eventId()});return;}
    const timer=setTimeout(()=>{void persistCheckpoint(draft,committedStepRef.current,draft.step);},700);
    return ()=>clearTimeout(timer);
  },[draft,hydrated,patch,persistCheckpoint]);

  const goNext = useCallback(() => {
    const errors = stepFieldErrors(draft, draft.step);
    if (errors.length > 0) {
      setShowValidation(true);
      return false;
    }
    setShowValidation(false);
    const committedStep = draft.step;
    const nextStep = adjacentStep(draft, 1);
    const nextDraft = { ...draft, step: nextStep };
    void persistCheckpoint(nextDraft, committedStep);
    dispatch({ type: "setStep", step: nextStep });
    return true;
  }, [draft, persistCheckpoint]);

  const goBack = useCallback(() => {
    dispatch({ type: "setStep", step:adjacentStep(draftRef.current,-1) });
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
      await flushDraftAccountSync();
    }
    if (Platform.OS === "web") {
      router.replace(HOST_LISTINGS_PATH as never);
    } else {
      router.replace("/(poster)/(tabs)" as never);
    }
  }, [persistCheckpoint]);

  const reset = useCallback(async () => {
    releasedRef.current = true;
    draftRef.current = INITIAL_DRAFT;
    dispatch({ type: "reset" });
    committedStepRef.current = -1;
    await clearDraftSlot(draftSlotRef.current);
  }, []);

  const value = useMemo(
    () => ({
      draft,
      committedStep: committedStepRef.current,
      patch,
      setPhotos,
      patchUnit,
      setGallery,
      setStep,
      goNext,
      goBack,
      saveAndExit,
      persistDraft,
      reset,
      showValidation,
      fieldErrors,
      fieldInvalid,
      setShowValidation,
      formChrome: "wizard" as const,
      lockedFields: NO_LOCKED_FIELDS,
      isLocked: () => false,
    }),
    [
      draft,
      patch,
      setPhotos,
      patchUnit,
      setGallery,
      setStep,
      goNext,
      goBack,
      saveAndExit,
      persistDraft,
      reset,
      showValidation,
      fieldErrors,
      fieldInvalid,
      setShowValidation,
    ],
  );

  return (
    <CreateListingContext.Provider value={value}>
      {loadError ? <View style={{padding:32,gap:20}}><Text accessibilityRole="alert">{loadError}</Text><Pressable accessibilityRole="button" onPress={()=>router.replace(HOST_LISTINGS_PATH as never)}><Text>Return to dashboard</Text></Pressable></View> : hydrated ? children : null}
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
