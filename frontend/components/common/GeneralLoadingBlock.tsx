import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import type { GeneralLoadingBlockProps } from "@/components/common/GeneralLoadingBlock.types";

/** Native fallback — `thinking-orbs` is web-only (HTML canvas). */
export function GeneralLoadingBlock({
  label = "Loading…",
  layout = "page",
  showLabel = true,
  style,
}: GeneralLoadingBlockProps) {
  const spinnerSize = layout === "page" ? "large" : "small";

  return (
    <View
      style={[
        layout === "page" && styles.page,
        layout === "inline" && styles.inline,
        layout === "stack" && styles.stack,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator color={Skoun.color.primary} size={spinnerSize} />
      {label && showLabel ? (
        <LText
          variant={layout === "inline" ? "caption" : "body"}
          tone="muted"
          style={layout !== "inline" ? styles.label : undefined}
        >
          {label}
        </LText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stack: {
    gap: 12,
    paddingVertical: 8,
  },
  label: {
    textAlign: "center",
  },
});
