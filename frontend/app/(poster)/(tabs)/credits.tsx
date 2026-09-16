import { Check } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SwitchRoleControl } from "@/components/auth/SwitchRoleControl";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { HideIosTabScrollFade } from "@/components/ui/HideIosTabScrollFade";
import { CREDIT_BUNDLES, type BundleDisplay } from "@/constants/bundles";
import { Lister } from "@/constants/listerTheme";
import { useWhishCheckout } from "@/features/credits/useWhishCheckout";
import { useCredits } from "@/features/credits/useCredits";
import { formatUsdFromCents } from "@/lib/format";
import type { CreditBundleType } from "@/types/credits";

const POPULAR: CreditBundleType = "bundle_5";

function packCopy(item: BundleDisplay) {
  if (item.type === "starter") {
    return {
      name: "Starter",
      blurb: "Your first extra listing after the free one.",
      points: ["1 live listing", "30 days on the feed", "First extra post"],
    };
  }
  if (item.type === "bundle_5") {
    return {
      name: "Five posts",
      blurb: "Best value if you list more than once.",
      points: ["5 live listings", "$3 per post", "30 days each"],
    };
  }
  return {
    name: "Boost pack",
    blurb: "Pin a live listing to the top of its feed.",
    points: ["3 boosts", "7-day pin each", "Any live listing"],
  };
}

export default function CreditsScreen() {
  const { buy, tx, error, isStarting, pendingBundle } = useWhishCheckout();
  const credits = useCredits();
  const postCredits = credits.data?.postCredits ?? 0;
  const boostCredits = credits.data?.boostCredits ?? 0;

  return (
    <ListerScreen>
      <HideIosTabScrollFade style={styles.scrollFadeWrap}>
      <ScrollView contentContainerStyle={styles.content}>
        {tx ? (
          <Enter>
            <View
              style={[
                styles.receipt,
                tx.status === "rejected" && styles.receiptBad,
                tx.status === "pending" && styles.receiptWait,
              ]}
            >
              <LText variant="subtitle">
                {tx.status === "approved"
                  ? "Credits added"
                  : tx.status === "rejected"
                    ? "Payment did not go through"
                    : "Finish payment in Whish"}
              </LText>
              <LText variant="caption" tone="muted">
                {formatUsdFromCents(tx.amountUsdCents)} · {tx.referenceId}
              </LText>
            </View>
          </Enter>
        ) : null}

        <Enter delay={40}>
          <LText variant="label" tone="brass" style={styles.center}>
            Credits
          </LText>
          <LText variant="display" style={styles.title}>
            Choose a pack
          </LText>
          <LText variant="body" tone="muted" style={styles.lede}>
            First live listing is free. Extra posts and 7-day boosts are paid.
            Whish confirms — credits land automatically.
          </LText>
          <View style={styles.chips}>
            <View style={styles.chip}>
              <LText variant="subtitle">{postCredits}</LText>
              <LText variant="caption" tone="muted">
                post
              </LText>
            </View>
            <View style={styles.chip}>
              <LText variant="subtitle">{boostCredits}</LText>
              <LText variant="caption" tone="muted">
                boost
              </LText>
            </View>
          </View>
        </Enter>

        {CREDIT_BUNDLES.map((item, index) => {
          const copy = packCopy(item);
          const popular = item.type === POPULAR;
          const paying = isStarting && pendingBundle === item.type;
          return (
            <Enter key={item.type} delay={80 + index * 50}>
              <View style={[styles.card, popular && styles.cardPopular]}>
                <View style={styles.aura}>
                  <View
                    style={[
                      styles.orb,
                      item.type === "starter" && styles.orbStarter,
                      item.type === "bundle_5" && styles.orbPopular,
                      item.type === "boost_pack" && styles.orbBoost,
                    ]}
                  />
                </View>
                <View style={styles.cardBody}>
                {popular ? (
                  <View style={styles.badge}>
                    <LText variant="caption" tone="inverse">
                      Popular
                    </LText>
                  </View>
                ) : null}
                <LText variant="subtitle">{copy.name}</LText>
                <LText variant="display" style={styles.price}>
                  {formatUsdFromCents(item.amountUsd * 100)}
                </LText>
                <LText variant="caption" tone="muted">
                  {copy.blurb}
                </LText>
                <LButton
                  label={
                    paying
                      ? "Opening Whish…"
                      : `Pay ${formatUsdFromCents(item.amountUsd * 100)} with Whish`
                  }
                  variant={popular ? "primary" : "secondary"}
                  loading={paying}
                  disabled={isStarting}
                  onPress={() => buy(item.type)}
                />
                <LText variant="caption" tone="muted" style={styles.included}>
                  Included
                </LText>
                {copy.points.map((point) => (
                  <View key={point} style={styles.point}>
                    <Check
                      color={Lister.color.primary}
                      size={14}
                      strokeWidth={2.2}
                    />
                    <LText variant="caption" tone="muted" style={styles.pointText}>
                      {point}
                    </LText>
                  </View>
                ))}
                </View>
              </View>
            </Enter>
          );
        })}

        {error ? (
          <LText variant="body" tone="danger" style={styles.error}>
            {error}
          </LText>
        ) : null}

        <LText variant="caption" tone="muted" style={styles.foot}>
          Whish confirms. Credits land automatically.
        </LText>

        <Enter delay={160}>
          <View style={styles.switchWrap}>
            <SwitchRoleControl currentRole="poster" />
          </View>
        </Enter>
      </ScrollView>
      </HideIosTabScrollFade>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  scrollFadeWrap: {
    flex: 1,
  },
  content: {
    padding: Lister.space.lg,
    paddingBottom: appleTabScrollInset,
    gap: 12,
  },
  center: { textAlign: "center" },
  title: {
    fontSize: 32,
    letterSpacing: -0.8,
    textAlign: "center",
    marginBottom: 6,
  },
  lede: {
    textAlign: "center",
    marginBottom: 8,
  },
  chips: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
  },
  card: {
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    padding: Lister.space.md,
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
  },
  cardPopular: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  aura: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    pointerEvents: "none",
  },
  orb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  orbStarter: {
    top: -90,
    left: -70,
    backgroundColor: "rgba(47,111,237,0.08)",
  },
  orbPopular: {
    top: -96,
    right: -64,
    backgroundColor: "rgba(47,111,237,0.12)",
  },
  orbBoost: {
    top: -88,
    left: -68,
    backgroundColor: "rgba(47,111,237,0.08)",
  },
  cardBody: {
    zIndex: 1,
    gap: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Lister.color.primary,
  },
  price: {
    fontSize: 36,
    letterSpacing: -0.8,
  },
  included: {
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  point: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pointText: { flex: 1 },
  receipt: {
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
    padding: Lister.space.md,
    gap: 4,
    marginBottom: 8,
  },
  receiptWait: { backgroundColor: Lister.color.warningSoft },
  receiptBad: { backgroundColor: Lister.color.dangerSoft },
  error: { marginTop: 4, textAlign: "center" },
  foot: { textAlign: "center", marginTop: 4 },
  switchWrap: {
    marginTop: 16,
    alignItems: "flex-start",
  },
});
