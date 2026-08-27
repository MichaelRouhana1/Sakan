import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SwitchRoleControl } from "@/components/auth/SwitchRoleControl";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import {
  appleTabScrollInset,
  GlassSurface,
} from "@/components/ui/Glass";
import { CREDIT_BUNDLES } from "@/constants/bundles";
import { Lister } from "@/constants/listerTheme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useCreatePurchase } from "@/features/credits/useCreatePurchase";
import { useCredits } from "@/features/credits/useCredits";
import { formatUsdFromCents } from "@/lib/format";
import type { CreditTransaction, PaymentChannel } from "@/types/credits";

export default function CreditsScreen() {
  const purchase = useCreatePurchase();
  const credits = useCredits();
  const { refreshUser } = useAuthSession();
  const [lastBuy, setLastBuy] = useState<CreditTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const postCredits = credits.data?.postCredits ?? 0;
  const boostCredits = credits.data?.boostCredits ?? 0;

  function buy(
    bundleType: (typeof CREDIT_BUNDLES)[number]["type"],
    channel: PaymentChannel,
  ) {
    setError(null);
    purchase.mutate(
      { bundleType, channel },
      {
        onSuccess: async (tx) => {
          setLastBuy(tx);
          await refreshUser();
        },
        onError: () =>
          setError("Could not complete purchase. Is the API running?"),
      },
    );
  }

  return (
    <ListerScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <Enter>
          <LText variant="label" tone="brass">
            Optional boosts
          </LText>
          <LText variant="display" style={styles.display}>
            Credits
          </LText>
          <GlassSurface intensity="soft" style={styles.banner}>
            <View style={styles.bannerInner}>
              <LText variant="subtitle" tone="primary">
                First live listing is free
              </LText>
              <LText variant="body" tone="muted">
                Extra live posts and 7-day boosts use credits. Checkout grants
                them immediately (demo gateway — not a cash slip).
              </LText>
              <LText variant="caption" tone="muted">
                Balance: {postCredits} post · {boostCredits} boost
              </LText>
            </View>
          </GlassSurface>
        </Enter>

        <Enter delay={80}>
          <LText variant="subtitle" style={styles.section}>
            Bundles
          </LText>
          {CREDIT_BUNDLES.map((item) => (
            <GlassSurface key={item.type} intensity="soft" style={styles.bundle}>
              <View style={styles.bundleInner}>
                <View style={styles.bundleHead}>
                  <LText variant="subtitle">{item.title}</LText>
                  <LText variant="caption" tone="muted">
                    {item.description}
                  </LText>
                </View>
                <View style={styles.bundleActions}>
                  <LButton
                    label="Whish"
                    variant="secondary"
                    loading={purchase.isPending}
                    onPress={() => buy(item.type, "whish")}
                    style={styles.half}
                  />
                  <LButton
                    label="OMT"
                    variant="ghost"
                    loading={purchase.isPending}
                    onPress={() => buy(item.type, "omt")}
                    style={styles.half}
                  />
                </View>
              </View>
            </GlassSurface>
          ))}
        </Enter>

        {error ? (
          <LText variant="body" tone="danger" style={styles.error}>
            {error}
          </LText>
        ) : null}

        {lastBuy ? (
          <Enter delay={40}>
            <GlassSurface intensity="soft" style={styles.success}>
              <View style={styles.bannerInner}>
                <LText variant="subtitle" tone="primary">
                  Credits added
                </LText>
                <LText variant="body" tone="muted">
                  {formatUsdFromCents(lastBuy.amountUsdCents)} via{" "}
                  {lastBuy.channel.toUpperCase()}. Reference {lastBuy.referenceId}.
                </LText>
              </View>
            </GlassSurface>
          </Enter>
        ) : null}

        <Enter delay={120}>
          <View style={styles.switchWrap}>
            <SwitchRoleControl currentRole="poster" />
          </View>
        </Enter>
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Lister.space.lg,
    paddingBottom: appleTabScrollInset,
    gap: 8,
  },
  display: { fontSize: 32, marginBottom: 8 },
  banner: {
    borderRadius: Lister.radius.lg,
    marginBottom: 8,
    overflow: "hidden",
  },
  bannerInner: {
    padding: Lister.space.md,
    gap: 6,
  },
  section: { marginTop: 12, marginBottom: 4 },
  bundle: {
    borderRadius: Lister.radius.lg,
    marginBottom: 12,
    overflow: "hidden",
  },
  bundleInner: {
    padding: Lister.space.md,
    gap: 12,
  },
  bundleHead: { gap: 4 },
  bundleActions: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  error: { marginTop: 8 },
  success: {
    borderRadius: Lister.radius.lg,
    marginTop: 8,
    overflow: "hidden",
  },
  switchWrap: {
    marginTop: 24,
    alignItems: "flex-start",
  },
});
