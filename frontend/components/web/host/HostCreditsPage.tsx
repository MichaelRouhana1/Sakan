import { useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CREDIT_BUNDLES, type BundleDisplay } from "@/constants/bundles";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useWhishCheckout } from "@/features/credits/useWhishCheckout";
import { useCredits } from "@/features/credits/useCredits";
import { formatUsdFromCents } from "@/lib/format";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { CreditBundleType, CreditTransaction } from "@/types/credits";
import {
  PopularBadge,
  PopularPackBeam,
  WhishPayButton,
} from "@/components/web/host/HostCreditsMetal";

const POPULAR: CreditBundleType = "bundle_5";
const web = Platform.OS === "web";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

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

function statusCopy(tx: CreditTransaction) {
  if (tx.status === "approved") return { title: "Credits added", tone: "ok" as const };
  if (tx.status === "rejected") {
    return { title: "Payment did not go through", tone: "bad" as const };
  }
  return { title: "Finish payment in Whish", tone: "wait" as const };
}

export function HostCreditsPage() {
  const params = useLocalSearchParams<{ ref?: string | string[] }>();
  const initialRef = firstParam(params.ref);
  const { buy, tx, error, isStarting, pendingBundle } =
    useWhishCheckout(initialRef);
  const credits = useCredits();
  const { user } = useAuthSession();
  const reduceMotion = useReducedMotion();

  const postCredits = credits.data?.postCredits ?? user?.postCredits ?? 0;
  const boostCredits = credits.data?.boostCredits ?? user?.boostCredits ?? 0;

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Credits</Text>
        <Text style={styles.title}>Choose a pack</Text>
        <Text style={styles.lede}>
          Your first live listing is free. Extra posts and 7-day boosts are
          paid. Whish confirms — credits land automatically.
        </Text>
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{postCredits}</Text>
            <Text style={styles.chipLabel}>post</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{boostCredits}</Text>
            <Text style={styles.chipLabel}>boost</Text>
          </View>
        </View>
      </View>

      {tx ? <Receipt tx={tx} /> : null}

      <View style={styles.grid}>
        {CREDIT_BUNDLES.map((item) => {
          const copy = packCopy(item);
          const popular = item.type === POPULAR;
          const paying = isStarting && pendingBundle === item.type;
          const card = (
            <Pressable
              accessibilityRole="none"
              style={({ hovered }) => [
                styles.card,
                styles.cardBeamed,
                popular && styles.cardPopular,
                hovered && styles.cardHover,
                !reduceMotion && styles.cardMotion,
              ]}
            >
              {item.type !== POPULAR ? <CardAura type={item.type} /> : null}
              <View style={styles.cardBody}>
                {popular ? (
                  <View style={styles.badgeWrap}>
                    <PopularBadge active={!reduceMotion} />
                  </View>
                ) : (
                  <View style={styles.badgeSpacer} />
                )}
                <Text style={styles.planName}>{copy.name}</Text>
                <Text style={styles.price}>
                  {formatUsdFromCents(item.amountUsd * 100)}
                </Text>
                <Text style={styles.blurb}>{copy.blurb}</Text>
                {popular ? (
                  <WhishPayButton
                    label={
                      paying
                        ? "Opening Whish…"
                        : `Pay ${formatUsdFromCents(item.amountUsd * 100)} with Whish`
                    }
                    disabled={isStarting}
                    onPress={() => buy(item.type)}
                    active={!reduceMotion}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isStarting}
                    onPress={() => buy(item.type)}
                    style={({ hovered, pressed, focused }) => [
                      styles.ctaGhost,
                      hovered && !isStarting && styles.ctaGhostHover,
                      pressed && !isStarting && styles.pressed,
                      isStarting && styles.ctaDisabled,
                      focused && styles.focus,
                    ]}
                  >
                    <Text style={styles.ctaGhostText}>
                      {paying
                        ? "Opening Whish…"
                        : `Pay ${formatUsdFromCents(item.amountUsd * 100)} with Whish`}
                    </Text>
                  </Pressable>
                )}
                <Text style={styles.featuresLabel}>Included</Text>
                <View style={styles.points}>
                  {copy.points.map((point) => (
                    <View key={point} style={styles.point}>
                      <Check
                        color={Skoun.color.primary}
                        size={14}
                        strokeWidth={2.2}
                      />
                      <Text style={styles.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          );

          if (!popular) {
            return (
              <View key={item.type} style={styles.packSlot}>
                {card}
              </View>
            );
          }

          return (
            <PopularPackBeam key={item.type} active={!reduceMotion}>
              {card}
            </PopularPackBeam>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.foot}>
        Whish confirms. Credits land automatically.
      </Text>
    </View>
  );
}

function CardAura({ type }: { type: CreditBundleType }) {
  return (
    <View style={styles.aura}>
      <View
        style={[
          styles.orb,
          type === "starter" && styles.orbStarter,
          type === "boost_pack" && styles.orbBoost,
        ]}
      />
    </View>
  );
}

function Receipt({ tx }: { tx: CreditTransaction }) {
  const copy = statusCopy(tx);
  return (
    <View
      style={[
        styles.receipt,
        copy.tone === "bad" && styles.receiptBad,
        copy.tone === "wait" && styles.receiptWait,
      ]}
    >
      <Text style={styles.receiptTitle}>{copy.title}</Text>
      <Text style={styles.receiptBody}>
        {formatUsdFromCents(tx.amountUsdCents)} · {tx.referenceId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    maxWidth: WEB_CONTENT_MAX,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingTop: 40,
    paddingBottom: 72,
    gap: 28,
    ...(web ? { boxSizing: "border-box" as const } : null),
  },
  hero: {
    alignItems: "center",
    gap: 10,
  },
  eyebrow: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: Skoun.color.primary,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: Skoun.color.ink,
    textAlign: "center",
  },
  lede: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    lineHeight: 22,
    color: Skoun.color.inkMuted,
    textAlign: "center",
    maxWidth: 520,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surface,
  },
  chipValue: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  chipLabel: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "stretch",
    justifyContent: "center",
  },
  card: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 380,
    minWidth: 260,
    padding: 24,
    paddingTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surface,
    gap: 10,
    overflow: "hidden",
    ...(web
      ? {
          position: "relative" as const,
          boxSizing: "border-box" as const,
        }
      : { position: "relative" }),
  },
  packSlot: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 380,
    minWidth: 260,
    alignSelf: "stretch",
  },
  cardPopular: {
    overflow: "visible",
    backgroundColor: Skoun.color.surfaceMuted,
  },
  cardBeamed: {
    flexGrow: 0,
    flexBasis: "auto",
    maxWidth: "100%",
    minWidth: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  aura: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0,
    pointerEvents: "none",
  },
  orb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  cardBody: {
    zIndex: 1,
    gap: 10,
  },
  orbStarter: {
    top: -90,
    left: -80,
    backgroundColor: "rgba(47,111,237,0.08)",
    ...(web
      ? {
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(47,111,237,0.14) 0%, rgba(47,111,237,0.05) 42%, rgba(47,111,237,0) 70%)",
          backgroundColor: "transparent",
        }
      : null),
  },
  orbBoost: {
    top: -88,
    left: -76,
    backgroundColor: "rgba(47,111,237,0.08)",
    ...(web
      ? {
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(47,111,237,0.12) 0%, rgba(47,111,237,0.04) 42%, rgba(47,111,237,0) 70%)",
          backgroundColor: "transparent",
        }
      : null),
  },
  cardMotion: {
    ...(web
      ? {
          transitionProperty: "border-color, box-shadow",
          transitionDuration: "160ms",
        }
      : null),
  },
  cardHover: {
    borderColor: Skoun.color.primary,
    ...(web ? { boxShadow: "0 10px 28px rgba(18,24,38,0.08)" } : null),
  },
  badgeWrap: {
    alignSelf: "flex-start",
  },
  badgeSpacer: {
    height: 22,
  },
  planName: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 18,
    color: Skoun.color.ink,
  },
  price: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    color: Skoun.color.ink,
  },
  blurb: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    lineHeight: 20,
    color: Skoun.color.inkMuted,
    minHeight: 40,
  },
  ctaGhost: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: Skoun.color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...(web
      ? {
          cursor: "pointer" as const,
          transitionProperty: "border-color, background-color",
          transitionDuration: "160ms",
        }
      : null),
  },
  ctaGhostHover: {
    borderColor: Skoun.color.primarySoft,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  ctaDisabled: {
    opacity: 0.55,
    ...(web ? { cursor: "default" as const } : null),
  },
  ctaGhostText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  featuresLabel: {
    marginTop: 12,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Skoun.color.inkFaint,
  },
  points: {
    gap: 8,
  },
  point: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pointText: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  error: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.danger,
    textAlign: "center",
  },
  foot: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
    textAlign: "center",
  },
  receipt: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: Skoun.color.surfaceMuted,
    gap: 2,
    alignSelf: "center",
    width: "100%",
    maxWidth: 640,
  },
  receiptWait: {
    backgroundColor: Skoun.color.warningSoft,
    borderColor: "rgba(180,83,9,0.22)",
  },
  receiptBad: {
    backgroundColor: Skoun.color.dangerSoft,
    borderColor: "rgba(180,35,24,0.22)",
  },
  receiptTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  receiptBody: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  focus: {
    ...(web
      ? {
          outlineWidth: 2,
          outlineColor: Skoun.color.primary,
          outlineOffset: 2,
        }
      : null),
  },
  pressed: {
    opacity: 0.92,
  },
});
