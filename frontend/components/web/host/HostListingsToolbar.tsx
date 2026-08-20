import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Skoun } from "@/constants/theme";
import { openNewCreateListing } from "@/features/auth/useEnsureSession";

export type HostListingsLayout = "grid" | "list";

type Props = {
  layout: HostListingsLayout;
  onLayoutChange: (layout: HostListingsLayout) => void;
};

export function HostListingsToolbar({ layout, onLayoutChange }: Props) {
  const router = useRouter();
  const nextLayout = layout === "grid" ? "list" : "grid";

  return (
    <View style={styles.row}>
      <Text style={styles.title}>Your listings</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            layout === "grid" ? "Switch to list view" : "Switch to grid view"
          }
          onPress={() => onLayoutChange(nextLayout)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons
            name={layout === "grid" ? "reorder-three-outline" : "grid-outline"}
            size={18}
            color={Skoun.color.ink}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create listing"
          onPress={() => openNewCreateListing(router)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={Skoun.color.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 24,
    color: Skoun.color.ink,
    letterSpacing: -0.4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
  },
  pressed: {
    opacity: 0.88,
    backgroundColor: "#F8FAFC",
  },
});
