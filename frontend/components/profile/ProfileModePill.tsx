import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";
import { Studently } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { openCreateListing } from "@/features/auth/useEnsureSession";
import { useHostingNavState } from "@/features/listings/useHostingNavState";
import { studentlyShadow } from "@/lib/studentlyShadow";

export type ProfileMode = "renter" | "host";

type Props = {
  mode: ProfileMode;
  onRequireAuth?: () => void;
  /** Pin to viewport bottom on mobile web where the document scrolls. */
  webFixed?: boolean;
};

function hapticTap() {
  if (Platform.OS !== "web") {
    void Haptics.selectionAsync().catch(() => {});
  }
}

export function ProfileModePill({ mode, onRequireAuth, webFixed = false }: Props) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuthSession();
  const { showSwitchToHosting } = useHostingNavState();

  const isHostMode = mode === "host";
  const label = isHostMode
    ? "Switch to renting"
    : showSwitchToHosting
      ? "Switch to hosting"
      : "Become a host";
  const icon: keyof typeof Ionicons.glyphMap =
    isHostMode || showSwitchToHosting ? "swap-horizontal" : "home-outline";

  const bottom = Math.max(insets.bottom + 16, 28);

  const handlePress = () => {
    hapticTap();
    if (isHostMode) {
      router.replace("/(renter)" as never);
      return;
    }
    if (!isSignedIn) {
      onRequireAuth?.();
      return;
    }
    if (showSwitchToHosting) {
      router.replace(
        (Platform.OS === "web" ? HOST_LISTINGS_PATH : "/(poster)/(tabs)") as never,
      );
      return;
    }
    openCreateListing(router);
  };

  const pill = (
    <Pressable
      testID="profile-mode-pill"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.floatingPill,
        !webFixed && { position: "absolute", bottom },
        pressed && styles.floatingPillPressed,
      ]}
    >
      <Ionicons name={icon} size={19} color="#ffffff" />
      <Text style={styles.floatingPillText}>{label}</Text>
    </Pressable>
  );

  if (webFixed && Platform.OS === "web") {
    return (
      <View pointerEvents="box-none" style={[styles.webFixedWrap, { bottom: 24 }]}>
        {pill}
      </View>
    );
  }

  return pill;
}

const styles = StyleSheet.create({
  webFixedWrap: {
    position: "fixed" as unknown as "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99,
  },
  floatingPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111928",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 26,
    ...studentlyShadow({ color: "#000000", y: 4, blur: 10, opacity: 0.25, elevation: 8 }),
    zIndex: 99,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as unknown as ViewStyle) : {}),
  },
  floatingPillPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  floatingPillText: {
    fontFamily: Studently.type.bodyBold,
    fontSize: 15,
    color: "#ffffff",
    fontWeight: "700",
  },
});
