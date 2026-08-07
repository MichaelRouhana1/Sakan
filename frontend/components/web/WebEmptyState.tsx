import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function WebEmptyState({
  icon = "search-outline",
  title,
  message,
  actionLabel,
  onAction,
  children,
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={styles.iconRing}>
        <Ionicons name={icon} size={32} color={Skoun.color.primary} />
      </View>
      <LText variant="title" style={styles.title}>
        {title}
      </LText>
      <LText variant="body" tone="muted" style={styles.message}>
        {message}
      </LText>
      {actionLabel && onAction ? (
        <LButton
          label={actionLabel}
          variant="primary"
          onPress={onAction}
          style={styles.btn}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
    maxWidth: 420,
    alignSelf: "center",
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    color: Skoun.color.ink,
  },
  message: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  btn: {
    minWidth: 180,
  },
});
