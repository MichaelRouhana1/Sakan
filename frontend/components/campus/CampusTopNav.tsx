import { Link, usePathname, useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProductSwitchControl } from "@/components/campus/ProductSwitchControl";
import { SkounLogo } from "@/components/common/SkounLogo";
import { DownloadAppButton } from "@/components/web/DownloadAppButton";
import { WebProfileMenu } from "@/components/web/WebProfileMenu";
import { Skoun } from "@/constants/theme";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_NAV_HEIGHT,
} from "@/constants/webLayout";

export function CampusTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onCalculator = pathname.includes("/calculator");

  return (
    <View style={styles.bar} accessibilityRole="header">
      <View style={styles.inner}>
        <Link href={"/campus" as Href} asChild>
          <Pressable
            onPress={() => router.push("/campus" as never)}
            accessibilityRole="link"
            accessibilityLabel="Skoun Campus home"
            style={styles.brandHit}
          >
            <SkounLogo size={32} />
            <Text style={styles.brand}>Skoun</Text>
            <View style={styles.mark}>
              <Text style={styles.markText}>Campus</Text>
            </View>
          </Pressable>
        </Link>

        <View style={styles.links}>
          <Pressable
            onPress={() => router.push("/campus" as never)}
            accessibilityRole="link"
            style={styles.navLinkHit}
          >
            <Text
              style={[styles.navLink, !onCalculator && styles.navLinkActive]}
            >
              Home
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/campus/calculator" as never)}
            accessibilityRole="link"
            style={styles.navLinkHit}
          >
            <Text
              style={[styles.navLink, onCalculator && styles.navLinkActive]}
            >
              Calculator
            </Text>
          </Pressable>
          <ProductSwitchControl variant="toHousing" />
          <DownloadAppButton />
          <WebProfileMenu />
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
    maxWidth: "100%",
    height: WEB_NAV_HEIGHT,
    minHeight: WEB_NAV_HEIGHT,
    zIndex: 200,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    boxSizing: "border-box",
    overflow: "visible",
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
    gap: 20,
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
  mark: {
    marginLeft: 4,
    backgroundColor: Skoun.color.primaryMist,
    borderRadius: Skoun.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  markText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: Skoun.color.primary,
    letterSpacing: 0.2,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: "auto",
    flexShrink: 0,
  },
  navLinkHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  navLink: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 15,
    color: Skoun.color.inkMuted,
  },
  navLinkActive: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodySemi,
  },
});
