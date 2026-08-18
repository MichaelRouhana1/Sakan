import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
import { listingKeys } from "./keys";
import { normalizeListing } from "./normalizeListing";

export type CreateListingBody = {
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
  listingPosterRole: ListingPosterRole;
  contactName: string;
  contactPhone?: string;
  whatsappNumber?: string;
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

type CreateResponse = { data: Record<string, unknown> };

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateListingBody) => {
      if (body.photoUrls.length < 3) {
        throw new Error("At least 3 photos are required");
      }
      if (body.photoUrls.length > 15) {
        throw new Error("Maximum 15 photos allowed");
      }
      const { data } = await api.post<CreateResponse>("/api/listings", {
        ...body,
        publishNow: body.publishNow ?? true,
      });
      return normalizeListing(data.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["listings", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["credits", "me"] });
    },
  });
}
