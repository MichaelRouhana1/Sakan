import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";

export default function SavedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved</Text>
      <Text style={styles.hint}>Placeholder — saved listings come in a later slice.</Text>
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
