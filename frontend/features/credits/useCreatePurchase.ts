import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreditBundleType, CreditTransaction, PaymentChannel } from "@/types/credits";

type CreatePurchaseBody = {
  bundleType: CreditBundleType;
  channel: PaymentChannel;
};

type PurchaseResponse = { data: CreditTransaction };

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreatePurchaseBody) => {
      const { data } = await api.post<PurchaseResponse>(
        "/api/credits/purchase",
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });
}
