import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserRole } from "@/types/user";

const KEYS = {
  userId: "skoun.userId",
  role: "skoun.role",
} as const;

export type Session = {
  userId: string;
  role: UserRole;
};

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
