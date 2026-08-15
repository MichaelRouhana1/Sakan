import { z } from "zod";

export const updateRoleSchema = z.object({
  role: z.enum(["renter", "poster"]),
});

export const setGenderSchema = z.object({
  gender: z.enum(["male", "female"]),
});

export const setCampusSchema = z.object({
  campusId: z.string().uuid("Select your campus"),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetGenderInput = z.infer<typeof setGenderSchema>;
export type SetCampusInput = z.infer<typeof setCampusSchema>;
