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

export const EMPTY_PIN: ListingPin = {
  lng: 35.5018,
  lat: 33.8938,
  confirmed: false,
  source: null,
  landmarkId: null,
  landmarkLabel: "",
};

export type CreateListingDraft = {
  sharedPhotos?: DraftPhoto[];
  existingPlaceId?: string;
  placeKind?: 'apartment' | 'building';
  bathroomPrivacy?: 'private' | 'shared';
  bedsAvailable?: number | null;
  differentFields?: string[];
  sharedValues?: Partial<CreateListingDraft>;
  expectedPlaceUpdatedAt?: string;
  step: number;
  spaceType: SpaceType | null;
  propertyType: PropertyType | null;
  priceBasis: PriceBasis | null;
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
  waterBillIncluded: boolean;
  buildingFeesIncluded: boolean;
  /** True only after the host turns the parking amenity on, unless they opt out. */
  parkingIncludedInRent: boolean;
  amenities: string[];
  genderRestriction: GenderRestriction;
  targetAudience: TargetAudience | null;
  smokingPolicy: SmokingPolicy | null;
  petsPolicy: PetsPolicy | null;
  guestsPolicy: GuestsPolicy | null;
  quietHours: boolean;
  photos: DraftPhoto[];
  monthlyRentUsd: string;
  depositPreset: "none" | "1" | "2" | "custom" | null;
  securityDepositUsd: string;
  leaseTerm: LeaseTerm | null;
  availableImmediate: boolean | null;
  availableFrom: string;
  paymentModality: PaymentModality | null;
  title: string;
  description: string;
  highlightTags: string[];
  /** Ordered browse-card badge keys. null = not chosen yet (auto pills). */
  cardBadges: string[] | null;
  listingPosterRole: ListingPosterRole | null;
  contactName: string;
  contactNumbers: ContactNumber[];
  contactPhone: string;
  whatsappSameAsPhone: boolean;
  whatsappNumber: string;
};

export const INITIAL_DRAFT: CreateListingDraft = {
  sharedPhotos: [],
  step: 0,
  spaceType: null,
  propertyType: null,
  priceBasis: null,
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
  waterBillIncluded: false,
  buildingFeesIncluded: false,
  parkingIncludedInRent: false,
  amenities: [],
  genderRestriction: "anyone",
  targetAudience: null,
  smokingPolicy: null,
  petsPolicy: null,
  guestsPolicy: null,
  quietHours: false,
  photos: [],
  monthlyRentUsd: "",
  depositPreset: null,
  securityDepositUsd: "",
  leaseTerm: null,
  availableImmediate: null,
  availableFrom: "",
  paymentModality: null,
  title: "",
  description: "",
  highlightTags: [],
  cardBadges: null,
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
