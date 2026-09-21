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

export const pushTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(20)
    .max(512)
    .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, "Invalid Expo push token"),
  platform: z.enum(["ios", "android"]),
});

export const removePushTokenSchema = z.union([
  z.object({ token: z.string().trim().min(20).max(512) }),
  z.object({ all: z.literal(true) }),
]);

export const notificationPreferencesSchema = z
  .object({
    expiryPushEnabled: z.boolean().optional(),
    expiryEmailEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No preferences supplied");

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetGenderInput = z.infer<typeof setGenderSchema>;
export type SetCampusInput = z.infer<typeof setCampusSchema>;
export type PushTokenInput = z.infer<typeof pushTokenSchema>;
export type RemovePushTokenInput = z.infer<typeof removePushTokenSchema>;
export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;
