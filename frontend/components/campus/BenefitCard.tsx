import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { categoryMeta } from "@/features/benefits/categories";
import {
  isCampusExclusive,
  type StudentBenefit,
} from "@/features/benefits/types";
import { benefitCompanyLogo } from "@/lib/benefitCompanyLogos";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  benefit: StudentBenefit;
  /** Position in the grid, for the entrance stagger. */
  index: number;
  onPress: (id: string) => void;
};

const MAX_STAGGER_STEPS = 8;
/**
 * 24px tear punch along the perforation.
 */
const NOTCH = 24;
const NOTCH_OFFSET = -(NOTCH / 2);
/** Concave outer corners — must read clearly as inward bites. */
const CORNER = 28;
const CORNER_OFFSET = -(CORNER / 2);
/** Stub column — wide enough for short badges on one line. */
const STUB_WIDTH = 132;
/** Neutral dashed perforation (slate-200 equivalent). */
const PERFORATION = "rgba(197, 205, 216, 0.95)";
const STACK_BELOW = 420;
const MAX_STAMP_CHARS = 8;
const IS_WEB = Platform.OS === "web";
/** Approximate stub height when the tear runs horizontally (narrow screens). */
const STUB_STACK_H = 76;
/** Native-only fill for painted bites — matches CampusShell canvas. */
const PAGE_BG = Skoun.color.bg;

/**
 * SVG luminance mask — white keeps the ticket, black punches real holes.
 * More reliable than multi-layer radial maskComposite (which was only
 * applying the tear notches and leaving convex outer corners).
 */
