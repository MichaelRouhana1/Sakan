import { z } from "zod";

const emptyToUndef = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(emptyToUndef, z.string().url().optional());
const optionalSecret = z.preprocess(emptyToUndef, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_API_KEY: z.string().optional(),
  /** Comma-separated Clerk user ids allowed to use /api/admin from the web UI. */
  ADMIN_CLERK_IDS: z.string().optional(),
  /**
   * When true, /api/admin requires staff Clerk id or x-admin-key.
   * Unset: off in development, on in production. Set false to keep the desk open.
   */
  ADMIN_AUTH_REQUIRED: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => {
      if (v == null) return undefined;
      return v === "true" || v === "1";
    }),
  /**
   * Public origin used in uploaded photo URLs (must be reachable from phones).
   * Example: http://192.168.10.249:3001
   */
  PUBLIC_BASE_URL: optionalUrl,
  /**
   * Web app origin for Whish success/failure redirects.
   * Example: http://localhost:8081
   */
  FRONTEND_PUBLIC_URL: optionalUrl,
  WHISH_CHANNEL: optionalSecret,
  WHISH_SECRET: optionalSecret,
  /** Merchant website URL registered with Whish. Defaults to PUBLIC_BASE_URL. */
  WHISH_WEBSITE_URL: optionalUrl,
  /** Override sandbox/production API host. */
  WHISH_API_BASE_URL: optionalUrl,
  /**
   * auto: live when channel+secret are set, else mock (never mock in production).
   * mock / live: force that gateway.
   */
  WHISH_MODE: z.preprocess(
    emptyToUndef,
    z.enum(["auto", "mock", "live"]).optional().default("auto"),
  ),
  /**
   * Server Mapbox token for Directions (sk. or URL-restricted pk.).
   * Map tiles still use the public EXPO_PUBLIC_MAPBOX_* token on the client.
   */
  MAPBOX_ACCESS_TOKEN: optionalSecret,
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
  if (env.NODE_ENV === "production" && !isUsableClerkSecret(env.CLERK_SECRET_KEY)) {
    throw new Error(
      "Invalid environment: CLERK_SECRET_KEY is required in production",
    );
  }
  return env;
}

export function isUsableClerkSecret(key: string | undefined): key is string {
  if (!key) return false;
  if (key.includes("xxxxxxxx")) return false;
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
}
