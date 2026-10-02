import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useId, useState, type ReactNode } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Skoun } from "@/constants/theme";

// Desktop's DOM/canvas effects cannot render in native. Keep the same soft
// monochrome pulse and chrome treatment with native gradients and UI-thread motion.
function useEffectPhase(active: boolean, duration = 4600) {
  const phase = useSharedValue(0);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    phase.value = 0;
    if (active && foreground) {
      phase.value = withRepeat(
        withTiming(Math.PI * 2, { duration, easing: Easing.linear }),
        -1,
      );
    }
    return () => cancelAnimation(phase);
  }, [active, duration, foreground, phase]);
  return phase;
}

function Glow({ phase, corner, outside }: {
  phase: SharedValue<number>;
  corner: number;
  outside: boolean;
}) {
  const id = `credit-glow-${useId().replace(/:/g, "")}`;
  const motion = useAnimatedStyle(() => {
    const wave = Math.sin(phase.value + corner * 1.7);
    return {
      opacity: 0.65 + wave * 0.25,
      transform: [
        { translateX: wave * (outside ? 19 : 40) },
        { translateY: Math.cos(phase.value + corner) * 8 },
        { scaleX: 1 + wave * 0.28 },
      ],
    };
  }, [phase, corner, outside]);
  return (
    <Animated.View style={[
      styles.glow,
      corner < 2 ? { top: -40 } : { bottom: -40 },
      corner % 2 === 0 ? { left: -40 } : { right: -40 },
      motion,
    ]}>
      <Svg width={180} height={80}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#343A44" stopOpacity={outside ? 0.55 : 0.4} />
            <Stop offset="0.32" stopColor="#555D69" stopOpacity={0.2} />
            <Stop offset="1" stopColor="#555D69" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={180} height={80} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function Pulse({ active, outside = false }: { active: boolean; outside?: boolean }) {
  const phase = useEffectPhase(active, outside ? 3700 : 4600);
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.pulse, !outside && styles.pulseInner]}
    >
      {[0, 1, 2, 3].map((corner) => (
        <Glow key={corner} phase={phase} corner={corner} outside={outside} />
      ))}
    </View>
  );
}

export function PopularPackBeam({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <View style={styles.frame}>
      {children}
      <Pulse active={active} />
    </View>
  );
}

export function PopularBadge({ active = true }: { active?: boolean }) {
  const phase = useEffectPhase(active, 9200);
  const sheen = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(phase.value) * 36 }, { rotate: "-22deg" }],
    opacity: 0.6 + Math.cos(phase.value) * 0.2,
  }), [phase]);
  return (
    <View style={styles.badge}>
      <LinearGradient
        pointerEvents="none"
        colors={["#FCFDFE", "#9DAAB7", "#E6EAF0", "#FFFFFF", "#BDC7D3"]}
        locations={[0, 0.23, 0.48, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.badgeSheen, sheen]}>
        <LinearGradient
          colors={["#B5CBDE00", "#DCE8F6", "#FFFFFF", "#F6DFC9", "#B5CBDE00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Text style={styles.badgeText}>Popular</Text>
    </View>
  );
}

export function WhishPayButton({
  label,
  disabled,
  onPress,
  active = true,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <View style={[styles.ctaWrap, disabled && styles.ctaDisabled]}>
      <Pulse active={active && !disabled} outside />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.cta, pressed && !disabled && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    flexGrow: 0,
    flexBasis: "auto",
    alignSelf: "stretch",
  },
  pulse: {
    ...StyleSheet.absoluteFill,
    overflow: "visible",
  },
  pulseInner: {
    borderRadius: 12,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 180,
    height: 80,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  badgeSheen: {
    position: "absolute",
    top: -12,
    bottom: -12,
    left: "25%",
    width: 36,
  },
  badgeText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    lineHeight: 13.2,
    letterSpacing: 0.4,
    color: Skoun.color.ink,
  },
  ctaWrap: {
    marginTop: 8,
    position: "relative",
    overflow: "visible",
  },
  cta: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  ctaPressed: {
    opacity: 0.92,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
  },
});
