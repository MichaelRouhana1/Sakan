import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { benefitKeys } from "./keys";
import { errorStatus } from "./useBenefits";
import type { StudentBenefit } from "./types";

type Response = { data: StudentBenefit };

export function useBenefit(id: string) {
  const { isSignedIn } = useAuthSession();

  return useQuery({
    queryKey: benefitKeys.detail(id, isSignedIn),
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Response>(`/api/benefits/${id}`);
      return data.data;
    },
    retry: (count, err) => (errorStatus(err) === 404 ? false : count < 1),
  });
}
