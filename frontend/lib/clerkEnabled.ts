import { createContext, useContext } from "react";

export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";

export const isClerkEnabled = CLERK_PUBLISHABLE_KEY.startsWith("pk_");

export const CLERK_SETUP_MESSAGE =
  "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in frontend/.env to enable sign-in.";

const ClerkEnabledContext = createContext(isClerkEnabled);

export const ClerkEnabledProvider = ClerkEnabledContext.Provider;

export function useClerkEnabled(): boolean {
  return useContext(ClerkEnabledContext);
}
