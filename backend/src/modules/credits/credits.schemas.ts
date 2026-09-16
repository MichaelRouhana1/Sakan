import { z } from "zod";

export const createPurchaseSchema = z.object({
  bundleType: z.enum(["starter", "bundle_5", "boost_pack", "custom"]),
  channel: z.enum(["whish", "omt"]).optional().default("whish"),
  /** Required when bundleType is custom */
  postCreditsDelta: z.number().int().nonnegative().optional(),
  boostCreditsDelta: z.number().int().nonnegative().optional(),
  amountUsdCents: z.number().int().positive().optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const mockCompleteSchema = z.object({
  referenceId: z.string().min(1),
  outcome: z.enum(["success", "failed"]),
});

export type MockCompleteInput = z.infer<typeof mockCompleteSchema>;

/** Default bundle catalog — amounts applied in Service. */
export const BUNDLE_CATALOG = {
  starter: {
    postCreditsDelta: 1,
    boostCreditsDelta: 0,
    amountUsdCents: 1000,
  },
  bundle_5: {
    postCreditsDelta: 5,
    boostCreditsDelta: 0,
    amountUsdCents: 1500,
  },
  boost_pack: {
    postCreditsDelta: 0,
    boostCreditsDelta: 3,
    amountUsdCents: 1000,
  },
} as const;
