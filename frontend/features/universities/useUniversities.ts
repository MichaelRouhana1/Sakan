import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type University = {
  id: string;
  name: string;
  slug: string;
  lng: number | null;
  lat: number | null;
};

type UniversitiesResponse = { data: University[] };

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function useUniversities() {
  return useQuery({
    queryKey: ["universities"],
    queryFn: async () => {
      const { data } = await api.get<UniversitiesResponse>("/api/universities");
      return (data.data ?? []).map((u) => ({
        ...u,
        lng: parseCoord(u.lng),
        lat: parseCoord(u.lat),
      }));
    },
  });
}
