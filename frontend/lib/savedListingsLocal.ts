import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "skoun.savedListings";
const MIGRATED_KEY = "skoun.savedListings.migrated";

/** Read legacy device-only saved listing IDs (full Listing JSON blobs). */
export async function getLocalSavedListingIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const id = (row as { id?: unknown }).id;
        return typeof id === "string" && id.length > 0 ? id : null;
      })
      .filter((id): id is string => id != null);
  } catch {
    return [];
  }
}

export async function clearLocalSavedListings(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function hasMigratedLocalSaved(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(MIGRATED_KEY);
  return flag === "1";
}

export async function markLocalSavedMigrated(): Promise<void> {
  await AsyncStorage.setItem(MIGRATED_KEY, "1");
  await clearLocalSavedListings();
}
