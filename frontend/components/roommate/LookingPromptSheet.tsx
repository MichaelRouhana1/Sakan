import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

type Props = {
  visible: boolean;
  area: string;
  nearbyCount: number | null;
  onDismiss: () => void;
};

/** Soft post-view sheet: suggest creating a Looking card in launch areas. */
export function LookingPromptSheet({
  visible,
  area,
  nearbyCount,
  onDismiss,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <LText variant="label" tone="brass">
            Looking nearby?
          </LText>
          <LText variant="title" style={{ marginTop: 6 }}>
            Share a place in {area}
          </LText>
          <LText variant="body" tone="muted" style={{ marginTop: 8 }}>
            {nearbyCount != null && nearbyCount > 0
              ? `${nearbyCount} people looking nearby. Create a free Looking card so holders can invite you.`
              : "Create a free Looking card so holders with a spare bed can invite you."}
          </LText>
          <LButton
            label="Create Looking card"
            onPress={() => {
              onDismiss();
              router.push("/(renter)/roommates/looking-card");
            }}
            style={{ marginTop: 16 }}
          />
          <LButton label="Not now" variant="ghost" onPress={onDismiss} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Skoun.color.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Skoun.color.surface,
    borderTopLeftRadius: Skoun.radius.xl,
    borderTopRightRadius: Skoun.radius.xl,
    padding: 24,
    paddingBottom: 36,
  },
});
