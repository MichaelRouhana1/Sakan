import { StyleSheet, View } from "react-native";
import { WebFooter } from "@/components/web/WebFooter";
import { useWebShellChrome } from "@/components/web/WebShellChrome";
import { WebTopNav } from "@/components/web/WebTopNav";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";

type Props = {
  children: React.ReactNode;
  /** Centered search pill in top nav (Find / browse). */
  showNavSearch?: boolean;
};

/**
 * Web site chrome. Default: natural document height so the *window*
 * scrollbar scrolls the page (Amber-style). Map mode sets `lockScroll`
 * to freeze the shell to the viewport and scroll only the list column.
 */
export function WebShell({ children, showNavSearch = false }: Props) {
  const { fullBleed, hideFooter, lockScroll } = useWebShellChrome();

  return (
    <View style={[styles.root, lockScroll && styles.rootLocked]}>
      <WebTopNav showSearch={showNavSearch} />
      <View
        style={[
          styles.body,
          lockScroll && styles.bodyLocked,
        ]}
      >
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
    width: "100%",
    minHeight: "100vh" as unknown as number,
    backgroundColor: Skoun.color.bg,
    // Let document/body own the scrollbar — do not lock to viewport height.
  },
  rootLocked: {
    height: "100vh" as unknown as number,
    maxHeight: "100vh" as unknown as number,
    overflow: "hidden",
  },
  body: {
    width: "100%",
    flexGrow: 1,
  },
  bodyLocked: {
    flex: 1,
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
    display: "flex",
    flexDirection: "column",
  },
});
