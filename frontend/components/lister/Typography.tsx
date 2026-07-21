import { Text as RNText, type TextProps, StyleSheet } from "react-native";
import { Lister } from "@/constants/listerTheme";

type Variant = "display" | "title" | "subtitle" | "body" | "caption" | "label";

type Props = TextProps & {
  variant?: Variant;
  tone?: "ink" | "muted" | "faint" | "primary" | "inverse" | "brass" | "danger";
};

const variantStyle: Record<Variant, object> = {
  display: {
    fontFamily: Lister.type.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: Lister.type.displayMedium,
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 17,
    lineHeight: 24,
  },
  body: {
    fontFamily: Lister.type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: Lister.type.body,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
};

const toneColor = {
  ink: Lister.color.ink,
  muted: Lister.color.inkMuted,
  faint: Lister.color.inkFaint,
  primary: Lister.color.primary,
  inverse: Lister.color.surface,
  brass: Lister.color.brass,
  danger: Lister.color.danger,
};

export function LText({
  variant = "body",
  tone = "ink",
  style,
  ...props
}: Props) {
  return (
    <RNText
      style={[variantStyle[variant], { color: toneColor[tone] }, style]}
      {...props}
    />
  );
}

export const listerTextStyles = StyleSheet.create({
  // kept for rare StyleSheet composition
});
