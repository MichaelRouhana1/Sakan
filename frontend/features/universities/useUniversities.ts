import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type University = {
  id: string;
  name: string;
  slug: string;
};

type UniversitiesResponse = { data: University[] };

export function useUniversities() {
  return useQuery({
    queryKey: ["universities"],
    queryFn: async () => {
      const { data } = await api.get<UniversitiesResponse>("/api/universities");
      return data.data;
    },
  });
}
