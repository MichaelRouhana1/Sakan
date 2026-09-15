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
import { TicketBackdrop, type TicketTear } from "@/components/campus/TicketBackdrop";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { categoryMeta } from "@/features/benefits/categories";
import {
  isCampusExclusive,
  type StudentBenefit,
} from "@/features/benefits/types";
import { benefitCompanyLogo } from "@/lib/benefitCompanyLogos";
import {
  TICKET_SHADOW,
  TICKET_SHADOW_COMPACT,
  ticketNativeShadow,
} from "@/lib/ticketMask";
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
/** Concave outer corners — must read clearly as inward bites. */
const CORNER = 28;
/** Stub column — wide enough for short badges on one line. */
const STUB_WIDTH = 132;
/** Neutral dashed perforation (slate-200 equivalent). */
const PERFORATION = "rgba(197, 205, 216, 0.95)";
const STACK_BELOW = 420;
const MAX_STAMP_CHARS = 8;
const IS_WEB = Platform.OS === "web";
/** Fallback stub height when the tear runs horizontally, until measured. */
const STUB_STACK_H = 76;
/** Stub tint, expressed as an opaque colour + alpha so SVG can draw it too. */
const STUB_TINT = "#F5F7FA";
const STUB_TINT_ALPHA = 0.92;

/** Where the perforation sits, in ticket coordinates. */
function ticketTear(
  stack: boolean,
  w: number,
  h: number,
  stubH: number,
): TicketTear {
  return stack
    ? { axis: "horizontal", at: h - (stubH || STUB_STACK_H) }
    : { axis: "vertical", at: w - STUB_WIDTH };
}

/**
 * SVG luminance mask — white keeps the ticket, black punches real holes.
 * More reliable than multi-layer radial maskComposite (which was only
 * applying the tear notches and leaving convex outer corners).
 */
function couponSvgMask(
  stack: boolean,
  w: number,
  h: number,
  stubH = 0,
): object {
  if (!IS_WEB || w < 8 || h < 8) return {};

  const cr = CORNER / 2;
  const nr = NOTCH / 2;
  const tear = ticketTear(stack, w, h, stubH);
  const tearX = stack ? 0 : Math.max(cr + nr, tear.at);
  const tearY = stack ? Math.max(cr + nr, tear.at) : 0;

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
  const compactShadow = width < 640;
  const stamp = stubStamp(benefit.title);
  const stampSize = stampFontSize(stamp);
  const logo = benefitCompanyLogo(benefit.companyName);
  const [hovered, setHovered] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [stubH, setStubH] = useState(0);
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
    <View
      style={[
        styles.shadowHost,
        IS_WEB &&
          (hovered
            ? styles.shadowWrapHover
            : compactShadow
              ? styles.shadowWrapMobile
              : styles.shadowWrapRest),
        IS_WEB && hovered && styles.shadowLiftHover,
      ]}
      {...(IS_WEB ? ({ className: "skoun-benefit-card-shadow" } as object) : null)}
    >
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
            couponSvgMask(stack, size.w, size.h, stubH) as object,
            pressed && (IS_WEB ? styles.ticketPressed : styles.ticketPressedNative),
            stack ? styles.ticketStack : styles.ticketRow,
          ]}
        >
        {/* Native: silhouette + stub tint + shadow drawn as one SVG */}
        {!IS_WEB ? (
          <TicketBackdrop
            w={size.w}
            h={size.h}
            corner={CORNER}
            notch={NOTCH}
            tear={ticketTear(stack, size.w, size.h, stubH)}
            fill={Skoun.color.surface}
            stubFill={STUB_TINT}
            stubOpacity={STUB_TINT_ALPHA}
          />
        ) : null}

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

        {/* Perforation rail — dashed tear; punches come from the mask / SVG */}
        <View
          style={stack ? styles.railHorizontal : styles.railVertical}
          pointerEvents="none"
          accessibilityElementsHidden
        >
          <View
            style={[
              styles.dashTrack,
              stack ? styles.dashTrackHorizontal : styles.dashTrackVertical,
            ]}
          />
        </View>

        {/* Stub — tinted ticket end with stamp badge */}
        <View
          style={[styles.stub, stack ? styles.stubStack : styles.stubRow, hovered && styles.stubHover]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h !== stubH) setStubH(h);
          }}
        >
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
        </Pressable>
      </Animated.View>
    </View>
  );
}

