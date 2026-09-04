import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { CampusFooter } from "@/components/campus/CampusFooter";
import { CampusTopNav } from "@/components/campus/CampusTopNav";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";

type Props = {
  children: React.ReactNode;
};

export function CampusShell({ children }: Props) {
  const { width } = useWindowDimensions();
  const padX = width < 640 ? 16 : width < 900 ? 20 : WEB_CONTENT_PAD_X;
  const padTop = width < 640 ? 16 : 28;
  const padBottom = width < 640 ? 32 : 48;

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
