import { useState, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";

type PlaceKind = "apartment" | "building";
export type PlaceTypeLook = "1" | "2" | "3";
type Ion = ComponentProps<typeof Ionicons>["name"];

const LOOK_STORAGE_KEY = "studently.placeTypeVariant";
const VARIANTS: readonly PlaceTypeLook[] = ["1", "2", "3"];

function readInitialLook(): PlaceTypeLook {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(LOOK_STORAGE_KEY);
      if (saved === "1" || saved === "2" || saved === "3") return saved;
    } catch {
      /* ignore private mode */
    }
  }
  return "3";
}

export function usePlaceTypeLook(): [PlaceTypeLook, (next: PlaceTypeLook) => void] {
  const [look, setLookState] = useState<PlaceTypeLook>(readInitialLook);

  function setLook(next: PlaceTypeLook) {
    setLookState(next);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOOK_STORAGE_KEY, next);
      } catch {
        /* ignore private mode */
      }
    }
  }

  return [look, setLook];
}

export function PlaceTypeLookToggle({
  look,
  onChange,
}: {
  look: PlaceTypeLook;
  onChange: (next: PlaceTypeLook) => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View
      testID="place-type-look-toggle"
      accessibilityRole="radiogroup"
      accessibilityLabel="Place step design variant"
      style={styles.toggleTrack}
    >
      {VARIANTS.map((mode) => {
        const active = look === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityLabel={`Design ${mode}`}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(mode)}
            style={[styles.toggleItem, active && styles.toggleItemActive]}
          >
            <LText
              variant="caption"
              style={[styles.toggleLabel, active && styles.toggleLabelActive]}
            >
              {mode}
            </LText>
          </Pressable>
        );
      })}
    </View>
  );
}

type Props = {
  kind: PlaceKind | null;
  look?: PlaceTypeLook;
  onSelect: (kind: PlaceKind) => void;
};

const OPTIONS: {
  kind: PlaceKind;
  icon: Ion;
  title: string;
  badge: string;
  body: string;
  scope: string;
  nextHint: string;
}[] = [
  {
    kind: "apartment",
    icon: "home-outline",
    title: "An apartment",
    badge: "Flat · rooms",
    body: "A whole apartment, or rooms and beds within it.",
    scope: "Whole unit · Rooms · Shared beds",
    nextHint:
      "Next: Pin the address and set power & water once, then describe the apartment or its rooms.",
  },
  {
    kind: "building",
    icon: "business-outline",
    title: "A building",
    badge: "Multi-unit",
    body: "Whole apartments that share one building.",
    scope: "Multi-unit · Shared utilities & rules",
    nextHint:
      "Next: Set the building’s address, power, and rules once—then add each apartment without repeating shared details.",
  },
];

