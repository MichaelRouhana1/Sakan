export type RegistryStatus = "active" | "inactive";
export type RegistryStatusFilter = RegistryStatus | "all";
export type RegistryTarget = "institution" | "campus";
export type RegistryActionKind = "activate" | "deactivate";

export type AdminCampus = {
  id: string;
  institutionId: string;
  name: string;
  slug: string;
  city: string;
  lng: number;
  lat: number;
  isMain: boolean;
  active: boolean;
  createdAt: string;
};

export type AdminInstitution = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  website: string;
  logoUrl: string | null;
  active: boolean;
  createdAt: string;
  campuses: AdminCampus[];
};

export type InstitutionDraft = {
  name: string;
  shortName: string;
  slug: string;
  website: string;
  logoUrl: string;
  active: boolean;
};

export type CampusDraft = {
  institutionId: string;
  name: string;
  slug: string;
  city: string;
  lat: string;
  lng: string;
  isMain: boolean;
  active: boolean;
};

export type RegistryNote = {
  id: string;
  target: RegistryTarget;
  targetId: string;
  kind: RegistryActionKind;
  note: string;
  at: string;
};

export function campusCount(institution: AdminInstitution): number {
  return institution.campuses.length;
}

export function activeCampusCount(institution: AdminInstitution): number {
  return institution.campuses.filter((campus) => campus.active).length;
}

export function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function haystack(institution: AdminInstitution): string {
  const campusHay = institution.campuses
    .map((campus) => `${campus.name} ${campus.city} ${campus.slug}`)
    .join(" ");
  return `${institution.name} ${institution.shortName} ${institution.slug} ${institution.website} ${campusHay}`.toLowerCase();
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
}
