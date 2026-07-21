import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { switchToRole } from "@/features/auth/useEnsureSession";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/types/user";

type Props = {
  /** Role of the shell this control sits in. */
  currentRole: UserRole;
};

/**
 * Dev-friendly role flip — updates session and navigates without a hard reload.
 */
export function SwitchRoleControl({ currentRole }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextRole: UserRole = currentRole === "renter" ? "poster" : "renter";
  const label =
    nextRole === "poster" ? "Switch to listing a place" : "Switch to finding a place";

  async function onSwitch() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Ensure headers still send current role until switch completes.
      await getSession();
      await switchToRole(nextRole);
      router.replace(nextRole === "renter" ? "/(renter)" : "/(poster)");
    } catch {
      setError("Couldn’t switch roles. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={busy}
        onPress={() => void onSwitch()}
        style={({ pressed }) => [
          styles.btn,
          pressed && styles.btnPressed,
          busy && styles.btnBusy,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={Lister.color.primary} size="small" />
        ) : (
          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={Lister.color.primary}
          />
        )}
        <LText variant="caption" style={styles.label}>
          {label}
        </LText>
      </Pressable>
      {error ? (
        <LText variant="caption" tone="danger">
          {error}
        </LText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    alignItems: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnBusy: {
    opacity: 0.7,
  },
  label: {
    color: Lister.color.primary,
    fontFamily: Lister.type.bodySemi,
  },
});
