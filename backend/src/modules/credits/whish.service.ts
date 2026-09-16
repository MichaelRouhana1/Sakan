import { loadEnv, type Env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { createLiveWhishGateway } from "./whish.live.js";
import { MockWhishGateway } from "./whish.mock.js";
import type { WhishGateway } from "./whish.types.js";

export type WhishResolvedMode = "mock" | "live";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function resolveWhishMode(env: Env = loadEnv()): WhishResolvedMode {
  if (env.WHISH_MODE === "mock") return "mock";
  if (env.WHISH_MODE === "live") return "live";
  if (env.WHISH_CHANNEL && env.WHISH_SECRET) return "live";
  if (env.NODE_ENV === "production") return "live";
  return "mock";
}

export function isWhishMockMode(env: Env = loadEnv()): boolean {
  return resolveWhishMode(env) === "mock";
}

export function publicApiBase(env: Env = loadEnv()): string {
  return stripSlash(env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`);
}

export function frontendPublicBase(env: Env = loadEnv()): string {
  return stripSlash(env.FRONTEND_PUBLIC_URL ?? "http://localhost:8081");
}

export function creditsReturnUrl(
  referenceId: string,
  outcome: "success" | "failure",
  env: Env = loadEnv(),
): string {
  const url = new URL("/hosting/credits", frontendPublicBase(env));
  url.searchParams.set("ref", referenceId);
  url.searchParams.set("whish", outcome);
  return url.toString();
}

export function whishCallbackUrl(
  kind: "success" | "failure",
  env: Env = loadEnv(),
): string {
  return `${publicApiBase(env)}/api/credits/whish/callback/${kind}`;
}

function assertLiveCredentials(env: Env) {
  if (!env.WHISH_CHANNEL || !env.WHISH_SECRET) {
    throw new AppError(
      503,
      "Whish Pay is not configured (WHISH_CHANNEL / WHISH_SECRET)",
      "WHISH_NOT_CONFIGURED",
    );
  }
}

let cached: { mode: WhishResolvedMode; gateway: WhishGateway } | null = null;

export function getWhishGateway(env: Env = loadEnv()): WhishGateway {
  const mode = resolveWhishMode(env);
  if (cached?.mode === mode) return cached.gateway;

  if (mode === "mock") {
    cached = { mode, gateway: new MockWhishGateway(publicApiBase(env)) };
    return cached.gateway;
  }

  assertLiveCredentials(env);
  const websiteUrl = stripSlash(
    env.WHISH_WEBSITE_URL ?? env.PUBLIC_BASE_URL ?? publicApiBase(env),
  );
  cached = {
    mode,
    gateway: createLiveWhishGateway({
      channel: env.WHISH_CHANNEL!,
      secret: env.WHISH_SECRET!,
      websiteUrl,
      baseUrl: env.WHISH_API_BASE_URL,
    }),
  };
  return cached.gateway;
}
