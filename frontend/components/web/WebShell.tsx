import { StyleSheet, View } from "react-native";
import { WebFooter } from "@/components/web/WebFooter";
import { useWebShellChrome } from "@/components/web/WebShellChrome";
import { WebTopNav } from "@/components/web/WebTopNav";
import { Skoun } from "@/constants/theme";

type Props = {
  children: React.ReactNode;
  /** Centered search pill in top nav (Find / browse). */
  showNavSearch?: boolean;
};

/**
 * Web site chrome. Uses a native overflow scroller (not RN ScrollView) so
 * `position: sticky` children (filter bar) can pin under the top nav —
 * RN ScrollView applies a transform that breaks sticky.
 *
 * Map mode sets `lockScroll` so the browse split owns the remaining viewport
 * (list scrolls inside; map stays put) like Amber SearchDesktopV2.
 */
export function WebShell({ children, showNavSearch = false }: Props) {
  const { fullBleed, hideFooter, lockScroll } = useWebShellChrome();

  return (
    <View style={styles.root}>
      <WebTopNav showSearch={showNavSearch} />
      <View style={[styles.scroll, lockScroll && styles.scrollLocked]}>
        <View
          style={[
            styles.main,
            fullBleed && styles.mainBleed,
            lockScroll && styles.mainLocked,
          ]}
        >
          {children}
        </View>
        {hideFooter || lockScroll ? null : <WebFooter />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Skoun.color.bg,
    height: "100vh" as unknown as number,
    maxHeight: "100vh" as unknown as number,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    overflow: "scroll",
    overflowY: "auto",
    overflowX: "hidden",
  },
  scrollLocked: {
    overflow: "hidden",
    overflowY: "hidden",
  },
  main: {
    width: "100%",
    maxWidth: 1360,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    flexGrow: 1,
  },
  mainBleed: {
    maxWidth: "100%" as unknown as number,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  mainLocked: {
    flex: 1,
    minHeight: 0,
    height: "100%" as unknown as number,
  },
});
