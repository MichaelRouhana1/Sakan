import { MOCK_INSTITUTIONS } from "./mockInstitutions";
import {
  newId,
  type AdminCampus,
  type AdminInstitution,
  type CampusDraft,
  type InstitutionDraft,
  type RegistryActionKind,
  type RegistryNote,
  type RegistryTarget,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

const ANCHOR = "2026-08-28T12:00:00.000Z";

let tree = clone(MOCK_INSTITUTIONS);
let notes: RegistryNote[] = [];

export function resetInstitutionsMockStore(): void {
  tree = clone(MOCK_INSTITUTIONS);
  notes = [];
}

export function listTreeFromStore(): AdminInstitution[] {
  return clone(tree).sort((a, b) => a.name.localeCompare(b.name));
}

function assertInstitutionSlugFree(slug: string, exceptId?: string): void {
  const hit = tree.find((row) => row.slug === slug && row.id !== exceptId);
  if (hit) throw new Error(`Institution slug already taken: ${slug}`);
}

function assertCampusSlugFree(slug: string, exceptId?: string): void {
  for (const row of tree) {
    const hit = row.campuses.find(
      (campus) => campus.slug === slug && campus.id !== exceptId,
    );
    if (hit) throw new Error(`Campus slug already taken: ${slug}`);
  }
}

function findInstitution(id: string): AdminInstitution {
  const row = tree.find((item) => item.id === id);
  if (!row) throw new Error(`Institution not found: ${id}`);
  return row;
}

function clearMainExcept(institutionId: string, keepCampusId?: string): void {
  tree = tree.map((row) => {
    if (row.id !== institutionId) return row;
    return {
      ...row,
      campuses: row.campuses.map((campus) =>
        campus.id === keepCampusId ? campus : { ...campus, isMain: false },
      ),
    };
  });
}

export function createInstitutionInStore(
  draft: InstitutionDraft,
): AdminInstitution {
  const slug = draft.slug.trim();
  assertInstitutionSlugFree(slug);
  const next: AdminInstitution = {
    id: newId(),
    name: draft.name.trim(),
    shortName: draft.shortName.trim(),
    slug,
    website: draft.website.trim(),
    logoUrl: draft.logoUrl.trim() || null,
    active: draft.active,
    createdAt: ANCHOR,
    campuses: [],
  };
  tree = [...tree, next];
  return clone(next);
}

export function updateInstitutionInStore(
  id: string,
  draft: InstitutionDraft,
): AdminInstitution {
  findInstitution(id);
  const slug = draft.slug.trim();
  assertInstitutionSlugFree(slug, id);
  tree = tree.map((row) =>
    row.id === id
      ? {
          ...row,
          name: draft.name.trim(),
          shortName: draft.shortName.trim(),
          slug,
          website: draft.website.trim(),
          logoUrl: draft.logoUrl.trim() || null,
          active: draft.active,
        }
      : row,
  );
  return clone(findInstitution(id));
}

export function createCampusInStore(draft: CampusDraft): AdminCampus {
  findInstitution(draft.institutionId);
  const slug = draft.slug.trim();
  assertCampusSlugFree(slug);
  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("lat/lng must be finite numbers");
  }
  const next: AdminCampus = {
    id: newId(),
    institutionId: draft.institutionId,
    name: draft.name.trim(),
    slug,
    city: draft.city.trim(),
    lat,
    lng,
    isMain: draft.isMain,
    active: draft.active,
    createdAt: ANCHOR,
  };
  if (draft.isMain) clearMainExcept(draft.institutionId);
  tree = tree.map((row) =>
    row.id === draft.institutionId
      ? { ...row, campuses: [...row.campuses, next] }
      : row,
  );
  return clone(next);
}

export function updateCampusInStore(
  id: string,
  draft: CampusDraft,
): AdminCampus {
  let found: AdminCampus | null = null;
  for (const row of tree) {
    const campus = row.campuses.find((item) => item.id === id);
    if (campus) {
      found = campus;
      break;
    }
  }
  if (!found) throw new Error(`Campus not found: ${id}`);

  const slug = draft.slug.trim();
  assertCampusSlugFree(slug, id);
  const lat = Number(draft.lat);
  const lng = Number(draft.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("lat/lng must be finite numbers");
  }

  if (draft.isMain) clearMainExcept(found.institutionId, id);

  tree = tree.map((row) => ({
    ...row,
    campuses: row.campuses.map((campus) => {
      if (campus.id !== id) {
        return draft.isMain && campus.institutionId === found!.institutionId
          ? { ...campus, isMain: false }
          : campus;
      }
      return {
        ...campus,
        name: draft.name.trim(),
        slug,
        city: draft.city.trim(),
        lat,
        lng,
        isMain: draft.isMain,
        active: draft.active,
      };
    }),
  }));

  for (const row of tree) {
    const campus = row.campuses.find((item) => item.id === id);
    if (campus) return clone(campus);
  }
  throw new Error(`Campus not found: ${id}`);
}

/** Flip only the targeted row — matches PATCH active (no cascade). */
export function setActiveInStore(
  target: RegistryTarget,
  id: string,
  kind: RegistryActionKind,
  note: string,
): AdminInstitution | AdminCampus {
  const active = kind === "activate";
  const trimmed = note.trim();
  if (!trimmed) throw new Error("Staff note required");

  notes = [
    ...notes,
    {
      id: newId(),
      target,
      targetId: id,
      kind,
      note: trimmed,
      at: ANCHOR,
    },
  ];

  if (target === "institution") {
    findInstitution(id);
    tree = tree.map((row) => (row.id === id ? { ...row, active } : row));
    return clone(findInstitution(id));
  }

  let updated: AdminCampus | null = null;
  tree = tree.map((row) => ({
    ...row,
    campuses: row.campuses.map((campus) => {
      if (campus.id !== id) return campus;
      updated = { ...campus, active };
      return updated;
    }),
  }));
  if (!updated) throw new Error(`Campus not found: ${id}`);
  return clone(updated);
}

export function listNotesFromStore(): RegistryNote[] {
  return clone(notes);
}
