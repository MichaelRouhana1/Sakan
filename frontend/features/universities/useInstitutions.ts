import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import { api } from "@/lib/api";
import type { University } from "@/features/universities/useUniversities";

export type Institution = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  campuses: University[];
};

type InstitutionsResponse = { data: Institution[] };

export function isPublicLebaneseUniversity(value: {
  slug?: string | null;
  name?: string | null;
  institutionSlug?: string | null;
  institutionName?: string | null;
}): boolean {
  const slugs = [value.slug, value.institutionSlug]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());
  const names = [value.name, value.institutionName]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());
  if (slugs.some((s) => s === "lu" || s === "lu-fanar")) return true;
  return names.some((n) => n.includes("lebanese university"));
}

export function campusFilterLabel(campus?: {
  name: string;
  institutionShortName?: string | null;
  institutionName?: string | null;
} | null): string {
  if (!campus) return "University";
  const uni = campus.institutionShortName ?? campus.institutionName;
  if (!uni) return campus.name;
  return campus.name && campus.name !== uni ? `${uni} · ${campus.name}` : uni;
}

export const POPULAR_INSTITUTION_SLUGS = [
  "aub",
  "lau",
  "usj",
  "ndu",
  "ua",
  "usek",
  "bau",
  "uob",
] as const;

export function useInstitutions(enabled = true) {
  return useQuery({
    queryKey: ["institutions"],
    enabled:
      enabled && (Platform.OS !== "web" || typeof window !== "undefined"),
    queryFn: async () => {
      const { data } = await api.get<InstitutionsResponse>("/api/institutions");
      return (data.data ?? []).filter(
        (inst) => !isPublicLebaneseUniversity(inst),
      );
    },
  });
}
