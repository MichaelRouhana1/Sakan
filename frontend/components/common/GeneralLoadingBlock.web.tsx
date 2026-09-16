import { StyleSheet, View } from "react-native";
import { ThinkingOrb } from "thinking-orbs";
import type { OrbSize, OrbState, OrbTheme } from "thinking-orbs";
import { LText } from "@/components/lister/Typography";
import type { GeneralLoadingBlockProps } from "@/components/common/GeneralLoadingBlock.types";

/**
 * Flatten every grey/white canvas pixel to black, then recolor to Skoun ocean
 * `#2F6FED`. Hue-rotate alone cannot tint near-white cores, so they stayed grey.
 */
const OCEAN_TINT =
  "brightness(0) invert(48%) sepia(25.5%) saturate(2500%) hue-rotate(181.4deg) brightness(77.1%) contrast(77.3%)";

export function GeneralLoadingBlock({
  label = "Loading…",
  state = "working",
  size = 64,
  theme = "auto",
  layout = "page",
  showLabel = true,
  style,
}: GeneralLoadingBlockProps) {
  const orbSize: OrbSize = size;
  const orbState: OrbState = state;
  const orbTheme: OrbTheme = theme;

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
      <ThinkingOrb
        state={orbState}
        size={orbSize}
        theme={orbTheme}
        aria-label={label}
        style={{ filter: OCEAN_TINT }}
      />
      {label && showLabel ? (
        <LText
          variant={layout === "inline" ? "caption" : "body"}
          tone="muted"
          style={layout === "stack" ? styles.stackLabel : layout === "page" ? styles.pageLabel : undefined}
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
    zIndex: 1,
  },
  stack: {
    gap: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  pageLabel: {
    textAlign: "center",
  },
  stackLabel: {
    lineHeight: 22,
    textAlign: "center",
  },
});
