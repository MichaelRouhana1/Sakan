import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  HOST_ANALYTICS_PATH,
  HOST_CREDITS_PATH,
  HOST_LISTINGS_PATH,
  hostNavSection,
  type HostNavSection,
} from "@/constants/hostRoutes";
import { Skoun } from "@/constants/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type NavItem = {
  id: HostNavSection;
  href: string;
  label: string;
  icon: IoniconName;
};

const HOST_NAV_ITEMS: readonly NavItem[] = [
  {
    id: "listings",
    href: HOST_LISTINGS_PATH,
    label: "Listings",
    icon: "home-outline",
  },
  {
    id: "analytics",
    href: HOST_ANALYTICS_PATH,
    label: "Analytics",
    icon: "stats-chart-outline",
  },
  {
    id: "credits",
    href: HOST_CREDITS_PATH,
    label: "Credits",
    icon: "wallet-outline",
  },
];

type NavLinksProps = {
  variant: "rail" | "drawer";
  onNavigate?: () => void;
};

function HostNavLinks({ variant, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const router = useRouter();
  const section = hostNavSection(pathname);
  const drawer = variant === "drawer";

  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel="Host"
      style={drawer ? styles.drawerLinks : styles.railLinks}
    >
      {HOST_NAV_ITEMS.map((item) => {
        const active = section === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              onNavigate?.();
              router.push(item.href as never);
            }}
            accessibilityRole="link"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            {...(Platform.OS === "web" && active
              ? ({ "aria-current": "page" } as object)
              : null)}
            style={({ pressed, hovered }: PressableState) => [
              drawer ? styles.drawerItem : styles.railItem,
              active && (drawer ? styles.drawerItemActive : styles.railItemActive),
              hovered &&
                !active &&
                (drawer ? styles.drawerItemHover : styles.railItemHover),
              pressed && styles.itemPressed,
            ]}
          >
            <View style={drawer ? styles.drawerIconSlot : styles.railIconSlot}>
              <Ionicons
                name={item.icon}
                size={drawer ? 20 : 18}
                color={active ? Skoun.color.primary : Skoun.color.inkMuted}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                drawer ? styles.drawerLabel : styles.railLabel,
                active && styles.labelActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type PressableState = {
  pressed: boolean;
  hovered?: boolean;
};

export function HostSideNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <View
      style={[styles.rail, collapsed && styles.railCollapsed]}
      accessibilityElementsHidden={collapsed}
      importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
    >
      {collapsed ? null : <HostNavLinks variant="rail" />}
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? "Open host menu" : "Close host menu"}
        accessibilityState={{ expanded: !collapsed }}
        style={({ pressed, hovered }: PressableState) => [
          styles.railToggle,
          hovered && styles.railToggleHover,
          pressed && styles.itemPressed,
        ]}
      >
        <Ionicons
          name={collapsed ? "chevron-forward" : "chevron-back"}
          size={16}
          color={Skoun.color.ink}
        />
      </Pressable>
    </View>
  );
}

type DrawerProps = {
  visible: boolean;
  onClose: () => void;
};

export function HostNavDrawer({ visible, onClose }: DrawerProps) {
  const router = useRouter();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.drawerRoot}>
        <Pressable
          style={styles.drawerBackdrop}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
        <View
          style={styles.drawerPanel}
          accessibilityRole="menu"
          accessibilityLabel="Host navigation"
        >
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Host</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              style={({ pressed }) => [
                styles.drawerClose,
                pressed && styles.itemPressed,
              ]}
            >
              <Ionicons name="close" size={22} color={Skoun.color.ink} />
            </Pressable>
          </View>
          <HostNavLinks variant="drawer" onNavigate={onClose} />
          <View style={styles.drawerDivider} />
          <Pressable
            onPress={() => {
              onClose();
              router.replace("/(renter)" as never);
            }}
            accessibilityRole="button"
            accessibilityLabel="Switch to renting"
            style={({ pressed }) => [
              styles.drawerSwitch,
              pressed && styles.itemPressed,
            ]}
          >
            <Text style={styles.drawerSwitchText}>Switch to renting</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const webCursor = Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null;

const webTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "background-color, color, width, min-width, flex-basis, padding, border-width",
        transitionDuration: "200ms",
      } as object)
    : null;

const styles = StyleSheet.create({
  rail: {
    width: 208,
    minWidth: 208,
    flexBasis: 208,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "stretch",
    paddingTop: 20,
    paddingBottom: 16,
    paddingLeft: 0,
    paddingRight: 12,
    backgroundColor: Skoun.color.bg,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    boxSizing: "border-box",
    position: "relative",
    overflow: "visible",
    zIndex: 2,
    ...webTransition,
  },
  railCollapsed: {
    width: 0,
    minWidth: 0,
    flexBasis: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingRight: 0,
    borderRightWidth: 0,
  },
  railToggle: {
    position: "absolute",
    top: 22,
    right: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    zIndex: 3,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(18, 24, 38, 0.12)",
        } as object)
      : {
          shadowColor: "#121826",
          shadowOpacity: 0.12,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 3,
        }),
  },
  railToggleHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  railLinks: {
    gap: 4,
    width: "100%",
  },
  railItem: {
    width: "100%",
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: Skoun.radius.sm,
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 8,
    ...webCursor,
    ...webTransition,
  },
  railIconSlot: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  railItemActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  railItemHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  railLabel: {
    flexShrink: 1,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  labelActive: {
    color: Skoun.color.primary,
  },
  itemPressed: {
    opacity: 0.85,
  },
  drawerRoot: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Skoun.color.overlay,
  },
  drawerPanel: {
    width: "100%",
    maxWidth: 320,
    height: "100%",
    backgroundColor: Skoun.color.surface,
    paddingTop: Platform.OS === "web" ? 20 : 48,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    zIndex: 1,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "12px 0 40px rgba(18, 24, 38, 0.16)",
        } as object)
      : {
          shadowColor: "#121826",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 8, height: 0 },
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
    ...webCursor,
  },
  drawerLinks: {
    gap: 4,
  },
  drawerItem: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Skoun.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...webCursor,
    ...webTransition,
  },
  drawerIconSlot: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  drawerItemActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  drawerItemHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  drawerLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 16,
    color: Skoun.color.inkMuted,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  drawerSwitch: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    ...webCursor,
  },
  drawerSwitchText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 16,
    color: Skoun.color.ink,
    textDecorationLine: "underline",
  },
});
