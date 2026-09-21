import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreditBundleType, CreditTransaction, PaymentChannel } from "@/types/credits";

type CreatePurchaseBody = {
  bundleType: CreditBundleType;
  channel?: PaymentChannel;
  returnTo?: string;
};

type PurchaseResponse = { data: CreditTransaction };

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreatePurchaseBody) => {
      const { data } = await api.post<PurchaseResponse>(
        "/api/credits/purchase",
        { channel: "whish", ...body },
        { timeout: 30_000 },
      );
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["credits", "me"] });
    },
  });
}
