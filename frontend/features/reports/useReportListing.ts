import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";
import { reportKeys } from "./keys";

export type ReportReason =
  | "fake"
  | "inaccurate_utilities"
  | "already_rented";

type ReportedFlagResponse = { data: { reported: boolean } };
type CreateReportResponse = {
  data: {
    reported: true;
    listingId: string;
    reason: ReportReason;
    id: string;
  };
};

async function fetchIsReported(listingId: string): Promise<boolean> {
  const { data } = await api.get<ReportedFlagResponse>(
    `/api/reports/${listingId}`,
  );
  return Boolean(data.data?.reported);
}

export function useIsReported(listingId: string) {
  return useQuery({
    queryKey: reportKeys.one(listingId),
    queryFn: () => fetchIsReported(listingId),
    enabled: Boolean(listingId),
  });
}

export function reportErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.error?.message;
    if (typeof message === "string" && message.length > 0) return message;
    if (err.response?.status === 409) {
      return "You already reported this listing";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Couldn’t submit report. Try again.";
}

export function useReportListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      listingId: string;
      reason: ReportReason;
    }) => {
      const { data } = await api.post<CreateReportResponse>(
        "/api/reports",
        input,
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(reportKeys.one(variables.listingId), true);
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({
        queryKey: reportKeys.one(variables.listingId),
      });
    },
  });
}
