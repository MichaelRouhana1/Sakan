import { z } from "zod";

export const creditReturnToSchema = z
  .string()
  .regex(
    /^\/hosting\/listing\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(outcome|promote)$/i,
    "Invalid return path",
  );

export const createPurchaseSchema = z.object({
  packId: z.string().regex(/^[a-z0-9_]+$/).max(80).optional(),
  catalogVersion: z.string().min(1).max(80).optional(),
  // Older post clients may keep their identifiers; amounts are still server-owned.
  bundleType: z.enum(["starter", "bundle_5"]).optional(),
  channel: z.literal("whish").optional().default("whish"),
  returnTo: creditReturnToSchema.optional(),
}).strict().refine((input) => Boolean(input.packId) !== Boolean(input.bundleType), "Choose one catalog pack")
  .refine((input) => !input.packId || Boolean(input.catalogVersion), "Catalog version is required");

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const mockCompleteSchema = z.object({
  referenceId: z.string().min(1),
  outcome: z.enum(["success", "failed"]),
  returnTo: creditReturnToSchema.optional(),
});

export type MockCompleteInput = z.infer<typeof mockCompleteSchema>;
