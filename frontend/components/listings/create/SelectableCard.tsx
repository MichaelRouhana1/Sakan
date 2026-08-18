import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";

type Ion = ComponentProps<typeof Ionicons>["name"];

type Props = {
  selected: boolean;
  title: string;
  body?: string;
  icon?: Ion;
  onPress: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
  error?: boolean;
};

export function SelectableCard({
  selected,
  title,
  body,
  icon,
  onPress,
  accessibilityLabel,
  children,
  error,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardOn,
        error && !selected && styles.cardError,
        pressed && styles.cardPressed,
      ]}
    >
      {icon ? (
        <View style={[styles.iconWrap, selected && styles.iconOn]}>
          <Ionicons
            name={icon}
            size={22}
            color={selected ? Lister.color.primary : Lister.color.inkMuted}
          />
        </View>
      ) : null}
      <View style={styles.copy}>
        <LText variant="subtitle">{title}</LText>
        {body ? (
          <LText variant="caption" tone="muted">
            {body}
          </LText>
        ) : null}
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: Lister.radius.lg,
    borderWidth: 2,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    cursor: "pointer",
  },
  cardOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  cardError: {
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surfaceMuted,
  },
  iconOn: {
    backgroundColor: Lister.color.surface,
  },
  copy: { flex: 1, gap: 4, justifyContent: "center" },
});
