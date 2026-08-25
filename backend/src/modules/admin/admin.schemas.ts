import { z } from "zod";

export const creditTxStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const listTransactionsQuerySchema = z.object({
  status: creditTxStatusSchema.optional(),
  referenceId: z.string().trim().min(1).max(64).optional(),
  history: z.enum(["true", "1", "false", "0"]).optional(),
});

export const reviewTransactionBodySchema = z.object({
  adminNote: z.string().trim().max(2000).optional(),
});

export const reportStatusQuerySchema = z.enum([
  "open",
  "dismissed",
  "actioned",
]);

export const listingStatusQuerySchema = z.enum([
  "draft",
  "active",
  "archived",
  "removed",
]);

export const adminNoteBodySchema = z.object({
  adminNote: z.string().trim().max(2000).optional(),
});

export const userStatusBodySchema = z.object({
  status: z.enum(["active", "restricted", "banned"]),
  adminNote: z.string().trim().max(2000).optional(),
});

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "slug must be lowercase letters, numbers, and single hyphens",
  );

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .url("must be a valid URL")
  .nullish();

export const institutionCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().min(1).max(40),
  slug: slugSchema,
  website: optionalUrl,
  logoUrl: optionalUrl,
  active: z.boolean().optional(),
});

export const institutionUpdateSchema = institutionCreateSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

const lngSchema = z.number().min(-180).max(180);
const latSchema = z.number().min(-90).max(90);

export const campusCreateSchema = z.object({
  institutionId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  slug: slugSchema,
  city: z.string().trim().max(120).nullish(),
  lng: lngSchema,
  lat: latSchema,
  isMain: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const campusUpdateSchema = campusCreateSchema
  .omit({ institutionId: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update")
  .refine(
    (v) => (v.lng == null) === (v.lat == null),
    "lng and lat must be sent together",
  );

export const auditQuerySchema = z.object({
  action: z.string().trim().min(1).max(64).optional(),
  entityType: z.string().trim().min(1).max(32).optional(),
  entityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type ListTransactionsQueryInput = z.infer<
  typeof listTransactionsQuerySchema
>;
export type InstitutionCreateInput = z.infer<typeof institutionCreateSchema>;
export type InstitutionUpdateInput = z.infer<typeof institutionUpdateSchema>;
export type CampusCreateInput = z.infer<typeof campusCreateSchema>;
export type CampusUpdateInput = z.infer<typeof campusUpdateSchema>;
