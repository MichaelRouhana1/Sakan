import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";

export type SearchMode = "standard" | "university";

type Props = {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
};

export function SearchModeToggle({ mode, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange("standard")}
        style={[styles.chip, mode === "standard" && styles.active]}
      >
        <Text style={mode === "standard" ? styles.activeLabel : undefined}>
          Cities
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("university")}
        style={[styles.chip, mode === "university" && styles.active]}
      >
        <Text style={mode === "university" ? styles.activeLabel : undefined}>
          University Hub
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  active: {
    backgroundColor: "#0B6E4F",
  },
  activeLabel: {
    color: "#fff",
    fontWeight: "600",
  },
});
