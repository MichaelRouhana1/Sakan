import {
  INITIAL_DRAFT,
  type CreateListingAction,
  type CreateListingDraft,
} from "./draft";
import { nextParkingIncludedInRent } from "./parkingIncluded";

export function createListingReducer(
  state: CreateListingDraft,
  action: CreateListingAction,
): CreateListingDraft {
  switch (action.type) {
    case "hydrate":
      return {
        ...INITIAL_DRAFT,
        ...action.draft,
        photos: action.draft.photos ?? [],
        waterBillIncluded: action.draft.waterBillIncluded ?? false,
        buildingFeesIncluded: action.draft.buildingFeesIncluded ?? false,
        parkingIncludedInRent: action.draft.parkingIncludedInRent ?? false,
      };
    case "patchUnit": {
      if (action.index === 0) return createListingReducer(state, {type:'patch',patch:action.patch});
      return {...state, additionalUnits:(state.additionalUnits ?? []).map((unit,i)=>i===action.index-1?{...unit,data:{...unit.data,...action.patch}}:unit)};
    }
    case "gallery": {
      const previous = action.index === 'shared' ? state.sharedPhotos ?? [] : action.index === 0 ? state.photos : state.additionalUnits?.[action.index-1]?.data.photos ?? [];
      const photos = typeof action.updater === 'function' ? action.updater(previous) : action.updater;
      return action.index === 'shared' ? {...state,sharedPhotos:photos} : createListingReducer(state,{type:'patchUnit',index:action.index,patch:{photos}});
    }
    case "reset":
      return { ...INITIAL_DRAFT };
    case "setStep":
      return { ...state, step: action.step };
    case "prevStep":
      return { ...state, step: Math.max(0, state.step - 1) };
    case "patch": {
      const next = { ...state, ...action.patch };
      if (action.patch.amenities) {
        next.parkingIncludedInRent = nextParkingIncludedInRent({
          previousAmenities: state.amenities,
          nextAmenities: next.amenities,
          previousIncluded: state.parkingIncludedInRent,
          explicit: action.patch.parkingIncludedInRent,
        });
      }
      return next;
    }
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
