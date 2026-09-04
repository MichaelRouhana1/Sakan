import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { campusKeys } from "./keys";
import type { ProgramCosts } from "./types";

type CostPeriod = "semester" | "year" | "degree";

type Response = { data: ProgramCosts };

export function useProgramCosts(
  programId: string | null,
  credits: number,
  period: CostPeriod,
) {
  return useQuery({
    queryKey: campusKeys.costs(programId ?? "", credits, period),
    enabled: Boolean(programId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get<Response>(
        `/api/campus/programs/${programId}/costs`,
        { params: { credits, period } },
      );
      return data.data;
    },
  });
}
