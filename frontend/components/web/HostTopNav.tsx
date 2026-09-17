import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SkounLogo } from "@/components/common/SkounLogo";
import { WebProfileMenu } from "@/components/web/WebProfileMenu";
import {
  HOST_ANALYTICS_PATH,
  HOST_CREDITS_PATH,
  HOST_LISTINGS_PATH,
} from "@/constants/hostRoutes";
import { Skoun } from "@/constants/theme";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_NAV_HEIGHT,
} from "@/constants/webLayout";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useCredits } from "@/features/credits/useCredits";

export function HostTopNav() {
  const router = useRouter();
  const { user, isSignedIn } = useAuthSession();
  const credits = useCredits(isSignedIn);

  const initial =
    user?.firstName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "S";

  const postCredits = credits.data?.postCredits ?? user?.postCredits ?? 0;
  const boostCredits = credits.data?.boostCredits ?? user?.boostCredits ?? 0;
  const creditsLabel =
    boostCredits > 0
      ? `${postCredits} credit${postCredits === 1 ? "" : "s"} · ${boostCredits} boost`
      : `${postCredits} credit${postCredits === 1 ? "" : "s"}`;

  function openTopUp() {
    router.push(HOST_CREDITS_PATH as never);
  }

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

          <Link href={HOST_LISTINGS_PATH as never} asChild>
            <Pressable
              onPress={() => router.push(HOST_LISTINGS_PATH as never)}
              accessibilityRole="link"
              accessibilityLabel="Listings"
              style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}
            >
              <Text style={styles.switchLinkText}>Listings</Text>
            </Pressable>
          </Link>

          <Link href={HOST_ANALYTICS_PATH as never} asChild>
            <Pressable
              onPress={() => router.push(HOST_ANALYTICS_PATH as never)}
              accessibilityRole="link"
              accessibilityLabel="Analytics"
              style={({ pressed }) => [styles.switchLink, pressed && styles.pressed]}
            >
              <Text style={styles.switchLinkText}>Analytics</Text>
            </Pressable>
          </Link>

          {isSignedIn ? (
            <View style={styles.credits}>
              <Pressable
                onPress={openTopUp}
                accessibilityRole="button"
                accessibilityLabel={`${creditsLabel}. Open top up`}
                style={({ pressed }) => [
                  styles.creditsHit,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.creditsText}>{creditsLabel}</Text>
              </Pressable>
              <Pressable
                onPress={openTopUp}
                accessibilityRole="button"
                accessibilityLabel="Top up credits"
                style={({ pressed }) => [
                  styles.creditsPlus,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="add" size={18} color={Skoun.color.ink} />
              </Pressable>
            </View>
          ) : null}

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
    paddingVertical: 11,
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
  credits: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  creditsHit: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    cursor: "pointer",
  },
  creditsText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  creditsPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  pressed: {
    opacity: 0.85,
  },
});
