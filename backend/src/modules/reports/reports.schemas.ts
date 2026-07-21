import { z } from "zod";

export const reportReasonSchema = z.enum([
  "fake",
  "inaccurate_utilities",
  "already_rented",
]);

export const createReportSchema = z.object({
  listingId: z.string().uuid(),
  reason: reportReasonSchema,
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
