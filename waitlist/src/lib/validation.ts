import { z } from "zod";
import {
  HOUSING_TIMINGS,
  UNIT_COUNTS,
  UNIVERSITIES,
  type WaitlistRole,
} from "./constants";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email")
  .max(254)
  .transform((v) => v.toLowerCase());

const nameSchema = z
  .string()
  .trim()
  .min(2, "Full name is required")
  .max(120, "Name is too long");

const whatsappSchema = z
  .string()
  .trim()
  .max(30)
  .refine(
    (v) => v === "" || /^\+?[0-9\s()-]{8,20}$/.test(v),
    "Enter a valid WhatsApp number",
  );

/** Honeypot: accept any value; API pretends success when filled. */
const honeypotSchema = z.string().optional();

const baseFields = {
  fullName: nameSchema,
  email: emailSchema,
  website: honeypotSchema, // honeypot
  referralCode: z.string().trim().max(32).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(120).optional(),
};

export const studentSignupSchema = z.object({
  ...baseFields,
  role: z.literal("student"),
  whatsapp: whatsappSchema.optional().default(""),
  university: z.enum(UNIVERSITIES, {
    message: "Select your university",
  }),
  housingTiming: z.enum(HOUSING_TIMINGS, {
    message: "Select when you need housing",
  }),
  betaTester: z.boolean().default(false),
});

export const landlordSignupSchema = z.object({
  ...baseFields,
  role: z.literal("landlord"),
  whatsapp: whatsappSchema.refine((v) => v.length >= 8, {
    message: "WhatsApp number is required",
  }),
  areaCity: z
    .string()
    .trim()
    .min(2, "Area / city is required")
    .max(120),
  unitCount: z.enum(UNIT_COUNTS, {
    message: "Select number of units",
  }),
  university: z.union([z.enum(UNIVERSITIES), z.literal("")]).optional(),
  betaTester: z.boolean().default(false),
});

export const signupSchema = z.discriminatedUnion("role", [
  studentSignupSchema,
  landlordSignupSchema,
]);

export type StudentSignupInput = z.infer<typeof studentSignupSchema>;
export type LandlordSignupInput = z.infer<typeof landlordSignupSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export function normalizeWhatsApp(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("961")) return `+${digits}`;
  if (digits.startsWith("0")) return `+961${digits.slice(1)}`;
  return `+961${digits}`;
}

export function roleFromPath(pathname: string): WaitlistRole {
  return pathname.startsWith("/landlords") ? "landlord" : "student";
}
