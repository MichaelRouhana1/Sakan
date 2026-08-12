import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserRole } from "@/types/user";

const KEYS = {
  userId: "skoun.userId",
  role: "skoun.role",
  lastAuthProvider: "skoun.lastAuthProvider",
  pendingAuthProvider: "skoun.pendingAuthProvider",
} as const;

export type Session = {
  userId: string;
  role: UserRole;
};

export type AuthProvider = "google" | "apple" | "facebook" | "email";

const AUTH_PROVIDERS: AuthProvider[] = ["google", "apple", "facebook", "email"];

function isAuthProvider(value: string | null): value is AuthProvider {
  return value != null && (AUTH_PROVIDERS as string[]).includes(value);
}

export async function getSession(): Promise<Session | null> {
  const [userId, role] = await Promise.all([
    AsyncStorage.getItem(KEYS.userId),
    AsyncStorage.getItem(KEYS.role),
  ]);
  if (!userId || (role !== "renter" && role !== "poster")) {
    return null;
  }
  return { userId, role };
}

export async function setSession(session: Session): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEYS.userId, session.userId),
    AsyncStorage.setItem(KEYS.role, session.role),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.userId),
    AsyncStorage.removeItem(KEYS.role),
  ]);
}

/** Last auth method that succeeded on this device (not shared via git / Clerk). */
export async function getLastAuthProvider(): Promise<AuthProvider | null> {
  const value = await AsyncStorage.getItem(KEYS.lastAuthProvider);
  return isAuthProvider(value) ? value : null;
}

export async function setLastAuthProvider(provider: AuthProvider): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastAuthProvider, provider);
}

/** Set before OAuth redirect; promoted to last-used only after a real signed-in user appears. */
export async function setPendingAuthProvider(provider: AuthProvider): Promise<void> {
  await AsyncStorage.setItem(KEYS.pendingAuthProvider, provider);
}

export async function consumePendingAuthProvider(): Promise<AuthProvider | null> {
  const value = await AsyncStorage.getItem(KEYS.pendingAuthProvider);
  await AsyncStorage.removeItem(KEYS.pendingAuthProvider);
  return isAuthProvider(value) ? value : null;
}
