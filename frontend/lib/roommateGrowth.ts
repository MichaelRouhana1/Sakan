import AsyncStorage from "@react-native-async-storage/async-storage";
import { ROOMMATE_LAUNCH_AREA_SET } from "@/constants/roommateLaunch";

const BROWSE_KEY = "skoun.roommate.browseAreas";
const PROMPT_DISMISS_KEY = "skoun.roommate.promptDismissed";

/** Record a listing area when the renter views it (for Looking card suggestions). */
export async function recordBrowsedArea(area: string): Promise<void> {
  if (!ROOMMATE_LAUNCH_AREA_SET.has(area)) return;
  try {
    const raw = await AsyncStorage.getItem(BROWSE_KEY);
    const prev: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [area, ...prev.filter((a) => a !== area)].slice(0, 12);
    await AsyncStorage.setItem(BROWSE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

export async function getSuggestedAreas(
  savedAreas: string[] = [],
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BROWSE_KEY);
    const browsed: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    const merged = [
      ...savedAreas.filter((a) => ROOMMATE_LAUNCH_AREA_SET.has(a)),
      ...browsed,
    ];
    return [...new Set(merged)].slice(0, 6);
  } catch {
    return savedAreas.filter((a) => ROOMMATE_LAUNCH_AREA_SET.has(a)).slice(0, 6);
  }
}

export async function wasLookingPromptDismissed(
  listingId: string,
): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PROMPT_DISMISS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    return Boolean(map[listingId]);
  } catch {
    return false;
  }
}

export async function dismissLookingPrompt(listingId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PROMPT_DISMISS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[listingId] = true;
    await AsyncStorage.setItem(PROMPT_DISMISS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
