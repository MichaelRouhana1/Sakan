import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CREDIT_BUNDLES } from "@/constants/bundles";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useCreatePurchase } from "@/features/credits/useCreatePurchase";
import { useCredits } from "@/features/credits/useCredits";
import { formatUsdFromCents } from "@/lib/format";
import type { CreditBundleType, CreditTransaction, PaymentChannel } from "@/types/credits";

function bundleKey(type: CreditBundleType, channel: PaymentChannel) {
  return `${type}:${channel}`;
}

export function HostCreditsPage() {
  const purchase = useCreatePurchase();
  const credits = useCredits();
  const { user, refreshUser } = useAuthSession();
  const [lastBuy, setLastBuy] = useState<CreditTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const postCredits = credits.data?.postCredits ?? user?.postCredits ?? 0;
  const boostCredits = credits.data?.boostCredits ?? user?.boostCredits ?? 0;

  function buy(bundleType: CreditBundleType, channel: PaymentChannel) {
    setError(null);
    setPendingKey(bundleKey(bundleType, channel));
    purchase.mutate(
      { bundleType, channel },
      {
        onSuccess: async (tx) => {
          setLastBuy(tx);
          await refreshUser();
        },
        onError: () =>
          setError("Could not complete purchase. Is the API running?"),
        onSettled: () => setPendingKey(null),
      },
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <Text style={styles.title}>Credits</Text>
        <Text style={styles.lede}>
          Extra live listings and 7-day boosts use credits. Your first live
          listing is free.
        </Text>

        <View style={styles.balanceRow}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Post credits</Text>
            <Text style={styles.balanceValue}>{postCredits}</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Boost credits</Text>
            <Text style={styles.balanceValue}>{boostCredits}</Text>
          </View>
        </View>

        <Text style={styles.section}>Top up</Text>
        <View style={styles.grid}>
          {CREDIT_BUNDLES.map((item) => (
            <View key={item.type} style={styles.bundle}>
              <Text style={styles.bundlePrice}>
                {formatUsdFromCents(item.amountUsd * 100)}
              </Text>
              <Text style={styles.bundleTitle}>{item.title}</Text>
              <Text style={styles.bundleDesc}>{item.description}</Text>
              <View style={styles.bundleActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={purchase.isPending}
                  onPress={() => buy(item.type, "whish")}
                  style={({ pressed }) => [
                    styles.buyBtn,
                    styles.buyPrimary,
                    pressed && !purchase.isPending && styles.pressed,
                    purchase.isPending && styles.buyDisabled,
                  ]}
                >
                  <Text style={styles.buyPrimaryText}>
                    {pendingKey === bundleKey(item.type, "whish")
                      ? "Buying…"
                      : "Whish"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={purchase.isPending}
                  onPress={() => buy(item.type, "omt")}
                  style={({ pressed }) => [
                    styles.buyBtn,
                    styles.buySecondary,
                    pressed && !purchase.isPending && styles.pressed,
                    purchase.isPending && styles.buyDisabled,
                  ]}
                >
                  <Text style={styles.buySecondaryText}>
                    {pendingKey === bundleKey(item.type, "omt")
                      ? "Buying…"
                      : "OMT"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {lastBuy ? (
          <View style={styles.success}>
            <Text style={styles.successTitle}>Credits added</Text>
            <Text style={styles.successBody}>
              {formatUsdFromCents(lastBuy.amountUsdCents)} via{" "}
              {lastBuy.channel.toUpperCase()}. Reference {lastBuy.referenceId}.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 64,
  },
  page: {
    width: "100%",
    maxWidth: WEB_CONTENT_MAX,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingTop: 32,
    ...(Platform.OS === "web" ? { boxSizing: "border-box" as const } : null),
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 24,
    color: Skoun.color.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  lede: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.inkMuted,
    maxWidth: 520,
    marginBottom: 24,
  },
  balanceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  balanceCard: {
    minWidth: 160,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  balanceLabel: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  balanceValue: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 28,
    color: Skoun.color.ink,
    letterSpacing: -0.6,
  },
  section: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    color: Skoun.color.ink,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  bundle: {
    width: 280,
    maxWidth: "100%",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 6,
    ...(Platform.OS === "web" ? { boxSizing: "border-box" as const } : null),
  },
  bundlePrice: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.ink,
    letterSpacing: -0.4,
  },
  bundleTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
  },
  bundleDesc: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
    marginBottom: 12,
  },
  bundleActions: {
    flexDirection: "row",
    gap: 8,
  },
  buyBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
  buyPrimary: {
    backgroundColor: Skoun.color.primary,
  },
  buySecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  buyDisabled: {
    opacity: 0.55,
    ...(Platform.OS === "web" ? { cursor: "default" as const } : null),
  },
  buyPrimaryText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: "#FFFFFF",
  },
  buySecondaryText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  error: {
    marginTop: 20,
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.danger,
  },
  success: {
    marginTop: 24,
    maxWidth: 520,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Skoun.color.primaryMist,
    gap: 4,
  },
  successTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
  },
  successBody: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
