import type {
  FurnishingType,
  GuestsPolicy,
  LeaseTerm,
  Listing,
  ListingPosterRole,
  PaymentModality,
  PetsPolicy,
  PriceBasis,
  PropertyType,
  SmokingPolicy,
  SpaceType,
} from "@/types/listing";

export type CreateListingBody = {
  bathroomPrivacy?: 'private'|'shared';
  differentFields?: string[];
  expectedPlaceUpdatedAt?: string;
  spaceType: SpaceType;
  propertyType: PropertyType;
  priceBasis: PriceBasis;
  listingType?: Listing["listingType"];
  targetAudience: Listing["targetAudience"];
  genderRestriction: Listing["genderRestriction"];
  monthlyRentUsd: number;
  securityDepositUsd: number;
  leaseTerm: LeaseTerm;
  availableFrom?: string | null;
  paymentModality: PaymentModality;
  electricity: Listing["electricity"];
  electricityCutsStart?: string | null;
  electricityCutsEnd?: string | null;
  electricityHoursOn?: number | null;
  electricityCutWindows?: { start: string; end: string }[];
  water: Listing["water"];
  wifiIncluded: boolean;
  routerUps: boolean;
  elevator24_7: boolean;
  hasElevator: boolean;
  hasSolar: boolean;
  generatorAmperes?: number | null;
  generatorIncluded: boolean;
  conciergeIncluded: boolean;
  cookingGasIncluded: boolean;
  waterBillIncluded: boolean;
  buildingFeesIncluded: boolean;
  parkingIncludedInRent: boolean;
  amenities: string[];
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxOccupancy: number;
  furnishingType: FurnishingType;
  floorNumber: number;
  areaSqm?: number | null;
  smokingPolicy: SmokingPolicy;
  petsPolicy: PetsPolicy;
  guestsPolicy: GuestsPolicy;
  quietHours: boolean;
  title: string;
  description: string;
  highlightTags: string[];
  cardBadges?: string[] | null;
  listingPosterRole: ListingPosterRole;
  contactName: string;
  contactPhone?: string;
  whatsappNumber?: string;
  contactNumbers?: {
    kind: "mobile" | "landline";
    prefix: string;
    subscriber: string;
    e164: string;
    calls: boolean;
    whatsapp: boolean;
  }[];
  area: string;
  landmark?: string;
  addressLine?: string;
  buildingName?: string;
  primaryCampusId?: string | null;
  locationWkt: string;
  photoUrls: string[];
  photoCaptions?: string[];
  publishNow?: boolean;
};
