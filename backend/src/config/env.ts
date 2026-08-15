import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_API_KEY: z.string().optional(),
  /**
   * Public origin used in uploaded photo URLs (must be reachable from phones).
   * Example: http://192.168.10.249:3001
   */
  PUBLIC_BASE_URL: z.string().url().optional(),
  /** Absolute or relative directory for listing photo files. */
  UPLOAD_DIR: z.string().default("uploads"),
  /** Clerk secret key for verifying session JWTs on protected routes. */
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${message}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && !env.CLERK_SECRET_KEY) {
    throw new Error(
      "Invalid environment: CLERK_SECRET_KEY is required in production",
    );
  }
  return env;
}
