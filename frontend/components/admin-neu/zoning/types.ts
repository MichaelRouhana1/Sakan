export type ZoneKind = "governorate" | "district" | "neighborhood";
export type ZoneOrigin = "official" | "custom";
export type OriginFilter = ZoneOrigin | "all";

export type AdminNeighborhood = {
  id: string;
  districtId: string;
  name: string;
  slug: string;
  origin: ZoneOrigin;
  listingCount: number;
};

export type AdminDistrict = {
  id: string;
  governorateId: string;
  name: string;
  slug: string;
  origin: ZoneOrigin;
  neighborhoods: AdminNeighborhood[];
};

export type AdminGovernorate = {
  id: string;
  name: string;
  slug: string;
  arabicName: string;
  districts: AdminDistrict[];
};

export type AreaDraft = {
  name: string;
  slug: string;
  districtId: string;
};

export type RenameTarget = {
  kind: ZoneKind;
  id: string;
  name: string;
};

export type AssignMode = "move" | "merge";

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

export function districtCount(gov: AdminGovernorate): number {
  return gov.districts.length;
}

export function neighborhoodCount(gov: AdminGovernorate): number {
  return gov.districts.reduce((sum, row) => sum + row.neighborhoods.length, 0);
}

export function listingCount(gov: AdminGovernorate): number {
  return gov.districts.reduce(
    (sum, row) =>
      sum + row.neighborhoods.reduce((inner, area) => inner + area.listingCount, 0),
    0,
  );
}

export function flattenDistricts(tree: AdminGovernorate[]): AdminDistrict[] {
  return tree.flatMap((gov) => gov.districts);
}

export function flattenNeighborhoods(tree: AdminGovernorate[]): AdminNeighborhood[] {
  return tree.flatMap((gov) =>
    gov.districts.flatMap((district) => district.neighborhoods),
  );
}

export function findNeighborhood(
  tree: AdminGovernorate[],
  id: string,
): {
  gov: AdminGovernorate;
  district: AdminDistrict;
  area: AdminNeighborhood;
} | null {
  for (const gov of tree) {
    for (const district of gov.districts) {
      const area = district.neighborhoods.find((row) => row.id === id);
      if (area) return { gov, district, area };
    }
  }
  return null;
}

export function findDistrict(
  tree: AdminGovernorate[],
  id: string,
): { gov: AdminGovernorate; district: AdminDistrict } | null {
  for (const gov of tree) {
    const district = gov.districts.find((row) => row.id === id);
    if (district) return { gov, district };
  }
  return null;
}

export function haystack(gov: AdminGovernorate): string {
  const inner = gov.districts
    .map(
      (district) =>
        `${district.name} ${district.slug} ${district.neighborhoods
          .map((area) => `${area.name} ${area.slug}`)
          .join(" ")}`,
    )
    .join(" ");
  return `${gov.name} ${gov.arabicName} ${gov.slug} ${inner}`.toLowerCase();
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
