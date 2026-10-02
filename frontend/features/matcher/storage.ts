import AsyncStorage from "@react-native-async-storage/async-storage";
import { parsePreferences } from "./preferences";
import type { MatcherPreferences } from "./types";

const KEY = "skoun.findMyPlace.v1";
let writes = Promise.resolve();
export async function readMatcherPreferences() {
  try {
    await writes;
    const raw = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}");
    return {
      draft: parsePreferences(raw.draft),
      applied: parsePreferences(raw.applied),
      draftContext: raw.draftContext as string | undefined,
    };
  } catch {
    return { draft: null, applied: null, draftContext: undefined };
  }
}
export function saveMatcherPreferences(
  prefs: MatcherPreferences,
  kind: "draft" | "applied",
  draftContext?: string,
) {
  // Serialize updates so a slow draft write cannot overwrite a later apply.
  writes = writes
    .then(async () => {
      let raw: Record<string, unknown> = {};
      try {
        raw = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}") ?? {};
      } catch {
        /* reset corrupt storage */
      }
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify({
          ...raw,
          [kind]: prefs,
          ...(kind === "applied"
            ? { draft: prefs, draftContext: undefined }
            : { draftContext }),
        }),
      );
    })
    .catch(() => {
      /* Storage is optional; the flow remains usable. */
    });
  return writes;
}
