import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Skoun } from "@/constants/theme";
import { openNewCreateListing } from "@/features/auth/useEnsureSession";

export type HostListingsLayout = "grid" | "list";

export const CREATE_LISTING_CAP_MESSAGE =
  "You already have 2 listings in progress. Finish or remove one to start another.";

type Props = {
  layout: HostListingsLayout;
  onLayoutChange: (layout: HostListingsLayout) => void;
  createDisabled?: boolean;
};

export function HostListingsToolbar({
  layout,
  onLayoutChange,
  createDisabled = false,
}: Props) {
  const router = useRouter();
  const nextLayout = layout === "grid" ? "list" : "grid";

  return (
    <View style={styles.wrap}>
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
          <View
            {...(Platform.OS === "web" && createDisabled
              ? { title: CREATE_LISTING_CAP_MESSAGE }
              : null)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                createDisabled ? CREATE_LISTING_CAP_MESSAGE : "Create listing"
              }
              accessibilityState={{ disabled: createDisabled }}
              disabled={createDisabled}
              onPress={() => {
                if (createDisabled) return;
                openNewCreateListing(router);
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && !createDisabled && styles.pressed,
                createDisabled && styles.disabled,
              ]}
            >
              <Ionicons name="add" size={20} color={Skoun.color.ink} />
            </Pressable>
          </View>
        </View>
      </View>
      {createDisabled ? (
        <Text style={styles.hint} accessibilityRole="text">
          {CREATE_LISTING_CAP_MESSAGE}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  disabled: {
    opacity: 0.4,
    cursor: "default",
  },
  hint: {
    alignSelf: "flex-end",
    maxWidth: 320,
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
    textAlign: "right",
  },
});
