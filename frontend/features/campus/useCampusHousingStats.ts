import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { campusKeys } from "./keys";
import type { HousingStats } from "./types";

type Response = { data: HousingStats };

export function useCampusHousingStats(slug: string | null) {
  return useQuery({
    queryKey: campusKeys.housing(slug ?? ""),
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data } = await api.get<Response>(
        `/api/campus/campuses/${slug}/housing-stats`,
      );
      return data.data;
    },
  });
}
