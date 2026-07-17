import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";

export default function CreateListingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create listing</Text>
      <Text style={styles.hint}>
        Step form shell — utilities, Fresh USD rent, map pin, and photos come next.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  hint: {
    marginTop: 12,
    color: "#666",
  },
});
