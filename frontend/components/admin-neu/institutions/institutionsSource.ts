/**
 * Live institutions (universities) source → /api/admin/*.
 *
 * - GET  /api/admin/catalog — full ops tree (inactive + empty + LU)
 * - POST/PATCH /api/admin/institutions[/:id]
 * - POST/PATCH /api/admin/campuses[/:id]
 * Soft-hide via PATCH { active }. Staff note in UI is local-only (server audit
 * records actor + fields, not the dialog note).
 */
import axios from "axios";
import { api } from "@/lib/api";
import type {
  AdminCampus,
  AdminInstitution,
  CampusDraft,
  InstitutionDraft,
  RegistryActionKind,
  RegistryTarget,
} from "./types";

type ApiCampus = {
  id: string;
  institutionId: string | null;
  name: string;
  slug: string;
  city: string | null;
  isMain: boolean;
  active: boolean;
  lng: number | null;
  lat: number | null;
  createdAt: string;
};

type ApiInstitution = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  active: boolean;
  createdAt: string;
  campuses: ApiCampus[];
};

type CatalogResponse = {
  data: {
    institutions: ApiInstitution[];
    orphanCampuses: ApiCampus[];
  };
};

type InstitutionResponse = {
  data: Omit<ApiInstitution, "campuses"> & { campuses?: ApiCampus[] };
};

type CampusResponse = { data: ApiCampus };

function apiError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as
      | { error?: { message?: string } | string; message?: string }
      | undefined;
    const nested =
      typeof body?.error === "object" && body.error != null
        ? body.error.message
        : typeof body?.error === "string"
          ? body.error
          : undefined;
    const msg = nested ?? body?.message ?? err.message;
    if (typeof msg === "string" && msg.trim()) return new Error(msg);
  }
  if (err instanceof Error && err.message) return err;
  return new Error(fallback);
}

function optionalUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapCampus(row: ApiCampus): AdminCampus {
  return {
    id: row.id,
    institutionId: row.institutionId ?? "",
    name: row.name,
    slug: row.slug,
    city: row.city ?? "",
    lng: row.lng ?? 0,
    lat: row.lat ?? 0,
    isMain: row.isMain,
    active: row.active,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : new Date(row.createdAt).toISOString(),
  };
}

function mapInstitution(row: ApiInstitution): AdminInstitution {
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    slug: row.slug,
    website: row.website ?? "",
    logoUrl: row.logoUrl,
    active: row.active,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : new Date(row.createdAt).toISOString(),
    campuses: (row.campuses ?? []).map(mapCampus),
  };
}

function parseCoord(raw: string, label: "lat" | "lng"): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`${label} must be a number`);
  }
  return n;
}

export async function listAdminInstitutions(): Promise<AdminInstitution[]> {
  try {
    const { data } = await api.get<CatalogResponse>("/api/admin/catalog");
    return (data.data.institutions ?? []).map(mapInstitution);
  } catch (err) {
    throw apiError(err, "Failed to load institutions");
  }
}

export async function createAdminInstitution(
  draft: InstitutionDraft,
): Promise<AdminInstitution> {
  try {
    const { data } = await api.post<InstitutionResponse>(
      "/api/admin/institutions",
      {
        name: draft.name.trim(),
        shortName: draft.shortName.trim(),
        slug: draft.slug.trim(),
        website: optionalUrl(draft.website),
        logoUrl: optionalUrl(draft.logoUrl),
        active: draft.active,
      },
    );
    return mapInstitution({ ...data.data, campuses: data.data.campuses ?? [] });
  } catch (err) {
    throw apiError(err, "Failed to create university");
  }
}

export async function updateAdminInstitution(
  id: string,
  draft: InstitutionDraft,
): Promise<AdminInstitution> {
  try {
    const { data } = await api.patch<InstitutionResponse>(
      `/api/admin/institutions/${id}`,
      {
        name: draft.name.trim(),
        shortName: draft.shortName.trim(),
        slug: draft.slug.trim(),
        website: optionalUrl(draft.website),
        logoUrl: optionalUrl(draft.logoUrl),
        active: draft.active,
      },
    );
    return mapInstitution({ ...data.data, campuses: data.data.campuses ?? [] });
  } catch (err) {
    throw apiError(err, "Failed to update university");
  }
}

export async function createAdminCampus(
  draft: CampusDraft,
): Promise<AdminCampus> {
  try {
    const { data } = await api.post<CampusResponse>("/api/admin/campuses", {
      institutionId: draft.institutionId,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      city: draft.city.trim() || null,
      lng: parseCoord(draft.lng, "lng"),
      lat: parseCoord(draft.lat, "lat"),
      isMain: draft.isMain,
      active: draft.active,
    });
    return mapCampus(data.data);
  } catch (err) {
    throw apiError(err, "Failed to create campus");
  }
}

export async function updateAdminCampus(
  id: string,
  draft: CampusDraft,
): Promise<AdminCampus> {
  try {
    const { data } = await api.patch<CampusResponse>(
      `/api/admin/campuses/${id}`,
      {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        city: draft.city.trim() || null,
        lng: parseCoord(draft.lng, "lng"),
        lat: parseCoord(draft.lat, "lat"),
        isMain: draft.isMain,
        active: draft.active,
      },
    );
    return mapCampus(data.data);
  } catch (err) {
    throw apiError(err, "Failed to update campus");
  }
}

export async function setAdminRegistryActive(
  target: RegistryTarget,
  id: string,
  kind: RegistryActionKind,
  _note: string,
): Promise<AdminInstitution | AdminCampus> {
  const active = kind === "activate";
  try {
    if (target === "institution") {
      const { data } = await api.patch<InstitutionResponse>(
        `/api/admin/institutions/${id}`,
        { active },
      );
      return mapInstitution({
        ...data.data,
        campuses: data.data.campuses ?? [],
      });
    }
    const { data } = await api.patch<CampusResponse>(
      `/api/admin/campuses/${id}`,
      { active },
    );
    return mapCampus(data.data);
  } catch (err) {
    throw apiError(err, "Failed to update status");
  }
}
