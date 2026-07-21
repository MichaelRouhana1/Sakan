import { z } from "zod";

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

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetGenderInput = z.infer<typeof setGenderSchema>;
