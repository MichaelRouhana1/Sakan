import { MOCK_LISTINGS } from "../listings/mockListings";
import { syncLiveAreaCatalog, resetLiveAreaCatalog } from "@/constants/liveAreaCatalog";
import { MOCK_ZONES } from "./mockZones";
import {
  findDistrict,
  findNeighborhood,
  flattenNeighborhoods,
  newId,
  slugify,
  type AdminGovernorate,
  type AdminNeighborhood,
  type AreaDraft,
  type RenameTarget,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function listingCountsByArea(): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of MOCK_LISTINGS) {
    map.set(row.area, (map.get(row.area) ?? 0) + 1);
  }
  return map;
}

function withListingCounts(next: AdminGovernorate[]): AdminGovernorate[] {
  const counts = listingCountsByArea();
  return next.map((gov) => ({
    ...gov,
    districts: gov.districts.map((district) => ({
      ...district,
      neighborhoods: district.neighborhoods.map((area) => ({
        ...area,
        listingCount: counts.get(area.name) ?? 0,
      })),
    })),
  }));
}

let tree = withListingCounts(clone(MOCK_ZONES));
syncLiveAreaCatalog(tree);

function commit(next: AdminGovernorate[]): void {
  tree = withListingCounts(next);
  syncLiveAreaCatalog(tree);
}

export function resetZoningMockStore(): void {
  tree = withListingCounts(clone(MOCK_ZONES));
  resetLiveAreaCatalog();
  syncLiveAreaCatalog(tree);
}

export function listTreeFromStore(): AdminGovernorate[] {
  return clone(tree);
}

function assertAreaSlugFree(slug: string, exceptId?: string): void {
  const hit = flattenNeighborhoods(tree).find(
    (area) => area.slug === slug && area.id !== exceptId,
  );
  if (hit) throw new Error(`Area slug already taken: ${slug}`);
}

export function createCustomAreaInStore(draft: AreaDraft): AdminNeighborhood {
  const dest = findDistrict(tree, draft.districtId);
  if (!dest) throw new Error(`District not found: ${draft.districtId}`);
  const name = draft.name.trim();
  if (name.length < 2) throw new Error("Area name must be at least 2 characters");
  const slug = draft.slug.trim() || slugify(name);
  if (slug.length < 2) throw new Error("Slug must be at least 2 characters");
  assertAreaSlugFree(slug);
  const next: AdminNeighborhood = {
    id: newId("n-custom"),
    districtId: draft.districtId,
    name,
    slug,
    origin: "custom",
    listingCount: 0,
    active: true,
  };
  commit(
    tree.map((gov) => ({
      ...gov,
      districts: gov.districts.map((district) =>
        district.id === draft.districtId
          ? { ...district, neighborhoods: [...district.neighborhoods, next] }
          : district,
      ),
    })),
  );
  const created = findNeighborhood(tree, next.id);
  if (!created) throw new Error("Failed to create area");
  return clone(created.area);
}

export function renameInStore(
  target: RenameTarget,
  name: string,
  slug: string,
): AdminGovernorate[] {
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Name must be at least 2 characters");
  const nextSlug = slug.trim() || slugify(trimmed);
  if (target.kind === "neighborhood") {
    assertAreaSlugFree(nextSlug, target.id);
  }
  const { kind, id } = target;
  commit(
    tree.map((gov) => {
      if (kind === "governorate" && gov.id === id) {
        return { ...gov, name: trimmed, slug: nextSlug };
      }
      return {
        ...gov,
        districts: gov.districts.map((district) => {
          if (kind === "district" && district.id === id) {
            return { ...district, name: trimmed, slug: nextSlug };
          }
          return {
            ...district,
            neighborhoods: district.neighborhoods.map((area) =>
              kind === "neighborhood" && area.id === id
                ? { ...area, name: trimmed, slug: nextSlug }
                : area,
            ),
          };
        }),
      };
    }),
  );
  return listTreeFromStore();
}

export function reparentInStore(
  areaId: string,
  districtId: string,
): AdminNeighborhood {
  const found = findNeighborhood(tree, areaId);
  if (!found) throw new Error(`Area not found: ${areaId}`);
  const dest = findDistrict(tree, districtId);
  if (!dest) throw new Error(`District not found: ${districtId}`);
  if (found.district.id === districtId) {
    throw new Error("Already in this district");
  }

  commit(
    tree.map((gov) => ({
      ...gov,
      districts: gov.districts.map((district) => {
        if (district.id === found.district.id) {
          return {
            ...district,
            neighborhoods: district.neighborhoods.filter((row) => row.id !== areaId),
          };
        }
        if (district.id === districtId) {
          return {
            ...district,
            neighborhoods: [
              ...district.neighborhoods,
              { ...found.area, districtId },
            ],
          };
        }
        return district;
      }),
    })),
  );
  const moved = findNeighborhood(tree, areaId);
  if (!moved) throw new Error(`Area not found: ${areaId}`);
  return clone(moved.area);
}

export function mergeAreasInStore(
  sourceId: string,
  targetId: string,
): AdminNeighborhood {
  const source = findNeighborhood(tree, sourceId);
  const target = findNeighborhood(tree, targetId);
  if (!source) throw new Error(`Area not found: ${sourceId}`);
  if (!target) throw new Error(`Area not found: ${targetId}`);
  if (sourceId === targetId) throw new Error("Cannot merge an area into itself");

  commit(
    tree.map((gov) => ({
      ...gov,
      districts: gov.districts.map((district) => ({
        ...district,
        neighborhoods: district.neighborhoods
          .filter((row) => row.id !== sourceId)
          .map((row) =>
            row.id === targetId
              ? {
                  ...row,
                  listingCount: row.listingCount + source.area.listingCount,
                }
              : row,
          ),
      })),
    })),
  );
  const next = findNeighborhood(tree, targetId);
  if (!next) throw new Error(`Area not found: ${targetId}`);
  return clone(next.area);
}

/** Soft-hide custom area from Cities session catalog. */
export function deactivateAreaInStore(areaId: string): AdminNeighborhood {
  const found = findNeighborhood(tree, areaId);
  if (!found) throw new Error(`Area not found: ${areaId}`);
  if (found.area.origin !== "custom") {
    throw new Error("Only custom areas can be deactivated");
  }
  if (!found.area.active) throw new Error("Area already inactive");

  commit(
    tree.map((gov) => ({
      ...gov,
      districts: gov.districts.map((district) => ({
        ...district,
        neighborhoods: district.neighborhoods.map((area) =>
          area.id === areaId ? { ...area, active: false } : area,
        ),
      })),
    })),
  );
  const next = findNeighborhood(tree, areaId);
  if (!next) throw new Error(`Area not found: ${areaId}`);
  return clone(next.area);
}

export function activateAreaInStore(areaId: string): AdminNeighborhood {
  const found = findNeighborhood(tree, areaId);
  if (!found) throw new Error(`Area not found: ${areaId}`);
  if (found.area.origin !== "custom") {
    throw new Error("Only custom areas can be reactivated");
  }
  if (found.area.active) throw new Error("Area already active");

  commit(
    tree.map((gov) => ({
      ...gov,
      districts: gov.districts.map((district) => ({
        ...district,
        neighborhoods: district.neighborhoods.map((area) =>
          area.id === areaId ? { ...area, active: true } : area,
        ),
      })),
    })),
  );
  const next = findNeighborhood(tree, areaId);
  if (!next) throw new Error(`Area not found: ${areaId}`);
  return clone(next.area);
}
