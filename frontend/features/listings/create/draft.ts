import type { DraftPhoto } from "@/components/listings/PhotoPickerGrid";
import type { ListingPin } from "@/components/listings/LocationPicker";
import type { LebanonArea } from "@/constants/areas";
import type {
  ElectricityStatus,
  FurnishingType,
  GenderRestriction,
  GuestsPolicy,
  LeaseTerm,
  ListingPosterRole,
  PaymentModality,
  PetsPolicy,
  PriceBasis,
  PropertyType,
  SmokingPolicy,
  SpaceType,
  TargetAudience,
  WaterStatus,
} from "@/types/listing";

import type { CutWindow } from "@/lib/electricityCuts";
import { emptyCutWindow } from "@/lib/electricityCuts";
import type { ContactNumber } from "@/lib/lebanonPhone";
import { emptyContactNumber } from "@/lib/lebanonPhone";

export const CREATE_DRAFT_STORAGE_KEY = "skoun.createListing.draft.v4";

export const EMPTY_PIN: ListingPin = {
  lng: 35.5018,
  lat: 33.8938,
  confirmed: false,
  source: null,
  landmarkId: null,
  landmarkLabel: "",
};

export type CreateListingDraft = {
  step: number;
  spaceType: SpaceType | null;
  propertyType: PropertyType | null;
  priceBasis: PriceBasis;
  area: LebanonArea | null;
  addressLine: string;
  buildingName: string;
  pin: ListingPin;
  primaryCampusId: string | null;
  landmark: string;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxOccupancy: number;
  furnishingType: FurnishingType | null;
  floorNumber: number;
  areaSqm: string;
  hasElevator: boolean;
  elevator24_7: boolean;
  electricity: ElectricityStatus | null;
  electricityCutWindows: CutWindow[];
  electricityCutsStart: string;
  electricityCutsEnd: string;
  electricityHoursOn: number | null;
  generatorAmperes: number | null;
  hasSolar: boolean;
  generatorIncluded: boolean;
  water: WaterStatus | null;
  wifiIncluded: boolean;
  routerUps: boolean;
  conciergeIncluded: boolean;
  cookingGasIncluded: boolean;
  amenities: string[];
  genderRestriction: GenderRestriction;
  targetAudience: TargetAudience;
  smokingPolicy: SmokingPolicy;
  petsPolicy: PetsPolicy;
  guestsPolicy: GuestsPolicy;
  quietHours: boolean;
  photos: DraftPhoto[];
  monthlyRentUsd: string;
  depositPreset: "none" | "1" | "2" | "custom";
  securityDepositUsd: string;
  leaseTerm: LeaseTerm;
  availableImmediate: boolean;
  availableFrom: string;
  paymentModality: PaymentModality;
  title: string;
  description: string;
  highlightTags: string[];
  listingPosterRole: ListingPosterRole | null;
  contactName: string;
  contactNumbers: ContactNumber[];
  contactPhone: string;
  whatsappSameAsPhone: boolean;
  whatsappNumber: string;
};

export const INITIAL_DRAFT: CreateListingDraft = {
  step: 0,
  spaceType: null,
  propertyType: null,
  priceBasis: "per_unit_month",
  area: null,
  addressLine: "",
  buildingName: "",
  pin: EMPTY_PIN,
  primaryCampusId: null,
  landmark: "",
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  maxOccupancy: 1,
  furnishingType: null,
  floorNumber: 0,
  areaSqm: "",
  hasElevator: false,
  elevator24_7: false,
  electricity: null,
  electricityCutWindows: [emptyCutWindow()],
  electricityCutsStart: "",
  electricityCutsEnd: "",
  electricityHoursOn: null,
  generatorAmperes: null,
  hasSolar: false,
  generatorIncluded: false,
  water: null,
  wifiIncluded: false,
  routerUps: false,
  conciergeIncluded: false,
  cookingGasIncluded: false,
  amenities: [],
  genderRestriction: "anyone",
  targetAudience: "students_only",
  smokingPolicy: "no",
  petsPolicy: "no",
  guestsPolicy: "restricted",
  quietHours: false,
  photos: [],
  monthlyRentUsd: "",
  depositPreset: "1",
  securityDepositUsd: "",
  leaseTerm: "semester",
  availableImmediate: true,
  availableFrom: "",
  paymentModality: "monthly",
  title: "",
  description: "",
  highlightTags: [],
  listingPosterRole: null,
  contactName: "",
  contactNumbers: [emptyContactNumber()],
  contactPhone: "",
  whatsappSameAsPhone: true,
  whatsappNumber: "",
};

export type CreateListingAction =
  | { type: "hydrate"; draft: CreateListingDraft }
  | { type: "reset" }
  | { type: "setStep"; step: number }
  | { type: "prevStep" }
  | { type: "patch"; patch: Partial<CreateListingDraft> }
  | {
      type: "updatePhotos";
      updater: DraftPhoto[] | ((prev: DraftPhoto[]) => DraftPhoto[]);
    };
