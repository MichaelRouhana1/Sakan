import { createContext, useContext } from "react";

export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";

export const isClerkEnabled = CLERK_PUBLISHABLE_KEY.startsWith("pk_");

const ClerkEnabledContext = createContext(isClerkEnabled);

export const ClerkEnabledProvider = ClerkEnabledContext.Provider;

export function useClerkEnabled(): boolean {
  return useContext(ClerkEnabledContext);
}
