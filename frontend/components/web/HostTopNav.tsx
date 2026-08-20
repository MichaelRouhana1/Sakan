import { Link, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SkounLogo } from "@/components/common/SkounLogo";
import { WebProfileMenu } from "@/components/web/WebProfileMenu";
import { Skoun } from "@/constants/theme";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_NAV_HEIGHT,
} from "@/constants/webLayout";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";

export function HostTopNav() {
  const router = useRouter();
  const { user } = useAuthSession();

  const initial =
    user?.firstName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "S";

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Link href="/" asChild>
          <Pressable
            onPress={() => router.push("/" as never)}
            accessibilityRole="link"
            accessibilityLabel="Skoun home"
            style={styles.brandHit}
          >
            <SkounLogo size={32} />
            <Text style={styles.brand}>Skoun</Text>
          </Pressable>
        </Link>

        <View style={styles.right}>
          <Pressable
            onPress={() => router.replace("/(renter)" as never)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}
          >
            <Text style={styles.switchLinkText}>Switch to renting</Text>
          </Pressable>

          <WebProfileMenu initial={initial} avatarBackgroundColor="#FCE7F3" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "sticky" as unknown as "relative",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: WEB_NAV_HEIGHT,
    minHeight: WEB_NAV_HEIGHT,
    zIndex: 50,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    boxSizing: "border-box",
  },
  inner: {
    maxWidth: WEB_CONTENT_MAX,
    width: "100%",
    minHeight: WEB_NAV_HEIGHT,
    marginHorizontal: "auto" as unknown as number,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    boxSizing: "border-box",
  },
  brandHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingRight: 8,
    cursor: "pointer",
  },
  brand: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.primary,
    letterSpacing: -0.6,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  switchLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  switchLinkText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.85,
  },
});
