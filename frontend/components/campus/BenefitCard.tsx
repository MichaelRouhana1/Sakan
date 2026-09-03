import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { categoryMeta } from "@/features/benefits/categories";
import { isCampusExclusive, type StudentBenefit } from "@/features/benefits/types";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  benefit: StudentBenefit;
  /** Position in the grid, for the entrance stagger. */
  index: number;
  onPress: (id: string) => void;
};

/** Cap the stagger so the last card in a long grid isn't left waiting. */
const MAX_STAGGER_STEPS = 8;

function BenefitCardBase({ benefit, index, onPress }: Props) {
  const reduced = useReducedMotion();
  const meta = categoryMeta(benefit.category);
  const exclusive = isCampusExclusive(benefit);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      anim.setValue(1);
      return;
    }
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: Skoun.motion.enterMs,
      delay: Math.min(index, MAX_STAGGER_STEPS) * Skoun.motion.staggerMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [anim, index, reduced]);

  const scopeLabel = benefit.isGlobal ? "Global" : "Lebanon";

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={() => onPress(benefit.id)}
        accessibilityRole="link"
        accessibilityLabel={`${benefit.companyName} — ${benefit.title}`}
        accessibilityHint="Opens the offer details"
        style={({ hovered, pressed }) => [
          styles.card,
          exclusive && styles.cardExclusive,
          hovered && styles.cardHover,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.top}>
          <View style={[styles.iconWell, { backgroundColor: meta.tint }]}>
            <Ionicons name={meta.icon} size={20} color={meta.accent} />
          </View>
          <View style={styles.topCopy}>
            <LText variant="label" style={[styles.company, { color: meta.accent }]} numberOfLines={1}>
              {benefit.companyName}
            </LText>
            <LText variant="subtitle" style={styles.title} numberOfLines={2}>
              {benefit.title}
            </LText>
          </View>
        </View>

        <LText variant="body" tone="muted" style={styles.body} numberOfLines={3}>
          {benefit.description}
        </LText>

        <View style={styles.metaRow}>
          {exclusive ? (
            <View style={[styles.badge, styles.badgeExclusive]}>
              <Ionicons name="school-outline" size={12} color={Skoun.color.primary} />
              <LText variant="caption" style={styles.badgeTextExclusive}>
                {benefit.applicableUniversities.join(" · ")}
              </LText>
            </View>
          ) : null}
          <View style={styles.badge}>
            <Ionicons
              name={benefit.isGlobal ? "globe-outline" : "location-outline"}
              size={12}
              color={Skoun.color.inkMuted}
            />
            <LText variant="caption" style={styles.badgeText}>
              {benefit.locationOrArea ?? scopeLabel}
            </LText>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Ionicons
              name={benefit.redemptionLocked ? "lock-closed-outline" : "ticket-outline"}
              size={13}
              color={benefit.redemptionLocked ? Skoun.color.inkMuted : Skoun.color.primary}
            />
            <LText
              variant="caption"
              style={[
                styles.footerText,
                !benefit.redemptionLocked && styles.footerTextReady,
              ]}
            >
              {benefit.redemptionLocked ? "Sign in to unlock" : "Ready to redeem"}
            </LText>
          </View>
          <Ionicons name="arrow-forward" size={15} color={Skoun.color.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const BenefitCard = memo(BenefitCardBase);

/** Mirrors the card's frame so the grid doesn't reflow when data lands. */
export function BenefitCardSkeleton() {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <Animated.View
      style={[styles.card, styles.skeletonCard, { opacity: pulse }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.top}>
        <View style={[styles.iconWell, styles.skeletonBlock]} />
        <View style={styles.topCopy}>
          <View style={[styles.skeletonLine, styles.skeletonBlock, { width: "40%" }]} />
          <View style={[styles.skeletonLine, styles.skeletonBlock, { width: "75%", height: 16 }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, styles.skeletonBlock, { width: "100%" }]} />
      <View style={[styles.skeletonLine, styles.skeletonBlock, { width: "90%" }]} />
      <View style={[styles.skeletonLine, styles.skeletonBlock, { width: "55%" }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 232,
    padding: 18,
    gap: 12,
    borderRadius: Skoun.radius.lg,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "border-color, box-shadow, background-color",
          transitionDuration: "200ms",
          transitionTimingFunction: "ease-out",
          boxShadow: "0 1px 2px rgba(18, 24, 38, 0.04)",
        } as object)
      : null),
  },
  // Campus-exclusive offers exist nowhere else, so they carry a heavier frame.
  cardExclusive: {
    borderColor: "#A8C0EC",
    backgroundColor: "#FBFCFE",
  },
  cardHover: {
    borderColor: Skoun.color.primary,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 12px 28px rgba(47, 111, 237, 0.14)" } as object)
      : null),
  },
  cardPressed: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  company: {
    letterSpacing: 0.5,
  },
  title: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyBold,
  },
  body: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  badgeExclusive: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: "#C5D6F5",
  },
  badgeText: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  badgeTextExclusive: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF4",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  footerTextReady: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  skeletonCard: {
    justifyContent: "flex-start",
    gap: 10,
  },
  skeletonBlock: {
    backgroundColor: Skoun.color.bgWash,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
});
