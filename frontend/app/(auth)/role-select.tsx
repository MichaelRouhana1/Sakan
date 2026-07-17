import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

export default function RoleSelectScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How will you use Skoun?</Text>
      <Text style={styles.sub}>This choice sets your experience (PRD role gate).</Text>
      <Button
        label="I am looking for a place"
        onPress={() => router.replace("/(renter)")}
      />
      <Button
        label="I am listing a place"
        variant="secondary"
        onPress={() => router.replace("/(poster)")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  sub: {
    color: "#666",
    marginBottom: 8,
  },
});
