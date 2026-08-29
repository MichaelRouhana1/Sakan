import { LEBANON_ZONE_TREE } from "@/constants/lebanonZones";
import { slugify, type AdminGovernorate } from "./types";

export const MOCK_ZONES: AdminGovernorate[] = LEBANON_ZONE_TREE.map((gov) => ({
  id: `gov-${gov.slug}`,
  name: gov.name,
  slug: gov.slug,
  arabicName: gov.arabicName,
  districts: gov.districts.map((district) => ({
    id: `dist-${district.slug}`,
    governorateId: `gov-${gov.slug}`,
    name: district.name,
    slug: district.slug,
    origin: "official" as const,
    neighborhoods: district.neighborhoods.map((name) => ({
      id: `n-${slugify(name)}`,
      districtId: `dist-${district.slug}`,
      name,
      slug: slugify(name),
      origin: "official" as const,
      listingCount: 0,
      active: true,
    })),
  })),
}));
