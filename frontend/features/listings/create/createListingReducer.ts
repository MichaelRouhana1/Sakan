import {
  INITIAL_DRAFT,
  type CreateListingAction,
  type CreateListingDraft,
} from "./draft";

export function createListingReducer(
  state: CreateListingDraft,
  action: CreateListingAction,
): CreateListingDraft {
  switch (action.type) {
    case "hydrate":
      return { ...INITIAL_DRAFT, ...action.draft, photos: action.draft.photos ?? [] };
    case "reset":
      return { ...INITIAL_DRAFT };
    case "setStep":
      return { ...state, step: action.step };
    case "prevStep":
      return { ...state, step: Math.max(0, state.step - 1) };
    case "patch":
      return { ...state, ...action.patch };
    case "updatePhotos": {
      const next =
        typeof action.updater === "function"
          ? action.updater(state.photos)
          : action.updater;
      return { ...state, photos: next };
    }
    default:
      return state;
  }
}
