import { StyleSheet, View } from "react-native";
import { CampusFooter } from "@/components/campus/CampusFooter";
import { CampusTopNav } from "@/components/campus/CampusTopNav";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";

type Props = {
  children: React.ReactNode;
};

export function CampusShell({ children }: Props) {
  return (
    <View style={styles.root} {...({ className: "skoun-campus" } as object)}>
      <CampusTopNav />
      <View style={styles.body}>
        <View style={styles.main}>{children}</View>
        <CampusFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    minHeight: "100vh" as unknown as number,
    backgroundColor: Skoun.color.bg,
    boxSizing: "border-box",
    display: "flex" as unknown as "flex",
    flexDirection: "column",
  },
  body: {
    width: "100%",
    flexGrow: 1,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    boxSizing: "border-box",
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
    display: "flex" as unknown as "flex",
    flexDirection: "column",
  },
});