function couponSvgMask(
  stack: boolean,
  w: number,
  h: number,
): object {
  if (!IS_WEB || w < 8 || h < 8) return {};

  const cr = CORNER / 2;
  const nr = NOTCH / 2;
  const tearX = stack ? 0 : Math.max(cr + nr, w - STUB_WIDTH);
  const tearY = stack ? Math.max(cr + nr, h - STUB_STACK_H) : 0;

  const cutouts = stack
    ? `<circle cx="0" cy="${tearY}" r="${nr}" fill="#000"/>
       <circle cx="${w}" cy="${tearY}" r="${nr}" fill="#000"/>`
    : `<circle cx="${tearX}" cy="0" r="${nr}" fill="#000"/>
       <circle cx="${tearX}" cy="${h}" r="${nr}" fill="#000"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
    `<rect width="${w}" height="${h}" fill="#fff"/>` +
    `<circle cx="0" cy="0" r="${cr}" fill="#000"/>` +
    `<circle cx="${w}" cy="0" r="${cr}" fill="#000"/>` +
    `<circle cx="0" cy="${h}" r="${cr}" fill="#000"/>` +
    `<circle cx="${w}" cy="${h}" r="${cr}" fill="#000"/>` +
    cutouts +
    `</svg>`;

  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskMode: "luminance",
  };
}

/**
 * Short voucher badge only — FREE, 20% OFF, $5/mo, DEAL.
 * Never returns long words that wrap mid-token in the stub.
 */
export function stubStamp(title: string): string {
  const t = title.trim();

  const pct = t.match(/~?(\d+)\s*%\s*off/i);
  if (pct) {
    const full = `${pct[1]}% OFF`;
    return full.length <= MAX_STAMP_CHARS ? full : `${pct[1]}%`;
  }

  if (/\bfree\b/i.test(t)) return "FREE";

  const perMonth = t.match(
    /\$(\d+(?:\.\d+)?)\s*(?:\/|,|\s).{0,24}(?:month|mo\b|30\s*days|prepaid)/i,
  );
  if (perMonth) {
    const stamp = `$${perMonth[1]}/mo`;
    return stamp.length <= MAX_STAMP_CHARS ? stamp : `$${perMonth[1]}`;
  }

  const fromPrice = t.match(/from\s*\$(\d+(?:\.\d+)?)/i);
  if (fromPrice) {
    const stamp = `$${fromPrice[1]}/mo`;
    return stamp.length <= MAX_STAMP_CHARS ? stamp : `$${fromPrice[1]}`;
  }

  const dollars = t.match(/\$(\d+(?:\.\d+)?)/);
  if (dollars) {
    const stamp = `$${dollars[1]}`;
    if (stamp.length <= MAX_STAMP_CHARS) return stamp;
  }

  if (/promo|privil[eè]ge|partner/i.test(t)) return "PROMO";
  if (/special|exclusive/i.test(t)) return "SPECIAL";

  return "DEAL";
}

function stampFontSize(stamp: string): number {
  if (stamp.length <= 4) return 18;
  if (stamp.length <= 6) return 15;
  return 14;
}

function BenefitCardBase({ benefit, index, onPress }: Props) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const meta = categoryMeta(benefit.category);
  const exclusive = isCampusExclusive(benefit);
  const stack = width < STACK_BELOW;
  const stamp = stubStamp(benefit.title);
  const stampSize = stampFontSize(stamp);
  const logo = benefitCompanyLogo(benefit.companyName);
  const [hovered, setHovered] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
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

  const eligibilityLabel = exclusive
    ? benefit.applicableUniversities.join(" · ")
    : benefit.isGlobal
      ? "Any university"
      : "Lebanon students";

  return (
    <Animated.View
      style={[
        styles.animWrap,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Drop-shadow lives outside the masked ticket so it follows the cutouts. */}
      <View
        style={[
          styles.shadowWrap,
          IS_WEB && (hovered ? styles.shadowWrapHover : styles.shadowWrapRest),
        ]}
      >
        <Pressable
          onPress={() => onPress(benefit.id)}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (w !== size.w || h !== size.h) setSize({ w, h });
          }}
          accessibilityRole="link"
          accessibilityLabel={`${benefit.companyName} — ${benefit.title}`}
          accessibilityHint="Opens the offer details"
          style={({ pressed }) => [
            styles.ticket,
            couponSvgMask(stack, size.w, size.h) as object,
            pressed && styles.ticketPressed,
            stack ? styles.ticketStack : styles.ticketRow,
          ]}
        >
        {/* Main body */}
        <View style={[styles.body, stack ? styles.bodyStack : styles.bodyRow]}>
          <View style={styles.top}>
            <View
              style={[
                styles.iconWell,
                logo ? styles.iconWellLogo : { backgroundColor: meta.tint },
              ]}
            >
              {logo ? (
                <Image
                  source={logo}
                  style={styles.logoImg}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Ionicons name={meta.icon} size={22} color={meta.accent} />
              )}
            </View>
            <View style={styles.topCopy}>
              <LText
                variant="label"
                style={[styles.company, { color: meta.accent }]}
                numberOfLines={1}
              >
                {benefit.companyName}
              </LText>
              <LText variant="subtitle" style={styles.title} numberOfLines={2}>
                {benefit.title}
              </LText>
            </View>
          </View>

          <View style={[styles.chip, exclusive && styles.chipExclusive]}>
            <Ionicons
              name={exclusive ? "school-outline" : "checkmark-circle-outline"}
              size={12}
              color={exclusive ? Skoun.color.primary : Skoun.color.inkMuted}
            />
            <LText
              variant="caption"
              style={[styles.chipText, exclusive && styles.chipTextExclusive]}
              numberOfLines={1}
            >
              {eligibilityLabel}
            </LText>
          </View>
        </View>

        {/* Perforation rail — dashed tear; native also paints PAGE_BG punches */}
        <View
          style={stack ? styles.railHorizontal : styles.railVertical}
          pointerEvents="none"
          accessibilityElementsHidden
        >
          {!IS_WEB ? (
            <View
              style={[styles.notch, stack ? styles.notchLeft : styles.notchTop]}
            />
          ) : null}
          <View
            style={[
              styles.dashTrack,
              stack ? styles.dashTrackHorizontal : styles.dashTrackVertical,
            ]}
          />
          {!IS_WEB ? (
            <View
              style={[
                styles.notch,
                stack ? styles.notchRight : styles.notchBottom,
              ]}
            />
          ) : null}
        </View>

        {/* Stub — tinted ticket end with stamp badge */}
        <View style={[styles.stub, stack ? styles.stubStack : styles.stubRow, hovered && styles.stubHover]}>
          <View style={[styles.stampBadge, hovered && styles.stampBadgeHover]}>
            <LText
              style={[
                styles.stamp,
                { fontSize: stampSize, lineHeight: stampSize + 3 },
              ]}
              numberOfLines={1}
            >
              {stamp}
            </LText>
          </View>
          <View style={styles.stubCta}>
            <LText
              style={[styles.stubCtaLabel, hovered && styles.stubCtaLabelHover]}
            >
              {benefit.redemptionLocked ? "Unlock" : "Redeem"}
            </LText>
            <Ionicons
              name="arrow-forward"
              size={11}
              color={hovered ? Skoun.color.primary : Skoun.color.inkMuted}
            />
          </View>
        </View>

        {/* Native fallback: painted bites (web uses CSS mask instead) */}
        {!IS_WEB ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            style={styles.cornerLayer}
          >
            <View style={[styles.cornerBite, styles.cornerTL]} />
            <View style={[styles.cornerBite, styles.cornerTR]} />
            <View style={[styles.cornerBite, styles.cornerBL]} />
            <View style={[styles.cornerBite, styles.cornerBR]} />
          </View>
        ) : null}
        </Pressable>
      </View>
    </Animated.View>
  );
}

export const BenefitCard = memo(BenefitCardBase);

export function BenefitCardSkeleton() {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const stack = width < STACK_BELOW;
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
      style={[
        styles.ticket,
        couponSvgMask(stack, 420, stack ? 216 : 188) as object,
        stack ? styles.ticketStack : styles.ticketRow,
        styles.skeletonTicket,
        { opacity: pulse },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.body, stack ? styles.bodyStack : styles.bodyRow]}>
        <View style={styles.top}>
          <View style={[styles.iconWell, styles.skeletonBlock]} />
          <View style={styles.topCopy}>
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonBlock,
                { width: "36%" },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonBlock,
                { width: "88%", height: 16 },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonBlock,
                { width: "62%", height: 16 },
              ]}
            />
          </View>
        </View>
        <View
          style={[
            styles.skeletonLine,
            styles.skeletonBlock,
            { width: "42%", height: 22, borderRadius: 999 },
          ]}
        />
      </View>
      <View style={stack ? styles.railHorizontal : styles.railVertical}>
        {!IS_WEB ? (
          <View
            style={[styles.notch, stack ? styles.notchLeft : styles.notchTop]}
          />
        ) : null}
        <View
          style={[
            styles.dashTrack,
            stack ? styles.dashTrackHorizontal : styles.dashTrackVertical,
          ]}
        />
        {!IS_WEB ? (
          <View
            style={[
              styles.notch,
              stack ? styles.notchRight : styles.notchBottom,
            ]}
          />
        ) : null}
      </View>
      <View style={[styles.stub, stack ? styles.stubStack : styles.stubRow]}>
        <View style={[styles.stampBadge, styles.skeletonStamp]} />
        <View
          style={[
            styles.skeletonLine,
            styles.skeletonBlock,
            { width: 52, height: 10 },
          ]}
        />
      </View>
      {!IS_WEB ? (
        <View pointerEvents="none" style={styles.cornerLayer}>
          <View style={[styles.cornerBite, styles.cornerTL]} />
          <View style={[styles.cornerBite, styles.cornerTR]} />
          <View style={[styles.cornerBite, styles.cornerBL]} />
          <View style={[styles.cornerBite, styles.cornerBR]} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animWrap: {
    flex: 1,
    alignSelf: "stretch",
  },
  shadowWrap: {
    flex: 1,
    ...(IS_WEB
      ? ({
          transitionProperty: "filter, transform",
          transitionDuration: "220ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  shadowWrapRest: {
    ...(IS_WEB
      ? ({
          filter:
            "drop-shadow(0 4px 8px rgba(18, 24, 38, 0.1)) drop-shadow(0 12px 24px rgba(18, 24, 38, 0.16))",
        } as object)
      : null),
  },
  shadowWrapHover: {
    ...(IS_WEB
      ? ({
          filter:
            "drop-shadow(0 8px 14px rgba(47, 111, 237, 0.22)) drop-shadow(0 22px 40px rgba(47, 111, 237, 0.34))",
          transform: "translateY(-4px)",
        } as object)
      : null),
  },
  ticket: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: Skoun.color.surface,
    // Web: mask punches real holes — do not use box-shadow here (it draws a
    // gray rectangle under the cutouts). Native keeps overflow for painted bites.
    overflow: IS_WEB ? "visible" : "hidden",
    ...(IS_WEB
      ? ({ cursor: "pointer" } as object)
      : {
          shadowColor: "#121826",
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }),
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "stretch",
    height: 200,
  },
  ticketStack: {
    flexDirection: "column",
    alignItems: "stretch",
    height: 228,
  },
  ticketPressed: {
    backgroundColor: Skoun.color.surfaceMuted,
  },

  body: {
    gap: 16,
    justifyContent: "space-between",
    backgroundColor: Skoun.color.surface,
  },
  bodyRow: {
    flex: 1,
    minWidth: 0,
    paddingTop: 24,
    paddingBottom: 22,
    paddingLeft: 24,
    paddingRight: 18,
  },
  bodyStack: {
    width: "100%",
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconWell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWellLogo: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  logoImg: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  company: {
    letterSpacing: 0.5,
  },
  title: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    lineHeight: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    maxWidth: "100%",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  chipExclusive: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: "#C5D6F5",
  },
  chipText: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
    flexShrink: 1,
  },
  chipTextExclusive: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },

  railVertical: {
    width: 0,
    position: "relative",
    alignSelf: "stretch",
    zIndex: 2,
  },
  railHorizontal: {
    height: 0,
    position: "relative",
    alignSelf: "stretch",
    zIndex: 2,
  },
  dashTrack: {
    position: "absolute",
    borderColor: PERFORATION,
  },
  dashTrackVertical: {
    top: NOTCH / 2,
    bottom: NOTCH / 2,
    left: -1,
    borderLeftWidth: 2,
    borderStyle: "dashed",
  },
  dashTrackHorizontal: {
    left: NOTCH / 2,
    right: NOTCH / 2,
    top: -1,
    borderTopWidth: 2,
    borderStyle: "dashed",
  },
  notch: {
    position: "absolute",
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: PAGE_BG,
    zIndex: 3,
  },
  notchTop: {
    top: NOTCH_OFFSET,
    left: NOTCH_OFFSET,
  },
  notchBottom: {
    bottom: NOTCH_OFFSET,
    left: NOTCH_OFFSET,
  },
  notchLeft: {
    left: NOTCH_OFFSET,
    top: NOTCH_OFFSET,
  },
  notchRight: {
    right: NOTCH_OFFSET,
    top: NOTCH_OFFSET,
  },

  cornerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  cornerBite: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderRadius: CORNER / 2,
    backgroundColor: PAGE_BG,
  },
  cornerTL: {
    top: CORNER_OFFSET,
    left: CORNER_OFFSET,
  },
  cornerTR: {
    top: CORNER_OFFSET,
    right: CORNER_OFFSET,
  },
  cornerBL: {
    bottom: CORNER_OFFSET,
    left: CORNER_OFFSET,
  },
  cornerBR: {
    bottom: CORNER_OFFSET,
    right: CORNER_OFFSET,
  },

  stub: {
    backgroundColor: "rgba(245, 247, 250, 0.92)",
    gap: 14,
    flexShrink: 0,
    ...(IS_WEB
      ? ({
          transitionProperty: "background-color",
          transitionDuration: "220ms",
        } as object)
      : null),
  },
  stubHover: {
    backgroundColor: "rgba(47, 111, 237, 0.16)",
  },
  stubRow: {
    width: STUB_WIDTH,
    minWidth: STUB_WIDTH,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stubStack: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  stampBadge: {
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(47, 111, 237, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(47, 111, 237, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    ...(IS_WEB
      ? ({
          transitionProperty: "background-color, border-color",
          transitionDuration: "220ms",
        } as object)
      : null),
  },
  stampBadgeHover: {
    backgroundColor: "rgba(47, 111, 237, 0.22)",
    borderColor: "rgba(47, 111, 237, 0.42)",
  },
  stamp: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodyBold,
    letterSpacing: -0.2,
    textAlign: "center",
    ...(Platform.OS === "web"
      ? ({
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "clip",
        } as object)
      : null),
  },
  stubCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  stubCtaLabel: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    ...(Platform.OS === "web"
      ? ({
          transitionProperty: "color",
          transitionDuration: "180ms",
        } as object)
      : null),
  },
  stubCtaLabelHover: {
    color: Skoun.color.primary,
  },

  skeletonTicket: {},
  skeletonStamp: {
    width: 72,
    height: 30,
    backgroundColor: Skoun.color.bgWash,
    borderColor: "transparent",
  },
  skeletonBlock: {
    backgroundColor: Skoun.color.bgWash,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
});