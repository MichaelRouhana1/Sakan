import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useCredits } from "@/features/credits/useCredits";

export default function PosterDashboardScreen() {
  const { data: credits } = useCredits();

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Skoun</Text>
      <Text style={styles.title}>Poster dashboard</Text>
      <Text style={styles.row}>
        Post credits: {credits?.postCredits ?? "—"}
      </Text>
      <Text style={styles.row}>
        Boost credits: {credits?.boostCredits ?? "—"}
      </Text>
      <Text style={styles.hint}>
        Active listings, view counts, and expiry timers will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    gap: 8,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  row: {
    fontSize: 16,
  },
  hint: {
    marginTop: 16,
    color: "#666",
  },
});
