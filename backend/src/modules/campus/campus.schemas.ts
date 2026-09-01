import { z } from "zod";

export const costPeriodSchema = z.enum(["semester", "year", "degree"]);

export const programCostsQuerySchema = z.object({
  credits: z.coerce.number().int().min(0).max(300).optional(),
  /** Preferred scope for the estimate. */
  period: costPeriodSchema.optional(),
  /** Legacy: 1 = semester, 2 = academic year. Ignored when `period` is set. */
  terms: z.coerce.number().int().min(1).max(2).optional(),
});

export type ProgramCostsQuery = z.infer<typeof programCostsQuerySchema>;
export type CostPeriod = z.infer<typeof costPeriodSchema>;
