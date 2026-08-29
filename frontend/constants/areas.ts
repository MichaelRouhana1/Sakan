import { useSyncExternalStore } from "react";
import { flattenLebanonAreas } from "./lebanonZones";
import {
  getLiveCatalogSnapshot,
  getLiveLebanonAreaGroups,
  getLiveLebanonAreas,
  subscribeLiveAreaCatalog,
} from "./liveAreaCatalog";

/** Soft cap on Cities filter chips — not catalog length. Keep in sync with backend. */
export const MAX_LISTING_AREAS = 15;
/** Hub: one campus at a time for distance sort. */
export const MAX_UNIVERSITY_SLUGS = 1;

/**
 * Seed flatten for poster create + BE allowlist sync.
 * Cities filter chips use useLiveLebanonAreas() (session catalog).
 */
export const LEBANON_AREAS = flattenLebanonAreas() as unknown as readonly [
  string,
  ...string[],
];

export type LebanonArea = (typeof LEBANON_AREAS)[number];

export function useLiveLebanonAreas(): string[] {
  return useSyncExternalStore(
    subscribeLiveAreaCatalog,
    () => getLiveCatalogSnapshot().areas,
    () => getLiveCatalogSnapshot().areas,
  );
}

export function useLiveLebanonAreaGroups(query = ""): ReturnType<
  typeof getLiveLebanonAreaGroups
> {
  const version = useSyncExternalStore(
    subscribeLiveAreaCatalog,
    () => getLiveCatalogSnapshot().version,
    () => getLiveCatalogSnapshot().version,
  );
  void version;
  return getLiveLebanonAreaGroups(query);
}

export { getLiveLebanonAreas, getLiveLebanonAreaGroups };
