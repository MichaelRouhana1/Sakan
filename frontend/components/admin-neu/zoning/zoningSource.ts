/**
 * API-shaped zoning source.
 * Today: in-memory mock store + 150ms delay.
 *
 * Mapping to current backend (honest):
 * - No /api/admin/zones.
 * - Session: mutations sync liveAreaCatalog so Cities filter chips update.
 * - Poster create + BE still allowlist seed lebanonAreas.ts (customs demo-only in chips).
 * - Rename/move/merge do not rewrite listing.area DB rows.
 *
 * Later, keep these signatures and swap bodies to:
 * - GET /api/admin/zones
 * - POST /api/admin/zones/areas
 * - PATCH /api/admin/zones/:kind/:id
 * - POST /api/admin/zones/areas/:id/move|merge|deactivate
 */
import {
  activateAreaInStore,
  createCustomAreaInStore,
  deactivateAreaInStore,
  listTreeFromStore,
  mergeAreasInStore,
  renameInStore,
  reparentInStore,
} from "./mockStore";
import type {
  AdminGovernorate,
  AdminNeighborhood,
  AreaDraft,
  RenameTarget,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listAdminZones(): Promise<AdminGovernorate[]> {
  await delay();
  return listTreeFromStore();
}

export async function createAdminCustomArea(
  draft: AreaDraft,
): Promise<AdminNeighborhood> {
  await delay();
  return createCustomAreaInStore(draft);
}

export async function renameAdminZone(
  target: RenameTarget,
  name: string,
  slug: string,
): Promise<AdminGovernorate[]> {
  await delay();
  return renameInStore(target, name, slug);
}

export async function moveAdminArea(
  areaId: string,
  districtId: string,
): Promise<AdminNeighborhood> {
  await delay();
  return reparentInStore(areaId, districtId);
}

export async function mergeAdminAreas(
  sourceId: string,
  targetId: string,
): Promise<AdminNeighborhood> {
  await delay();
  return mergeAreasInStore(sourceId, targetId);
}

export async function deactivateAdminArea(
  areaId: string,
): Promise<AdminNeighborhood> {
  await delay();
  return deactivateAreaInStore(areaId);
}

export async function activateAdminArea(
  areaId: string,
): Promise<AdminNeighborhood> {
  await delay();
  return activateAreaInStore(areaId);
}
