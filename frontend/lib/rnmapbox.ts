import type RNMapbox from "@rnmapbox/maps";

export type { Camera, MapState } from "@rnmapbox/maps";

/** Expo Go has no @rnmapbox/maps native binary. Import throws and kills the route. */
export const MAP_NATIVE_MISSING_COPY =
  "Map needs a development build. Expo Go does not include Mapbox native code.";

let native: typeof RNMapbox | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@rnmapbox/maps") as { default?: typeof RNMapbox } & typeof RNMapbox;
  native = (mod.default ?? mod) as typeof RNMapbox;
} catch {
  native = null;
}

export function hasMapboxNative(): boolean {
  return native != null;
}

export default native as typeof RNMapbox;
