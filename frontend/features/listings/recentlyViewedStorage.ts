import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  parseRecentlyViewed,
  recentlyViewedStorageKey,
  type RecentlyViewedEntry,
} from "./recentlyViewed";

const memoryByScope = new Map<string, RecentlyViewedEntry[]>();

export async function readRecentlyViewed(scope: string): Promise<RecentlyViewedEntry[]> {
  const key = recentlyViewedStorageKey(scope);
  try {
    const raw =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.localStorage.getItem(key)
        : await AsyncStorage.getItem(key);
    const parsed = parseRecentlyViewed(raw);
    memoryByScope.set(scope, parsed);
    return parsed;
  } catch {
    return memoryByScope.get(scope) ?? [];
  }
}

export async function writeRecentlyViewed(
  scope: string,
  entries: RecentlyViewedEntry[],
): Promise<boolean> {
  const key = recentlyViewedStorageKey(scope);
  memoryByScope.set(scope, entries);
  const raw = JSON.stringify({ version: 1, items: entries });
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(key, raw);
    } else {
      await AsyncStorage.setItem(key, raw);
    }
    return true;
  } catch {
    return false;
  }
}
