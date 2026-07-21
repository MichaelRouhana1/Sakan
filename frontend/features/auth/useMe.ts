import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/types/user";

type MeResponse = { data: User };

export function useMe() {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: async () => {
      const { data } = await api.get<MeResponse>("/api/users/me");
      return data.data;
    },
  });
}
