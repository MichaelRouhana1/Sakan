import { Ionicons } from "@expo/vector-icons";
import { Link, usePathname, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
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

const MOBILE_NAV_BREAKPOINT = 900;

const NAV_ITEMS = [
  { href: "/campus", label: "Home", match: "home" as const },
  {
    href: "/campus/calculator",
    label: "Calculator",
    match: "calculator" as const,
  },
  { href: "/campus/calendar", label: "Calendar", match: "calendar" as const },
  { href: "/campus/benefits", label: "Benefits", match: "benefits" as const },
] as const;

export function CampusTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < MOBILE_NAV_BREAKPOINT;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onCalculator = pathname.includes("/calculator");
  const onCalendar = pathname.includes("/calendar");
  const onBenefits = pathname.includes("/benefits");
  const onHome = pathname === "/campus" || pathname === "/campus/";

  const isActive = (match: (typeof NAV_ITEMS)[number]["match"]) => {
    if (match === "home") return onHome;
    if (match === "calculator") return onCalculator;
    if (match === "calendar") return onCalendar;
    return onBenefits;
  };

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!compact) setDrawerOpen(false);
  }, [compact]);

  const go = (href: string) => {
    setDrawerOpen(false);
    router.push(href as never);
  };

  return (
    <View style={styles.bar} accessibilityRole="header">
      <View
        style={[
          styles.inner,
          compact && styles.innerCompact,
          { paddingHorizontal: compact ? 16 : WEB_CONTENT_PAD_X },
        ]}
      >
        <Link href={"/campus" as Href} asChild>
          <Pressable
            onPress={() => router.push("/campus" as never)}
            accessibilityRole="link"
            accessibilityLabel="Skoun Campus home"
            style={styles.brandHit}
          >
            <SkounLogo size={compact ? 28 : 32} />
            <Text style={[styles.brand, compact && styles.brandCompact]}>
              Skoun
            </Text>
            <View style={styles.mark}>
              <Text style={styles.markText}>Campus</Text>
            </View>
          </Pressable>
        </Link>

        {compact ? (
          <View style={styles.compactActions}>
            <WebProfileMenu showLoginButton={false} />
            <Pressable
              onPress={() => setDrawerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              accessibilityState={{ expanded: drawerOpen }}
              style={({ pressed }) => [
                styles.menuBtn,
                pressed && styles.menuBtnPressed,
              ]}
            >
              <Ionicons name="menu" size={24} color={Skoun.color.ink} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.links}>
            {NAV_ITEMS.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as never)}
                accessibilityRole="link"
                style={styles.navLinkHit}
              >
                <Text
                  style={[
                    styles.navLink,
                    isActive(item.match) && styles.navLinkActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <ProductSwitchControl variant="toHousing" />
            <DownloadAppButton />
            <WebProfileMenu />
          </View>
        )}
      </View>

      <Modal
        visible={drawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.drawerRoot}>
          <Pressable
            style={styles.drawerBackdrop}
            onPress={() => setDrawerOpen(false)}
            accessibilityLabel="Close menu"
          />
          <View
            style={styles.drawerPanel}
            accessibilityRole="menu"
            accessibilityLabel="Campus navigation"
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Campus</Text>
              <Pressable
                onPress={() => setDrawerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                style={styles.drawerClose}
              >
                <Ionicons name="close" size={22} color={Skoun.color.ink} />
              </Pressable>
            </View>

            <View style={styles.drawerLinks}>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.match);
                return (
                  <Pressable
                    key={item.href}
                    onPress={() => go(item.href)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.drawerLink,
                      active && styles.drawerLinkActive,
                      pressed && styles.drawerLinkPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.drawerLinkText,
                        active && styles.drawerLinkTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active ? (
                      <View style={styles.drawerActiveDot} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.drawerDivider} />

            <View style={styles.drawerExtras}>
              <ProductSwitchControl
                variant="toHousing"
                style={styles.drawerSwitch}
                textStyle={styles.drawerSwitchText}
              />
              <DownloadAppButton />
            </View>
          </View>
        </View>
      </Modal>
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
  innerCompact: {
    gap: 12,
    paddingVertical: 12,
  },
  brandHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingRight: 8,
    flexShrink: 1,
    minWidth: 0,
    cursor: "pointer",
  },
  brand: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.primary,
    letterSpacing: -0.6,
  },
  brandCompact: {
    fontSize: 20,
  },
  mark: {
    marginLeft: 4,
    backgroundColor: Skoun.color.primaryMist,
    borderRadius: Skoun.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
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
  compactActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
    flexShrink: 0,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  menuBtnPressed: {
    opacity: 0.85,
  },
  navLinkHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: "center",
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
  drawerRoot: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 24, 38, 0.42)",
  },
  drawerPanel: {
    width: "100%",
    maxWidth: 340,
    height: "100%",
    backgroundColor: Skoun.color.surface,
    paddingTop: Platform.OS === "web" ? 20 : 48,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderLeftWidth: 1,
    borderLeftColor: Skoun.color.border,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "-12px 0 40px rgba(18, 24, 38, 0.16)",
        } as object)
      : {
          shadowColor: "#121826",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: -8, height: 0 },
          elevation: 12,
        }),
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  drawerTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    color: Skoun.color.ink,
    letterSpacing: -0.3,
  },
  drawerClose: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.surfaceMuted,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  drawerLinks: {
    gap: 4,
  },
  drawerLink: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Skoun.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  drawerLinkActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  drawerLinkPressed: {
    opacity: 0.9,
  },
  drawerLinkText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 16,
    color: Skoun.color.inkMuted,
  },
  drawerLinkTextActive: {
    fontFamily: Skoun.type.bodyBold,
    color: Skoun.color.primary,
  },
  drawerActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Skoun.color.primary,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  drawerExtras: {
    gap: 14,
    alignItems: "flex-start",
  },
  drawerSwitch: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  drawerSwitchText: {
    fontSize: 16,
  },
});
