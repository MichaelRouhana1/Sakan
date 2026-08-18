import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { DraftPhoto } from "@/components/listings/PhotoPickerGrid";
import { createListingReducer } from "./createListingReducer";
import {
  CREATE_DRAFT_STORAGE_KEY,
  INITIAL_DRAFT,
  type CreateListingDraft,
} from "./draft";
import { WIZARD_STEPS } from "@/constants/listingWizard";
import { stepFieldErrors } from "./validators";

type Ctx = {
  draft: CreateListingDraft;
  patch: (patch: Partial<CreateListingDraft>) => void;
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>;
  setStep: (step: number) => void;
  goNext: () => boolean;
  goBack: () => void;
  reset: () => void;
  showValidation: boolean;
  fieldErrors: string[];
  fieldInvalid: (field: string) => boolean;
};

const CreateListingContext = createContext<Ctx | null>(null);

function persistable(draft: CreateListingDraft): CreateListingDraft {
  return {
    ...draft,
    photos: draft.photos.map((p) => {
      const status = p.status === "uploading" ? "error" : p.status;
      const uri =
        status === "ready" && p.url
          ? p.url
          : p.uri.startsWith("blob:")
            ? ""
            : p.uri;
      return {
        ...p,
        uri,
        status: uri ? status : "error",
        error: uri ? p.error : "Photo expired — remove and add again",
      };
    }),
  };
}

function hydrateDraft(parsed: CreateListingDraft): CreateListingDraft {
  return {
    ...parsed,
    photos: (parsed.photos ?? []).map((p) => {
      if (p.status === "ready" && p.url) {
        return { ...p, uri: p.url };
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
    }),
  };
}

export function CreateListingProvider({ children }: { children: ReactNode }) {
  const [draft, dispatch] = useReducer(createListingReducer, INITIAL_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(CREATE_DRAFT_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CreateListingDraft;
          dispatch({ type: "hydrate", draft: hydrateDraft(parsed) });
        } catch {
          /* ignore corrupt draft */
        }
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(
      CREATE_DRAFT_STORAGE_KEY,
      JSON.stringify(persistable(draft)),
    );
  }, [draft, hydrated]);

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

  const goNext = useCallback(() => {
    const errors = stepFieldErrors(draft, draft.step);
    if (errors.length > 0) {
      setShowValidation(true);
      return false;
    }
    setShowValidation(false);
    dispatch({
      type: "setStep",
      step: Math.min(WIZARD_STEPS.length - 1, draft.step + 1),
    });
    return true;
  }, [draft]);

  const goBack = useCallback(() => {
    dispatch({ type: "prevStep" });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    void AsyncStorage.removeItem(CREATE_DRAFT_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      draft,
      patch,
      setPhotos,
      setStep,
      goNext,
      goBack,
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
