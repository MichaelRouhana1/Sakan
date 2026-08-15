import { createClerkClient } from "@clerk/backend";
import { loadEnv } from "../config/env.js";

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

export function getClerkSecretKey(): string {
  const key = loadEnv().CLERK_SECRET_KEY;
  if (!key) {
    throw new Error("CLERK_SECRET_KEY is not configured");
  }
  return key;
}

export function getClerkClient() {
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey: getClerkSecretKey() });
  }
  return clerkClient;
}
