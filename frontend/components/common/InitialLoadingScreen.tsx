import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StudentlyLogo } from "./StudentlyLogo";

/** Only for the initial app or full-route load. In-content loaders stay unchanged. */
export function InitialLoadingScreen() {
  return (
    <View style={styles.screen} accessibilityRole="progressbar" accessibilityLabel="Loading Studently">
      <StudentlyLogo size={128} />
      <ActivityIndicator color="#EA3F4A" />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: "100%", alignItems: "center", justifyContent: "center", gap: 20, backgroundColor: "#FFFFFF" },
});
