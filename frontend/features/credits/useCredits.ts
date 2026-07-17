import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/types/user";

type MeResponse = { data: User };

/** Credits live on the poster user record. */
export function useCredits() {
  return useQuery({
    queryKey: ["credits", "me"],
    queryFn: async () => {
      const { data } = await api.get<MeResponse>("/api/users/me");
      return {
        postCredits: data.data.postCredits,
        boostCredits: data.data.boostCredits,
      };
    },
  });
}
