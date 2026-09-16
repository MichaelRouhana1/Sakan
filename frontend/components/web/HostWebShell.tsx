import { StyleSheet, View } from "react-native";
import { HostTopNav } from "@/components/web/HostTopNav";

type Props = {
  children: React.ReactNode;
};

export function HostWebShell({ children }: Props) {
  return (
    <View style={styles.root}>
      <HostTopNav />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    flex: 1,
    minHeight: 0,
    height: "100vh" as unknown as number,
    maxHeight: "100vh" as unknown as number,
    backgroundColor: "#FFFFFF",
    boxSizing: "border-box",
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    overflowX: "hidden",
    overflowY: "scroll",
    WebkitOverflowScrolling: "touch",
  } as object,
  body: {
    width: "100%",
    flexGrow: 1,
    flexShrink: 0,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "visible",
  },
});
