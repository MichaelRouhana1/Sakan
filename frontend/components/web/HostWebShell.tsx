import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { DesktopDesignProvider, useDesktopDesign } from "@/components/ui/DesktopDesign";
import {
  HostNavDrawer,
  HostSideNav,
} from "@/components/web/host/HostSideNav";
import { HostTopNav } from "@/components/web/HostTopNav";
import { DesktopDesign, Studently } from "@/constants/theme";
import { WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { useBreakpoint } from "@/lib/breakpoints";
import { setHostRailInset } from "@/components/web/hostRailInset";

const SIDE_NAV_COLLAPSED_KEY = "studently.host.sideNavCollapsed";

function readCollapsed(): boolean {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(SIDE_NAV_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SIDE_NAV_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

type Props = {
  children: React.ReactNode;
};

export function HostWebShell({ children }: Props) {
  const { width } = useWindowDimensions();
  const enabled = Platform.OS === "web" && width >= DesktopDesign.layout.minWidth;
  return (
    <DesktopDesignProvider enabled={enabled}>
      <HostWebShellFrame>{children}</HostWebShellFrame>
    </DesktopDesignProvider>
  );
}

function HostWebShellFrame({ children }: Props) {
  const pathname = usePathname();
  const bp = useBreakpoint();
  const { scale, size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const rootRef = useRef<View>(null);
  // Match the exported desktop shell on the first client render, then apply
  // the viewport and saved rail preference after hydration.
  const [hydrated, setHydrated] = useState(false);
  const desktop = !hydrated || bp === "desktop";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);

  useEffect(() => {
    setRailCollapsed(readCollapsed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (desktop) setDrawerOpen(false);
  }, [desktop]);

  useEffect(() => {
    const next = desktop ? (railCollapsed ? designSize(48) : designSize(228)) : 0;
    setHostRailInset(next);
    return () => setHostRailInset(0);
  }, [desktop, railCollapsed, designSize]);

  function toggleRail() {
    setRailCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = rootRef.current as unknown as HTMLElement | null;
    node?.style?.setProperty?.("--sk-desktop-scale", String(scale));
  }, [scale]);

  return (
    <View
      ref={rootRef}
      style={[styles.root, Platform.OS === "web" ? ({ ["--sk-desktop-scale" as string]: String(scale) } as object) : null]}
      {...(Platform.OS === "web" ? ({ dataSet: { desktopScale: String(scale) } } as object) : {})}
    >
      <HostTopNav
        showMenuButton={!desktop}
        menuOpen={drawerOpen}
        onMenuPress={() => setDrawerOpen(true)}
      />
      <View style={styles.bodyBand}>
        <View style={[styles.bodyInner, !desktop && styles.bodyInnerCompact]}>
          {desktop ? (
            <HostSideNav collapsed={railCollapsed} onToggle={toggleRail} />
          ) : null}
          <View style={styles.main}>{children}</View>
        </View>
      </View>
      {!desktop ? (
        <HostNavDrawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  root: {
    width: "100%",
    flex: 1,
    minHeight: 0,
    height: "100vh" as unknown as number,
    maxHeight: "100vh" as unknown as number,
    backgroundColor: Studently.color.bg,
    boxSizing: "border-box",
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    overflowX: "hidden",
    overflowY: "hidden",
  } as object,
  bodyBand: {
    width: "100%",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  } as object,
  bodyInner: {
    width: "100%",
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    paddingLeft: 16,
    paddingRight: WEB_CONTENT_PAD_X,
    display: "flex" as unknown as "flex",
    flexDirection: "row",
    alignItems: "stretch",
    boxSizing: "border-box",
    overflow: "visible",
  } as object,
  bodyInnerCompact: {
    maxWidth: "100%",
    paddingHorizontal: 0,
  },
  main: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 0,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    overflowX: "hidden",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  } as object,
});
