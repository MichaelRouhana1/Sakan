import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { PendingPaymentCard } from "@/components/credits/PendingPaymentCard";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { CREDIT_BUNDLES } from "@/constants/bundles";
import { useCreatePurchase } from "@/features/credits/useCreatePurchase";
import type { CreditTransaction } from "@/types/credits";

export default function CreditsScreen() {
  const purchase = useCreatePurchase();
  const [pending, setPending] = useState<CreditTransaction | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buy credits</Text>
      <Text style={styles.sub}>Pay via Whish / OMT — manual verification</Text>
      <FlatList
        data={CREDIT_BUNDLES}
        keyExtractor={(item) => item.type}
        renderItem={({ item }) => (
          <View style={styles.bundle}>
            <Text style={styles.bundleTitle}>{item.title}</Text>
            <Text style={styles.bundleDesc}>{item.description}</Text>
            <Button
              label="Pay via Whish"
              onPress={() => {
                purchase.mutate(
                  { bundleType: item.type, channel: "whish" },
                  {
                    onSuccess: (tx) => setPending(tx),
                  },
                );
              }}
            />
          </View>
        )}
      />
      {pending ? (
        <>
          <Text style={styles.pendingTitle}>Pending payment</Text>
          <PendingPaymentCard transaction={pending} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  sub: {
    color: "#666",
    marginBottom: 16,
  },
  bundle: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
    gap: 8,
  },
  bundleTitle: {
    fontWeight: "700",
    fontSize: 17,
  },
  bundleDesc: {
    color: "#555",
  },
  pendingTitle: {
    marginTop: 20,
    fontWeight: "700",
    fontSize: 16,
  },
});
