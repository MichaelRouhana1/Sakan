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
import type { DraftPhoto } from "@/components/listings/PhotoPickerGrid";
import { LAST_REQUIRED_WIZARD_INDEX } from "@/constants/listingWizard";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { CreateListingContext } from "@/features/listings/create/CreateListingProvider";
import { createListingReducer } from "@/features/listings/create/createListingReducer";
import {
  INITIAL_DRAFT,
  type CreateListingDraft,
} from "@/features/listings/create/draft";
import { stepFieldErrors } from "@/features/listings/create/validators";
import { useListing } from "@/features/listings/useListing";
import { mapListingToDraft } from "./mapListingToDraft";
import { isWithinStructuralWindow } from "./structuralFields";

export type EditListingMeta = {
  loading: boolean;
  missing: boolean;
  forbidden: boolean;
  notLive: boolean;
  structuralLocked: boolean;
  baseline: CreateListingDraft | null;
  title: string;
};

const EditMetaContext = createContext<EditListingMeta | null>(null);

export function useEditListingMeta(): EditListingMeta {
  const value = useContext(EditMetaContext);
  if (!value) {
    throw new Error("useEditListingMeta must be inside EditListingProvider");
  }
  return value;
}

const HARD_KEYS = new Set<string>([
  "spaceType",
  "propertyType",
  "targetAudience",
  "genderRestriction",
  "bedrooms",
  "beds",
  "bathrooms",
  "maxOccupancy",
  "floorNumber",
  "areaSqm",
  "area",
  "pin",
  "landmark",
  "addressLine",
  "buildingName",
  "primaryCampusId",
]);

export function EditListingProvider({
  listingId,
  children,
}: {
  listingId: string;
  children: ReactNode;
}) {
  const { session, isLoading: sessionLoading } = useAuthSession();
  const listingQuery = useListing(listingId);
  const [draft, dispatch] = useReducer(createListingReducer, INITIAL_DRAFT);
  const [showValidation, setShowValidation] = useState(false);
  const [baseline, setBaseline] = useState<CreateListingDraft | null>(null);
  const hydratedId = useRef<string | null>(null);
  const lockedRef = useRef(false);

  const listing = listingQuery.data;
  const structuralLocked = listing
    ? !isWithinStructuralWindow(listing.publishedAt)
    : false;
  lockedRef.current = structuralLocked;

  useEffect(() => {
    if (!listing || !session) return;
    if (listing.posterId !== session.userId) return;
    if (listing.status !== "active") return;
    if (hydratedId.current === listing.id) return;
    const next = mapListingToDraft(listing);
    setBaseline(next);
    dispatch({ type: "hydrate", draft: next });
    hydratedId.current = listing.id;
  }, [listing, session]);

  const fieldErrors = useMemo(() => {
    if (!showValidation) return [];
    const errors: string[] = [];
    for (let step = 0; step <= LAST_REQUIRED_WIZARD_INDEX; step += 1) {
      errors.push(...stepFieldErrors(draft, step));
    }
    return errors;
  }, [draft, showValidation]);

  const fieldInvalid = useCallback(
    (field: string) => showValidation && fieldErrors.includes(field),
    [showValidation, fieldErrors],
  );

  const patch = useCallback((next: Partial<CreateListingDraft>) => {
    if (!lockedRef.current) {
      dispatch({ type: "patch", patch: next });
      return;
    }
    const filtered: Partial<CreateListingDraft> = {};
    for (const [key, value] of Object.entries(next)) {
      if (HARD_KEYS.has(key)) continue;
      (filtered as Record<string, unknown>)[key] = value;
    }
    if (Object.keys(filtered).length === 0) return;
    dispatch({ type: "patch", patch: filtered });
  }, []);

  const setPhotos = useCallback((updater: SetStateAction<DraftPhoto[]>) => {
    dispatch({ type: "updatePhotos", updater });
  }, []);

  const lockedFields = structuralLocked ? HARD_KEYS : EMPTY_LOCKED;

  const formValue = useMemo(
    () => ({
      draft,
      committedStep: LAST_REQUIRED_WIZARD_INDEX,
      patch,
      setPhotos,
      setStep: () => undefined,
      goNext: () => false,
      goBack: () => undefined,
      saveAndExit: async () => undefined,
      reset: async () => undefined,
      showValidation,
      fieldErrors,
      fieldInvalid,
      setShowValidation,
      formChrome: "edit" as const,
      lockedFields,
      isLocked: (field: string) => lockedFields.has(field),
    }),
    [
      draft,
      patch,
      setPhotos,
      showValidation,
      fieldErrors,
      fieldInvalid,
      lockedFields,
    ],
  );

  const ownerId = session?.userId;
  const forbidden = Boolean(
    listing && ownerId && listing.posterId !== ownerId,
  );
  const notLive = Boolean(listing && !forbidden && listing.status !== "active");
  const meta: EditListingMeta = {
    loading: listingQuery.isLoading || sessionLoading,
    missing: listingQuery.isError || (!listingQuery.isLoading && !listing),
    forbidden,
    notLive,
    structuralLocked,
    baseline,
    title: listing?.title?.trim() || listing?.area || "Listing",
  };

  return (
    <EditMetaContext.Provider value={meta}>
      <CreateListingContext.Provider value={formValue}>
        {children}
      </CreateListingContext.Provider>
    </EditMetaContext.Provider>
  );
}

const EMPTY_LOCKED: ReadonlySet<string> = new Set();
