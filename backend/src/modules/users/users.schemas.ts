import { z } from "zod";

export const registerUserSchema = z.object({
  phone: z.string().min(8).max(32),
  role: z.enum(["renter", "poster"]),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
