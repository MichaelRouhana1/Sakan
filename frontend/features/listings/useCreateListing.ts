import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Listing } from "@/types/listing";
import { listingKeys } from "./keys";
import { normalizeListing } from "./normalizeListing";

export type CreateListingBody = {
  listingType: Listing["listingType"];
  targetAudience: Listing["targetAudience"];
  genderRestriction: Listing["genderRestriction"];
  monthlyRentUsd: number;
  electricity: Listing["electricity"];
  water: Listing["water"];
  wifiIncluded: boolean;
  routerUps: boolean;
  elevator24_7: boolean;
  area: string;
  landmark?: string;
  locationWkt: string;
  photoUrls: string[];
  publishNow?: boolean;
  lookingForRoommate?: boolean;
};

type CreateResponse = { data: Record<string, unknown> };

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateListingBody) => {
      if (body.photoUrls.length < 1) {
        throw new Error("At least one photo is required");
      }
      if (body.photoUrls.length > 8) {
        throw new Error("Maximum 8 photos allowed");
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
    },
  });
}
