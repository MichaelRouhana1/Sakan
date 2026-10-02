import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";

type Props = {
  fields: string[];
  children: ReactNode;
};

/** Read-only wrap for structural fields after the 24h window. Wizard never locks. */
export function LockedCluster({ fields, children }: Props) {
  const { isLocked } = useCreateListingDraft();
  const locked = fields.some((field) => isLocked(field));
  if (!locked) return <>{children}</>;

  return (
    <View
      accessibilityState={{ disabled: true }}
      pointerEvents="none"
      style={[
        styles.locked,
        Platform.OS === "web" ? { cursor: "auto" as const } : null,
      ]}
    >
      <View style={styles.lockRow}>
        <Ionicons name="lock-closed" size={14} color={Lister.color.inkMuted} />
        <LText variant="caption" tone="muted">
          Locked after the first day
        </LText>
      </View>
      <View style={styles.dim}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  locked: {
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.surfaceMuted,
    padding: 8,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  dim: {
    opacity: 0.62,
  },
});
