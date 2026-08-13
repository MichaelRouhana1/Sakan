import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "../../lib/password.js";

export const registerUserSchema = z.object({
  phone: z.string().min(8).max(32),
  role: z.enum(["renter", "poster"]),
});

export const updateRoleSchema = z.object({
  role: z.enum(["renter", "poster"]),
});

export const setGenderSchema = z.object({
  gender: z.enum(["male", "female"]),
});

export const verifyPhoneSchema = z.object({}).optional();

const emailField = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .email("Enter a valid email address");

export const requestRegistrationCodeSchema = z.object({
  email: emailField,
});

export const verifyRegistrationCodeSchema = z.object({
  email: emailField,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

const nameField = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(80, "Name is too long")
  .refine((v) => v.replace(/\s+/g, " ").length >= 1, "This field is required");

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export const completeRegistrationSchema = z
  .object({
    completionToken: z.string().min(20).max(200),
    firstName: nameField,
    lastName: nameField,
    dateOfBirth: z
      .string()
      .refine(isValidCalendarDate, "Enter a valid date of birth")
      .refine((value) => {
        const today = new Date();
        const todayKey = [
          today.getUTCFullYear(),
          String(today.getUTCMonth() + 1).padStart(2, "0"),
          String(today.getUTCDate()).padStart(2, "0"),
        ].join("-");
        return value <= todayKey;
      }, "Date of birth cannot be in the future"),
    password: z.string().min(MIN_PASSWORD_LENGTH).max(128),
    confirmPassword: z.string().min(1).max(128),
    role: z.enum(["renter", "poster"]).default("renter"),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export const loginWithPasswordSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(128),
});

export const syncClerkUserSchema = z.object({
  clerkId: z.string().min(1).max(255),
  email: z.string().trim().email().optional().nullable(),
  firstName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().optional().nullable(),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetGenderInput = z.infer<typeof setGenderSchema>;
export type RequestRegistrationCodeInput = z.infer<
  typeof requestRegistrationCodeSchema
>;
export type VerifyRegistrationCodeInput = z.infer<
  typeof verifyRegistrationCodeSchema
>;
export type CompleteRegistrationInput = z.infer<
  typeof completeRegistrationSchema
>;
export type LoginWithPasswordInput = z.infer<typeof loginWithPasswordSchema>;
export type SyncClerkUserInput = z.infer<typeof syncClerkUserSchema>;

