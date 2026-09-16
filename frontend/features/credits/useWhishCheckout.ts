import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useCreatePurchase } from "@/features/credits/useCreatePurchase";
import { api } from "@/lib/api";
import type { CreditBundleType, CreditTransaction } from "@/types/credits";

const POLL_MS = 2000;
const MAX_POLLS = 30;

type TxResponse = { data: CreditTransaction };

function purchaseErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    const apiMessage = (err.response?.data as { error?: { message?: string } } | undefined)
      ?.error?.message;
    if (typeof apiMessage === "string" && apiMessage.length > 0) return apiMessage;
    if (!err.response) {
      return "Could not start Whish checkout. Is the API running?";
    }
  }
  return "Could not start Whish checkout.";
}

export function useWhishCheckout(initialReferenceId?: string) {
  const purchase = useCreatePurchase();
  const queryClient = useQueryClient();
  const { refreshUser, isSignedIn, isLoading: isAuthLoading } = useAuthSession();
  const [tx, setTx] = useState<CreditTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingBundle, setPendingBundle] = useState<CreditBundleType | null>(
    null,
  );
  const polls = useRef(0);
  const watching = useRef<string | null>(null);

  const syncBalances = useCallback(async () => {
    await refreshUser();
    void queryClient.invalidateQueries({ queryKey: ["credits"] });
    void queryClient.invalidateQueries({ queryKey: ["credits", "me"] });
  }, [queryClient, refreshUser]);

  const confirm = useCallback(
    async (referenceId: string) => {
      const { data } = await api.post<TxResponse>(
        `/api/credits/${encodeURIComponent(referenceId)}/confirm`,
        {},
        { timeout: 30_000 },
      );
      setTx(data.data);
      setError(null);
      if (data.data.status === "approved") {
        await syncBalances();
      }
      return data.data;
    },
    [syncBalances],
  );

  useEffect(() => {
    if (!initialReferenceId) return;
    watching.current = initialReferenceId;
    if (isAuthLoading || !isSignedIn) return;
    polls.current = 0;
    void confirm(initialReferenceId).catch(() => {
      setError("Could not verify payment status.");
    });
  }, [initialReferenceId, confirm, isAuthLoading, isSignedIn]);

  useEffect(() => {
    if (!tx?.referenceId || tx.status !== "pending") return;
    watching.current = tx.referenceId;
    const id = setInterval(() => {
      if (polls.current >= MAX_POLLS) {
        clearInterval(id);
        return;
      }
      polls.current += 1;
      void confirm(tx.referenceId).catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [tx?.referenceId, tx?.status, confirm]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && isSignedIn && watching.current) {
        void confirm(watching.current).catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [confirm, isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      if (isSignedIn && watching.current) {
        void confirm(watching.current).catch(() => undefined);
      }
    }, [confirm, isSignedIn]),
  );

  async function buy(bundleType: CreditBundleType) {
    setError(null);
    setPendingBundle(bundleType);
    polls.current = 0;
    try {
      const created = await purchase.mutateAsync({
        bundleType,
        channel: "whish",
      });
      setTx(created);
      watching.current = created.referenceId;
      if (created.status === "approved") {
        await syncBalances();
        return;
      }
      if (!created.checkoutUrl) {
        setError("Checkout URL missing. Try again.");
        return;
      }
      if (Platform.OS === "web") {
        window.location.assign(created.checkoutUrl);
        return;
      }
      await Linking.openURL(created.checkoutUrl);
    } catch (err) {
      setError(purchaseErrorMessage(err));
    } finally {
      setPendingBundle(null);
    }
  }

  return {
    buy,
    tx,
    error,
    isStarting: purchase.isPending,
    pendingBundle,
  };
}
