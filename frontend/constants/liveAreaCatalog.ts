/**
 * Session-live Cities area catalog.
 * Seeded from lebanonZones via zoning MOCK_ZONES; Zoning mockStore syncs after each mutation.
 * Browse filter chips read this. Poster create + BE still use seed LEBANON_AREAS.
 */
import type { LebanonAreaGroup } from "./lebanonZones";
import type { AdminGovernorate } from "@/components/admin-neu/zoning/types";
import { MOCK_ZONES } from "@/components/admin-neu/zoning/mockZones";

type Listener = () => void;

type CatalogSnapshot = {
  areas: string[];
  groups: LebanonAreaGroup[];
  version: number;
};

function buildFromTree(
  tree: AdminGovernorate[],
  version: number,
): CatalogSnapshot {
  const groups: LebanonAreaGroup[] = tree
    .map((gov) => ({
      governorate: gov.name,
      areas: gov.districts.flatMap((district) =>
        district.neighborhoods
          .filter((area) => area.active)
          .map((area) => area.name),
      ),
    }))
    .filter((group) => group.areas.length > 0);

  return {
    areas: groups.flatMap((group) => group.areas),
    groups,
    version,
  };
}

let snapshot: CatalogSnapshot = buildFromTree(MOCK_ZONES, 1);
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Call after zoning mockStore mutates the tree. */
export function syncLiveAreaCatalog(tree: AdminGovernorate[]): void {
  snapshot = buildFromTree(tree, snapshot.version + 1);
  notify();
}

export function getLiveLebanonAreas(): string[] {
  return snapshot.areas;
}

export function getLiveLebanonAreaGroups(query = ""): LebanonAreaGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return snapshot.groups;
  return snapshot.groups
    .map((group) => ({
      governorate: group.governorate,
      areas: group.areas.filter((name) => name.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.areas.length > 0);
}

export function subscribeLiveAreaCatalog(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLiveCatalogSnapshot(): CatalogSnapshot {
  return snapshot;
}

export function resetLiveAreaCatalog(): void {
  snapshot = buildFromTree(MOCK_ZONES, 1);
  notify();
}
