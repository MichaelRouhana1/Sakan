import { StyleSheet, View } from "react-native";
import { ThinkingOrb } from "thinking-orbs";
import type { OrbSize, OrbState, OrbTheme } from "thinking-orbs";
import { LText } from "@/components/lister/Typography";
import type { GeneralLoadingBlockProps } from "@/components/common/GeneralLoadingBlock.types";

/**
 * Flatten every grey/white canvas pixel to black, then recolor with the active
 * brand. Hue-rotate alone cannot tint near-white cores, so they stayed grey.
 * `--sk-orb-tint` swaps with the palette.
 */
const ORB_TINT = "var(--sk-orb-tint)";

/** `thinking-orbs` only ships 64 and 20 presets; 32 uses the 64 design at 32px. */
function orbPresetSize(size: NonNullable<GeneralLoadingBlockProps["size"]>): OrbSize {
  return size === 20 ? 20 : 64;
}

export function GeneralLoadingBlock({
  label = "Loading…",
  state = "working",
  size = 64,
  theme = "auto",
  layout = "page",
  showLabel = true,
  style,
}: GeneralLoadingBlockProps) {
  const orbSize = orbPresetSize(size);
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
        style={{ filter: ORB_TINT, width: size, height: size }}
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
