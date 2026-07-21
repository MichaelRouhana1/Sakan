import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Lister } from "@/constants/listerTheme";
import { LText } from "./Typography";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function LButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
  accessibilityHint,
}: Props) {
  const busy = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!busy }}
      accessibilityHint={accessibilityHint}
      disabled={busy}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => undefined,
        );
        onPress?.();
      }}
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        busy && styles.busy,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" || variant === "ghost"
              ? Lister.color.primaryDeep
              : Lister.color.surface
          }
        />
      ) : (
        <>
          {icon}
          <LText
            variant="subtitle"
            tone={
              variant === "secondary" || variant === "ghost"
                ? "ink"
                : "inverse"
            }
            style={[
              styles.label,
              (variant === "secondary" || variant === "ghost") &&
                styles.labelOnSoft,
            ]}
          >
            {label}
          </LText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: Lister.space.lg,
    borderRadius: Lister.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primary: {
    backgroundColor: Lister.color.primary,
  },
  secondary: {
    backgroundColor: Lister.color.primarySoft,
    borderWidth: 1,
    borderColor: Lister.color.primaryDeep,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: Lister.color.danger,
  },
  busy: {
    opacity: 0.55,
  },
  label: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 16,
  },
  labelOnSoft: {
    color: Lister.color.primaryDeep,
  },
});
