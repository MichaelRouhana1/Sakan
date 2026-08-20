import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { HOST_LISTINGS_PATH } from "@/constants/hostRoutes";
import { AuthRequiredError } from "@/features/auth/useEnsureSession";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/types/user";

type Props = {
  /** Role of the shell this control sits in. */
  currentRole: UserRole;
};

/**
 * Browse ↔ host dashboard — navigation only; DB role updates on first publish.
 */
export function SwitchRoleControl({ currentRole }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextRole: UserRole = currentRole === "renter" ? "poster" : "renter";
  const label =
    nextRole === "poster" ? "Host dashboard" : "Browse listings";

  async function onSwitch() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await getSession();
      if (!session) {
        throw new AuthRequiredError();
      }
      if (nextRole === "renter") {
        router.replace("/(renter)" as never);
      } else if (Platform.OS === "web") {
        router.replace(HOST_LISTINGS_PATH as never);
      } else {
        router.replace("/(poster)/(tabs)" as never);
      }
    } catch (err) {
      setError(
        err instanceof AuthRequiredError
          ? "Sign in to continue."
          : "Couldn’t switch views. Try again.",
      );
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
