import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";

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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const reducedMotion = useReducedMotion();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.card,
        !reducedMotion && webCardTransition,
        hovered && !selected && !error && styles.cardHover,
        selected && styles.cardOn,
        error && !selected && styles.cardError,
        pressed && (!reducedMotion ? styles.cardPressedScale : styles.cardPressedFade),
      ]}
    >
      {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
        <>
          {icon ? (
            <View style={[styles.iconWrap, selected && styles.iconOn]}>
              <Ionicons
                name={icon}
                size={designSize(20)}
                color={selected ? Lister.color.ink : Lister.color.inkMuted}
              />
            </View>
          ) : null}
          <View style={styles.copy}>
            <LText variant="subtitle" style={styles.title}>
              {title}
            </LText>
            {body ? (
              <LText variant="caption" tone="muted">
                {body}
              </LText>
            ) : null}
            {children}
          </View>
          <View
            style={[
              styles.indicator,
              hovered && !selected && styles.indicatorHover,
              selected && styles.indicatorSelected,
              !reducedMotion && webCardTransition,
            ]}
          >
            {selected ? (
              <Ionicons
                name="checkmark"
                size={designSize(12)}
                color={Lister.color.surface}
              />
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

const webCardTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "border-color, background-color, transform",
        transitionDuration: "150ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const baseStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {}),
  },
  cardHover: {
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.bg,
  },
  cardOn: {
    padding: 15,
    borderWidth: 2,
    borderColor: Lister.color.ink,
    backgroundColor: Lister.color.bg,
  },
  cardError: {
    padding: 15,
    borderWidth: 2,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  cardPressedScale: {
    transform: [{ scale: 0.988 }],
  },
  cardPressedFade: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconOn: {
    backgroundColor: Lister.color.surface,
    borderColor: Lister.color.border,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  indicator: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  indicatorHover: {
    borderColor: Lister.color.borderStrong,
  },
  indicatorSelected: {
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
  },
});