export function CreateStepPlaceType({ kind, look = "3", onSelect }: Props) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const sideBySide = layoutWidth >= 480;
  const reducedMotion = useReducedMotion();

  const activeOption = OPTIONS.find((opt) => opt.kind === kind) ?? null;

  /* Variant 1: Original stacked madder-mist cards */
  if (look === "1") {
    return (
      <View style={styles.oldStack}>
        {OPTIONS.map((opt) => {
          const selected = kind === opt.kind;
          return (
            <Pressable
              key={opt.kind}
              accessibilityRole="button"
              accessibilityLabel={opt.title}
              accessibilityState={{ selected }}
              onPress={() => onSelect(opt.kind)}
              style={({ pressed }) => [
                styles.oldCard,
                selected && styles.oldCardOn,
                pressed && styles.cardPressedFade,
              ]}
            >
              <View style={[styles.oldIconWrap, selected && styles.oldIconOn]}>
                <Ionicons
                  name={opt.icon}
                  size={designSize(22)}
                  color={selected ? Lister.color.primary : Lister.color.inkMuted}
                />
              </View>
              <View style={styles.oldCopy}>
                <LText variant="subtitle">{opt.title}</LText>
                <LText variant="caption" tone="muted">
                  {opt.body}
                </LText>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  /* Variant 2: Side-by-side architectural ink-framed cards */
  if (look === "2") {
    return (
      <View style={styles.v2Root}>
        <View style={[styles.v2Grid, sideBySide && styles.v2GridRow]}>
          {OPTIONS.map((opt) => {
            const selected = kind === opt.kind;
            return (
              <Pressable
                key={opt.kind}
                accessibilityRole="button"
                accessibilityLabel={opt.title}
                accessibilityState={{ selected }}
                onPress={() => onSelect(opt.kind)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.v2Card,
                  sideBySide && styles.v2CardHalf,
                  !reducedMotion && webCardTransition,
                  hovered && !selected && styles.v2CardHover,
                  selected && styles.v2CardSelected,
                  pressed && (!reducedMotion ? styles.cardPressedScale : styles.cardPressedFade),
                ]}
              >
                {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
                  <>
                    <View style={styles.v2TopRow}>
                      <View style={[styles.v2IconFrame, selected && styles.v2IconFrameSelected]}>
                        <Ionicons
                          name={opt.icon}
                          size={designSize(22)}
                          color={selected ? Lister.color.ink : Lister.color.inkMuted}
                        />
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
                            size={designSize(13)}
                            color={Lister.color.surface}
                          />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.v2CopyBlock}>
                      <LText style={styles.v2Title}>{opt.title}</LText>
                      <LText variant="caption" tone="muted" style={styles.v2Body}>
                        {opt.body}
                      </LText>
                    </View>

                    <View style={styles.v2ScopeFooter}>
                      <LText
                        variant="caption"
                        style={[styles.v2ScopeText, selected && styles.v2ScopeTextSelected]}
                      >
                        {opt.scope}
                      </LText>
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {activeOption ? (
          <View style={styles.v2NextStrip} accessibilityLiveRegion="polite">
            <LText variant="caption" tone="muted" style={styles.v2NextText}>
              {activeOption.nextHint}
            </LText>
          </View>
        ) : null}
      </View>
    );
  }

  /* Variant 3: Open editorial hairline ledger */
  return (
    <View style={styles.v3Ledger}>
      {OPTIONS.map((opt, index) => {
        const selected = kind === opt.kind;
        return (
          <View key={opt.kind}>
            {index > 0 ? <View style={styles.v3Hairline} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={opt.title}
              accessibilityState={{ selected }}
              onPress={() => onSelect(opt.kind)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.v3Row,
                !sideBySide && styles.v3RowCompact,
                !reducedMotion && webRowTransition,
                hovered && !selected && styles.v3RowHover,
                selected && styles.v3RowSelected,
                pressed && styles.cardPressedFade,
              ]}
            >
              {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
                <>
                  <View
                    style={[
                      styles.v3Emblem,
                      hovered && !selected && styles.v3EmblemHover,
                      selected && styles.v3EmblemSelected,
                      !reducedMotion && webCardTransition,
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={designSize(22)}
                      color={selected ? Lister.color.surface : Lister.color.inkMuted}
                    />
                  </View>

                  <View style={styles.v3Copy}>
                    <View style={styles.v3TitleRow}>
                      <LText style={styles.v3Title}>{opt.title}</LText>
                      <View style={[styles.v3Badge, selected && styles.v3BadgeSelected]}>
                        <LText
                          variant="caption"
                          style={[styles.v3BadgeText, selected && styles.v3BadgeTextSelected]}
                        >
                          {opt.badge}
                        </LText>
                      </View>
                    </View>
                    <LText
                      variant="caption"
                      style={[styles.v3Body, selected && styles.v3BodySelected]}
                    >
                      {opt.body}
                    </LText>
                  </View>

                  <View
                    style={[
                      styles.v3Check,
                      hovered && !selected && styles.indicatorHover,
                      selected && styles.indicatorSelected,
                      !reducedMotion && webCardTransition,
                    ]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={designSize(13)}
                        color={Lister.color.surface}
                      />
                    ) : null}
                  </View>
                </>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const webPointer =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {};

const webCardTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "border-color, background-color, transform",
        transitionDuration: "150ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const webRowTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "background-color",
        transitionDuration: "150ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const baseStyles = StyleSheet.create({
  /* Header 1 | 2 | 3 Toggle */
  toggleTrack: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    padding: 3,
    gap: 2,
    borderRadius: 9,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  toggleItem: {
    minWidth: 32,
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    ...webPointer,
  },
  toggleItemActive: {
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  toggleLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    color: Lister.color.inkMuted,
  },
  toggleLabelActive: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },

  /* Shared Press & Indicator States */
  cardPressedScale: {
    transform: [{ scale: 0.988 }],
  },
  cardPressedFade: {
    opacity: 0.92,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
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

  /* Variant 1: Original stacked madder-mist cards */
  oldStack: {
    gap: 18,
  },
  oldCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: Lister.radius.lg,
    borderWidth: 2,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  oldCardOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  oldIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surfaceMuted,
  },
  oldIconOn: {
    backgroundColor: Lister.color.surface,
  },
  oldCopy: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },

  /* Variant 2: Side-by-side architectural cards */
  v2Root: {
    gap: 18,
  },
  v2Grid: {
    gap: 12,
  },
  v2GridRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  v2Card: {
    padding: 18,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    justifyContent: "space-between",
    gap: 16,
    ...webPointer,
  },
  v2CardHalf: {
    flex: 1,
    minWidth: 0,
  },
  v2CardHover: {
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.bg,
  },
  v2CardSelected: {
    padding: 17,
    borderWidth: 2,
    borderColor: Lister.color.ink,
    backgroundColor: Lister.color.bg,
  },
  v2TopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  v2IconFrame: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  v2IconFrameSelected: {
    backgroundColor: Lister.color.surface,
    borderColor: Lister.color.border,
  },
  v2CopyBlock: {
    gap: 6,
  },
  v2Title: {
    fontFamily: Lister.type.display,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: Lister.color.ink,
  },
  v2Body: {
    fontSize: 14,
    lineHeight: 20,
  },
  v2ScopeFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
  },
  v2ScopeText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
    color: Lister.color.inkMuted,
  },
  v2ScopeTextSelected: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  v2NextStrip: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
  },
  v2NextText: {
    fontSize: 13,
    lineHeight: 20,
  },

  /* Variant 3: Open editorial hairline ledger */
  v3Ledger: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Lister.color.border,
  },
  v3Hairline: {
    height: 1,
    backgroundColor: Lister.color.border,
  },
  v3Row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 14,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  v3RowCompact: {
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  v3RowHover: {
    backgroundColor: Lister.color.bg,
  },
  v3RowSelected: {
    backgroundColor: Lister.color.bg,
  },
  v3Emblem: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
    flexShrink: 0,
  },
  v3EmblemHover: {
    borderColor: Lister.color.borderStrong,
  },
  v3EmblemSelected: {
    backgroundColor: Lister.color.primary,
    borderColor: Lister.color.primary,
  },
  v3Copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  v3TitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  v3Title: {
    fontFamily: Lister.type.display,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.25,
    color: Lister.color.ink,
  },
  v3Badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Lister.color.surfaceMuted,
  },
  v3BadgeSelected: {
    backgroundColor: Lister.color.bgWash,
  },
  v3BadgeText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 11.5,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  v3BadgeTextSelected: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  v3Body: {
    fontSize: 14,
    lineHeight: 20,
    color: Lister.color.inkMuted,
  },
  v3BodySelected: {
    color: Lister.color.ink,
    opacity: 0.78,
  },
  v3Check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
