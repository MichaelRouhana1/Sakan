import { useEffect, useRef } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { usePathname } from "expo-router";
import { DesktopDesignProvider, useDesktopDesign } from "@/components/ui/DesktopDesign";
import { WebFooter } from "@/components/web/WebFooter";
import { useWebShellChrome } from "@/components/web/WebShellChrome";
import { WebTopNav } from "@/components/web/WebTopNav";
import { DesktopDesign } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";

function publicDesktopPath(path: string) {
  return path === "/search" || path.startsWith("/search/") || path.startsWith("/listing/");
}

function accountDesktopPath(path: string) {
  return path === "/profile" || path.startsWith("/profile/") || path === "/saved" || path.startsWith("/saved/");
}

type Props = {
  children: React.ReactNode;
  /** Centered search pill in top nav (Find / browse). */
  showNavSearch?: boolean;
  /** Explicitly show/hide footer if needed. */
  showFooter?: boolean;
};

/**
 * Web site chrome. Expo Router's stack screen is viewport-bounded with
 * overflow hidden, so the window cannot grow. This shell is therefore the
 * page scroller (same pattern as CampusShell). Map mode sets `lockScroll`
 * to freeze the shell and scroll only the list column.
 */
export function WebShell({ children, showNavSearch = false, showFooter }: Props) {
  const { width } = useWindowDimensions();
  const path = usePathname();
  const enabled = Platform.OS === "web" && width >= DesktopDesign.layout.minWidth && (publicDesktopPath(path) || accountDesktopPath(path));
  return (
    <DesktopDesignProvider enabled={enabled}>
      <WebShellFrame showNavSearch={showNavSearch} showFooter={showFooter}>
        {children}
      </WebShellFrame>
    </DesktopDesignProvider>
  );
}

function WebShellFrame({ children, showNavSearch = false, showFooter }: Props) {
  const { fullBleed, hideFooter, lockScroll } = useWebShellChrome();
  const { scale, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const rootRef = useRef<View>(null);
  const shouldHideFooter = showFooter === false || hideFooter;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = rootRef.current as unknown as HTMLElement | null;
    node?.style?.setProperty?.("--sk-desktop-scale", String(scale));
  }, [scale]);

  return (
    <View
      ref={rootRef}
      nativeID="studently-web-shell"
      {...(Platform.OS === "web" ? ({ dataSet: { desktopScale: String(scale) } } as object) : {})}
      {...({
        className: lockScroll
          ? "studently-web-shell studently-web-shell-locked"
          : "studently-web-shell",
      } as object)}
      style={[
        styles.root,
        lockScroll && styles.rootLocked,
        Platform.OS === "web" ? ({ ["--sk-desktop-scale" as string]: String(scale) } as object) : null,
      ]}
    >
      <WebTopNav showSearch={showNavSearch} />
      <View style={[styles.body, lockScroll && styles.bodyLocked]}>
        <View
          style={[
            styles.main,
            fullBleed && styles.mainBleed,
            lockScroll && styles.mainLocked,
          ]}
        >
          {children}
        </View>
        {shouldHideFooter ? null : <WebFooter />}
      </View>
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
    backgroundColor: "#F9FAFB",
    boxSizing: "border-box",
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    overflowX: "hidden",
    overflowY: "scroll",
    WebkitOverflowScrolling: "touch",
  } as object,
  rootLocked: {
    overflow: "hidden",
  },
  body: {
    width: "100%",
    flexGrow: 1,
    flexShrink: 0,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "visible",
  },
  bodyLocked: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  main: {
    width: "100%",
    maxWidth: WEB_CONTENT_MAX,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingTop: 28,
    paddingBottom: 48,
    boxSizing: "border-box",
    flexGrow: 1,
    flexShrink: 0,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    overflow: "visible",
  },
  mainBleed: {
    maxWidth: "100%" as unknown as number,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  mainLocked: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    overflow: "hidden",
  },
});
