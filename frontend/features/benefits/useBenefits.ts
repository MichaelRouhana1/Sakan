import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { benefitKeys } from "./keys";
import type { BenefitFilters, StudentBenefit } from "./types";

type Response = { data: StudentBenefit[] };

/** HTTP status off an axios error, for separating "unknown university" 404s. */
export function errorStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } } | null)?.response?.status;
}

export function useBenefits(filters: BenefitFilters) {
  const { isSignedIn } = useAuthSession();

  return useQuery({
    queryKey: benefitKeys.list(filters, isSignedIn),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.university) params.university = filters.university;
      if (filters.category) params.category = filters.category;
      if (filters.isGlobal !== undefined) {
        params.isGlobal = String(filters.isGlobal);
      }

      const { data } = await api.get<Response>("/api/benefits", { params });
      return data.data ?? [];
    },
    // An unknown university slug is a 404 the UI renders as an empty state,
    // so retrying it just delays that.
    retry: (count, err) => errorStatus(err) === 404 ? false : count < 1,
  });
}
