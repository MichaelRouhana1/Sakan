import { z } from "zod";

export const listingExpiryDecisionSchema = z.object({
  cycleExpiresAt: z.string().datetime({ offset: true }),
  decision: z.enum(["rented", "still_available", "improve", "archive"]),
});

export const listingRenewSchema = z.object({
  cycleExpiresAt: z.string().datetime({ offset: true }),
});

export type ListingExpiryDecisionInput = z.infer<
  typeof listingExpiryDecisionSchema
>;
export type ListingRenewInput = z.infer<typeof listingRenewSchema>;
