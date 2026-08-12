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
  /**
   * Secret used to HMAC verification codes / completion tokens.
   * Required in production; development falls back to a local default.
   */
  REGISTRATION_SECRET: z.string().min(16).optional(),
  /** Resend API key — preferred email transport when set. */
  RESEND_API_KEY: z.string().optional(),
  /** From address for transactional email, e.g. Skoun <onboarding@resend.dev> */
  EMAIL_FROM: z.string().optional(),
  /**
   * Email transport:
   * - auto: Resend if key set, else SMTP if configured, else outbox in development
   * - resend | smtp | outbox
   */
  EMAIL_TRANSPORT: z
    .enum(["auto", "resend", "smtp", "outbox"])
    .default("auto"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
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
  if (env.NODE_ENV === "production" && !env.REGISTRATION_SECRET) {
    throw new Error(
      "Invalid environment: REGISTRATION_SECRET is required in production",
    );
  }
  return env;
}

export function getRegistrationSecret(env: Env = loadEnv()): string {
  if (env.REGISTRATION_SECRET) return env.REGISTRATION_SECRET;
  return "skoun-dev-registration-secret";
}
