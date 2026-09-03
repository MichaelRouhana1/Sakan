import { z } from "zod";

export const benefitCategorySchema = z.enum([
  "tech",
  "food",
  "services",
  "entertainment",
  "finance",
  "telecom",
]);

export const benefitRedemptionTypeSchema = z.enum([
  "link",
  "promo_code",
  "show_id",
]);

/** Sentinel stored in `applicable_universities` for nationwide/global offers. */
export const ALL_UNIVERSITIES = "ALL";

export const listBenefitsQuerySchema = z.object({
  /**
   * Institution short name (AUB, LAU, USJ). Returns that campus's exclusive
   * offers plus everything tagged ALL. Case-insensitive.
   */
  university: z
    .string()
    .trim()
    .min(1, "university must not be empty")
    .max(32, "university must be at most 32 characters")
    .transform((value) => value.toUpperCase())
    .optional(),
  category: benefitCategorySchema.optional(),
  /** Restrict to global/nationwide offers (true) or campus-specific ones (false). */
  isGlobal: z
    .union([z.literal("true"), z.literal("false")])
    .transform((value) => value === "true")
    .optional(),
});

export type ListBenefitsQuery = z.infer<typeof listBenefitsQuerySchema>;
export type BenefitCategory = z.infer<typeof benefitCategorySchema>;
export type BenefitRedemptionType = z.infer<typeof benefitRedemptionTypeSchema>;
