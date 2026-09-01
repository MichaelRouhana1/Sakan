import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { campusKeys } from "./keys";
import type { CampusInstitution } from "./types";

type Response = { data: CampusInstitution[] };

export function useCampusInstitutions() {
  return useQuery({
    queryKey: campusKeys.institutions(),
    queryFn: async () => {
      const { data } = await api.get<Response>("/api/campus/institutions");
      return data.data ?? [];
    },
  });
}
