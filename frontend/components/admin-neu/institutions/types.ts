export type RegistryStatus = "active" | "inactive";
export type RegistryStatusFilter = RegistryStatus | "all";
export type RegistryTarget = "institution" | "campus";
export type RegistryActionKind = "activate" | "deactivate" | "remove";

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
};

export type AdminInstitution = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  website: string;
  emailDomains: string[];
  active: boolean;
  campuses: AdminCampus[];
};

export type InstitutionDraft = {
  name: string;
  shortName: string;
  slug: string;
  website: string;
  emailDomains: string[];
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

export function parseDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^@/, "");
  if (!trimmed) return null;
  if (
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      trimmed,
    )
  ) {
    return null;
  }
  return trimmed;
}

export function haystack(institution: AdminInstitution): string {
  const campusHay = institution.campuses
    .map((campus) => `${campus.name} ${campus.city} ${campus.slug}`)
    .join(" ");
  return `${institution.name} ${institution.shortName} ${institution.slug} ${institution.website} ${institution.emailDomains.join(" ")} ${campusHay}`.toLowerCase();
}
