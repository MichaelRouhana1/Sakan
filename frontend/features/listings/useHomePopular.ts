import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { listingKeys } from "./keys";

export type HomePopularArea = {
  name: string;
  count: number;
};

export type HomePopularUniversity = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  isMain: boolean;
  institutionShortName: string | null;
  institutionSlug: string | null;
  logoUrl: string | null;
  displayName: string;
  count: number;
};

export type HomePopularData = {
  areas: HomePopularArea[];
  universities: HomePopularUniversity[];
};

type Response = { data: HomePopularData };

export function useHomePopular() {
  return useQuery({
    queryKey: listingKeys.homePopular(),
    queryFn: async (): Promise<HomePopularData> => {
      const { data } = await api.get<Response>("/api/listings/home-popular");
      return {
        areas: data.data?.areas ?? [],
        universities: data.data?.universities ?? [],
      };
    },
    staleTime: 60_000,
  });
}
