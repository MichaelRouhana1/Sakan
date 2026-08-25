import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HostListingsPage } from "@/components/web/host/HostListingsPage";

export default function PosterDashboardScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <HostListingsPage />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safe: {
    flex: 1,
  },
});
