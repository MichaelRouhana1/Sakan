import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Skoun } from "@/constants/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

export type SkounMapPinVariant = "listing" | "campus";
export type SkounMapPinAccent = "default" | "danger";

type Props = {
  variant?: SkounMapPinVariant;
  /** Animate drop when true (skipped under reduced motion). Drop runs once on mount only. */
  dropped?: boolean;
  selected?: boolean;
  /** Color accent — danger = red selected pin on the browse map. */
  accent?: SkounMapPinAccent;
};

const LISTING = {
  fill: "#4FB79F",
  deep: "#02675C",
  highlight: "rgba(255,255,255,0.28)",
  shade: "rgba(2,103,92,0.35)",
};

const DANGER = {
  fill: "#C23B2E",
  deep: "#8E241A",
  highlight: "rgba(255,255,255,0.28)",
  shade: "rgba(142,36,26,0.35)",
};

/** Listing teardrop box. */
const PIN_W = 44;
const PIN_H = 52;
const HEAD = 30;
const CUTOUT = 10;

/** Campus badge — larger round brass mark, not a jade teardrop twin. */
const CAMPUS_W = 48;
const CAMPUS_H = 56;
const CAMPUS_DISC = 38;

/**
 * Listing = jade teardrop with cutout.
 * Campus = brass disc + school glyph + short stem (unmistakable vs $ pins).
 */
export function SkounMapPin({
  variant = "listing",
  dropped = true,
  selected = false,
  accent = "default",
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const didMountDrop = useRef(false);
  const isCampus = variant === "campus";
  const palette =
    isCampus
      ? null
      : accent === "danger"
        ? DANGER
        : LISTING;
  const selectedScale = selected ? 1.14 : 1;

  useEffect(() => {
    if (didMountDrop.current) return;
    didMountDrop.current = true;

    if (reduceMotion || !dropped) {
      scale.setValue(selectedScale);
      return;
    }

    scale.setValue(0.72);
    Animated.spring(scale, {
      toValue: selectedScale,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only drop
  }, []);

  useEffect(() => {
    if (!didMountDrop.current) return;

    if (reduceMotion) {
      scale.setValue(selectedScale);
      return;
    }

    Animated.spring(scale, {
      toValue: selectedScale,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [selectedScale, reduceMotion, scale]);

  if (isCampus) {
    return (
      <View
        style={styles.campusSlot}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[styles.campusWrap, { transform: [{ scale }] }]}
        >
          <View style={styles.campusRing}>
            <View style={styles.campusDisc}>
              <Ionicons
                name="school"
                size={18}
                color={Skoun.color.surface}
              />
            </View>
          </View>
          <View style={styles.campusStem} />
          <View style={styles.campusBase} />
          <View style={styles.groundShadow} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={styles.pinSlot}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.selectRing,
          {
            opacity: selected ? 1 : 0,
            borderColor: Skoun.color.brass,
          },
        ]}
      />
      <Animated.View style={[styles.pinWrap, { transform: [{ scale }] }]}>
        <View style={[styles.head, { backgroundColor: palette!.fill }]}>
          <View
            style={[styles.headShade, { backgroundColor: palette!.shade }]}
          />
          <View
            style={[
              styles.headHighlight,
              { backgroundColor: palette!.highlight },
            ]}
          />
          <View style={styles.cutout} />
        </View>

        <View style={styles.tipWrap}>
          <View
            style={[
              styles.tip,
              {
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: palette!.deep,
              },
            ]}
          />
          <View
            style={[
              styles.tipFront,
              {
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: palette!.fill,
              },
            ]}
          />
        </View>

        <View style={styles.groundShadow} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinSlot: {
    width: PIN_W,
    height: PIN_H,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  selectRing: {
    position: "absolute",
    top: 0,
    width: HEAD + 10,
    height: HEAD + 10,
    borderRadius: (HEAD + 10) / 2,
    borderWidth: 2.5,
    backgroundColor: "transparent",
    zIndex: 0,
  },
  pinWrap: {
    alignItems: "center",
    width: PIN_W,
    justifyContent: "flex-end",
  },
  head: {
    width: HEAD,
    height: HEAD,
    borderRadius: HEAD / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 2,
    shadowColor: "#14241E",
    shadowOpacity: 0.28,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  headShade: {
    position: "absolute",
    right: 0,
    top: 4,
    bottom: 2,
    width: "48%",
    borderTopRightRadius: HEAD / 2,
    borderBottomRightRadius: HEAD / 2,
  },
  headHighlight: {
    position: "absolute",
    top: 3,
    left: 4,
    width: 11,
    height: 8,
    borderRadius: 6,
  },
  cutout: {
    width: CUTOUT,
    height: CUTOUT,
    borderRadius: CUTOUT / 2,
    backgroundColor: "#FFFFFF",
    zIndex: 3,
  },
  tipWrap: {
    marginTop: -6,
    alignItems: "center",
    zIndex: 1,
    height: 16,
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 16,
    position: "absolute",
    top: 1,
  },
  tipFront: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 13,
  },
  groundShadow: {
    width: 12,
    height: 4,
    borderRadius: 6,
    backgroundColor: "rgba(20,36,30,0.22)",
    marginTop: 1,
  },
  campusSlot: {
    width: CAMPUS_W,
    height: CAMPUS_H,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  campusWrap: {
    alignItems: "center",
    width: CAMPUS_W,
  },
  campusRing: {
    width: CAMPUS_DISC + 6,
    height: CAMPUS_DISC + 6,
    borderRadius: (CAMPUS_DISC + 6) / 2,
    borderWidth: 2,
    borderColor: Skoun.color.ink,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.brassSoft,
    zIndex: 2,
  },
  campusDisc: {
    width: CAMPUS_DISC,
    height: CAMPUS_DISC,
    borderRadius: CAMPUS_DISC / 2,
    backgroundColor: Skoun.color.brass,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#14241E",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  campusStem: {
    width: 4,
    height: 10,
    marginTop: -1,
    backgroundColor: Skoun.color.ink,
    borderRadius: 2,
    zIndex: 1,
  },
  campusBase: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: Skoun.color.ink,
    marginTop: -1,
  },
});

/** Exported for map anchor math (campus badge). */
export const SKOUN_CAMPUS_PIN = {
  width: CAMPUS_W,
  height: CAMPUS_H,
  /** Vertical center of the brass disc within the pin slot. */
  headCenterY: (CAMPUS_DISC + 6) / 2,
} as const;
