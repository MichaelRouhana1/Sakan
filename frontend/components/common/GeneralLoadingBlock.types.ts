import type { StyleProp, ViewStyle } from "react-native";

/** Matches `thinking-orbs` OrbState — kept here so native builds don't import the web package. */
export type LoadingOrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

export type LoadingOrbTheme = "auto" | "dark" | "light";

export type GeneralLoadingLayout = "page" | "inline" | "stack";

export type GeneralLoadingBlockProps = {
  /** Shown beside the orb and passed as the orb's accessible name on web. */
  label?: string;
  state?: LoadingOrbState;
  /**
   * Web display size in px. `thinking-orbs` ships 64 and 20 presets; 32 uses
   * the 64 design scaled to 32px. Native: ignored (spinner size uses `layout`).
   */
  size?: 64 | 32 | 20;
  theme?: LoadingOrbTheme;
  layout?: GeneralLoadingLayout;
  /** When false, `label` is still the accessible name but not painted. */
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
};
