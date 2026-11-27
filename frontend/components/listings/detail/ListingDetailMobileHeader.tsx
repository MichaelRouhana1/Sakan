import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Studently } from "@/constants/theme";
import { studentlyShadow } from "@/lib/studentlyShadow";

export const MOBILE_DETAIL_HEADER_ROW_HEIGHT = 52;

type Props = {
  scrollY: Animated.Value;
  galleryHeight: number;
  saved: boolean;
  savePending?: boolean;
  isSolid: boolean;
  tabsPinned: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleSave: () => void;
  children?: ReactNode;
};

type HeaderIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  label: string;
  onPress: () => void;
  pillOpacity: Animated.AnimatedInterpolation<number>;
  testID?: string;
};

function HeaderIconButton({
  icon,
  iconSize = 21,
  label,
  onPress,
  pillOpacity,
  testID,
}: HeaderIconButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconSlot,
        pressed && styles.iconSlotPressed,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.pillBackdrop, { opacity: pillOpacity }]}
      />
      <Ionicons name={icon} size={iconSize} color={Studently.color.ink} />
    </Pressable>
  );
}

/**
 * Scroll-reactive mobile listing header.
 * Floats as translucent white circular pills over the hero gallery at scrollY = 0,
 * then cross-fades into a solid white sticky bar with a hairline divider as the
 * hero leaves the viewport. Any docked section tabs passed as `children` sit
 * flush underneath the bar without overlapping content or the status bar.
 */
export function ListingDetailMobileHeader({
  scrollY,
  galleryHeight,
  saved,
  savePending,
  isSolid,
  tabsPinned,
  onBack,
  onShare,
  onToggleSave,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + MOBILE_DETAIL_HEADER_ROW_HEIGHT;
  const fadeStart = Math.max(24, galleryHeight - headerHeight - 56);
  const fadeEnd = Math.max(fadeStart + 36, galleryHeight - headerHeight - 4);

  const solidOpacity = scrollY.interpolate({
    inputRange: [fadeStart, fadeEnd],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const pillOpacity = scrollY.interpolate({
    inputRange: [fadeStart, fadeEnd],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      testID="listing-detail-mobile-header"
      pointerEvents="box-none"
      style={styles.outer}
    >
      <View
        pointerEvents={isSolid ? "auto" : "box-none"}
        style={[styles.barWrap, { paddingTop: insets.top }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.solidBackdrop,
            !tabsPinned && styles.solidBorder,
            { opacity: solidOpacity },
          ]}
        />

        <View style={styles.row} pointerEvents="box-none">
          <HeaderIconButton
            testID="listing-header-back"
            icon="arrow-back"
            iconSize={22}
            label="Back"
            onPress={onBack}
            pillOpacity={pillOpacity}
          />

          <View style={styles.rightActions} pointerEvents="box-none">
            <HeaderIconButton
              testID="listing-header-share"
              icon="share-outline"
              iconSize={21}
              label="Share listing"
              onPress={onShare}
              pillOpacity={pillOpacity}
            />

            <View style={styles.iconSlot}>
              <Animated.View
                pointerEvents="none"
                style={[styles.pillBackdrop, { opacity: pillOpacity }]}
              />
              <FavoriteButton
                saved={saved}
                disabled={savePending}
                onPress={onToggleSave}
                iconSize={21}
                idleColor={Studently.color.ink}
                accessibilityLabel={
                  saved ? "Remove from shortlist" : "Save to shortlist"
                }
                style={styles.favoriteInner}
              />
            </View>
          </View>
        </View>
      </View>

      {children}
    </View>
  );
}

const PILL_SHADOW = studentlyShadow({
  color: "#1A1A1A",
  y: 2,
  blur: 8,
  opacity: 0.12,
  elevation: 3,
});

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  barWrap: {
    width: "100%",
  },
  solidBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Studently.color.surface,
  },
  solidBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studently.color.border,
  },
  row: {
    height: MOBILE_DETAIL_HEADER_ROW_HEIGHT,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconSlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  iconSlotPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  pillBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(26,26,26,0.1)",
    ...PILL_SHADOW,
  },
  favoriteInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
});