export const BenefitCard = memo(BenefitCardBase);

export function BenefitCardSkeleton() {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const stack = width < STACK_BELOW;
  const pulse = useRef(new Animated.Value(0.5)).current;
  const [size, setSize] = useState({ w: 0, h: 0 });

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
    <View
      style={[
        styles.shadowHost,
        IS_WEB && (width < 640 ? styles.shadowWrapMobile : styles.shadowWrapRest),
      ]}
      {...(IS_WEB ? ({ className: "skoun-benefit-card-shadow" } as object) : null)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
    <Animated.View
      style={[
        styles.animWrap,
        { opacity: pulse },
      ]}
    >
    <View
      style={[
        styles.ticket,
        couponSvgMask(stack, 420, stack ? 216 : 188) as object,
        stack ? styles.ticketStack : styles.ticketRow,
        styles.skeletonTicket,
      ]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w !== size.w || h !== size.h) setSize({ w, h });
      }}
    >
      {!IS_WEB ? (
        <TicketBackdrop
          w={size.w}
          h={size.h}
          corner={CORNER}
          notch={NOTCH}
          tear={ticketTear(stack, size.w, size.h, 0)}
          fill={Skoun.color.surface}
          stubFill={STUB_TINT}
          stubOpacity={STUB_TINT_ALPHA}
        />
      ) : null}
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
        <View
          style={[
            styles.dashTrack,
            stack ? styles.dashTrackHorizontal : styles.dashTrackVertical,
          ]}
        />
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
    </View>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowHost: {
    flex: 1,
    alignSelf: "stretch",
    overflow: "visible",
    ...(IS_WEB
      ? ({
          transitionProperty: "filter, transform",
          transitionDuration: "220ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : ticketNativeShadow()),
  },
  animWrap: {
    flex: 1,
    alignSelf: "stretch",
    overflow: "visible",
  },
  shadowWrapRest: {
    ...(IS_WEB
      ? ({
          filter: TICKET_SHADOW,
          WebkitFilter: TICKET_SHADOW,
        } as object)
      : null),
  },
  shadowWrapMobile: {
    ...(IS_WEB
      ? ({
          filter: TICKET_SHADOW_COMPACT,
          WebkitFilter: TICKET_SHADOW_COMPACT,
        } as object)
      : null),
  },
  shadowWrapHover: {
    ...(IS_WEB
      ? ({
          filter:
            "drop-shadow(0 8px 14px rgba(47, 111, 237, 0.22)) drop-shadow(0 22px 40px rgba(47, 111, 237, 0.34))",
          WebkitFilter:
            "drop-shadow(0 8px 14px rgba(47, 111, 237, 0.22)) drop-shadow(0 22px 40px rgba(47, 111, 237, 0.34))",
        } as object)
      : null),
  },
  shadowLiftHover: {
    ...(IS_WEB
      ? ({
          transform: "translateY(-4px)",
        } as object)
      : null),
  },
  ticket: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    // Web paints the surface on the box and masks it; native leaves the box
    // transparent so the SVG backdrop (silhouette + shadow) shows through.
    // Never box-shadow this on web — it draws a gray rect under the cutouts.
    backgroundColor: IS_WEB ? Skoun.color.surface : "transparent",
    overflow: "visible",
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
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
  ticketPressedNative: {
    opacity: 0.88,
  },

  body: {
    gap: 16,
    justifyContent: "space-between",
    backgroundColor: IS_WEB ? Skoun.color.surface : "transparent",
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
  stub: {
    // Native draws this tint inside the SVG so it stops at the cutouts.
    backgroundColor: IS_WEB
      ? `rgba(245, 247, 250, ${STUB_TINT_ALPHA})`
      : "transparent",
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