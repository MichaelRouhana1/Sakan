import { useLayoutEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { CampusFooter } from "@/components/campus/CampusFooter";
import { CampusTopNav } from "@/components/campus/CampusTopNav";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { CAMPUS_CSS } from "@/styles/campusCssText";

type Props = {
  children: React.ReactNode;
};

/** Gap between the top nav and page content. Pages that want to sit flush
 *  against the nav (e.g. the home hero) can negate this. */
export function campusShellPadTop(width: number): number {
  return width < 640 ? 16 : 28;
}

export function CampusShell({ children }: Props) {
  const { width } = useWindowDimensions();
  const padX = width < 640 ? 16 : width < 900 ? 20 : WEB_CONTENT_PAD_X;
  const padTop = campusShellPadTop(width);
  const padBottom = width < 640 ? 32 : 48;

  // SPA web (`output: "single"`) never mounts `app/+html.tsx`, so cuby/calendar
  // CSS would otherwise never load. Same fallback pattern as AdminNeuShell.
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const id = "skoun-campus-css";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    if (style.textContent !== CAMPUS_CSS) {
      style.textContent = CAMPUS_CSS;
    }
  }, []);

  return (
    <View
      nativeID="skoun-campus"
      style={styles.root}
      {...({ className: "skoun-campus" } as object)}
    >
      <CampusTopNav />
      <View style={styles.body}>
        <View
          style={[
            styles.main,
            {
              paddingHorizontal: padX,
              paddingTop: padTop,
              paddingBottom: padBottom,
            },
          ]}
        >
          {children}
        </View>
        <CampusFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    flex: 1,
    // Bound to the stack screen so this shell is the only touch scroller.
    // overflow-x:hidden alone computes overflow-y:auto on an unbounded box,
    // which eats mobile pans without actually scrolling.
    minHeight: 0,
    height: "100%" as unknown as number,
    backgroundColor: Skoun.color.bg,
    boxSizing: "border-box",
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    ...(Platform.OS === "web"
      ? ({
          overflowX: "hidden",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        } as object)
      : { overflow: "hidden" }),
  },
  body: {
    width: "100%",
    maxWidth: "100%",
    flexGrow: 1,
    flexShrink: 0,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minWidth: 0,
  },
  main: {
    width: "100%",
    maxWidth: WEB_CONTENT_MAX,
    alignSelf: "center",
    boxSizing: "border-box",
    flexGrow: 1,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    minWidth: 0,
  },
});
