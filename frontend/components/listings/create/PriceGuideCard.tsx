import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import type { PriceGuide } from "@/features/listings/usePriceGuide";
import type { PriceBasis } from "@/types/listing";

const BASIS_LABEL: Record<PriceBasis, string> = {
  per_unit_month: "Per unit",
  per_room_month: "Per room",
  per_bed_month: "Per bed",
};

const dollars = (value: number) => `$${value.toLocaleString("en-US")}`;

export function PriceGuideCard({
  guide,
  priceBasis,
  onUse,
}: {
  guide: PriceGuide;
  priceBasis: PriceBasis;
  onUse: () => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const narrow = useLayoutWidth() < 460;

  return (
    <View testID="price-guide" style={styles.card}>
      <View style={[styles.mainRow, narrow && styles.mainRowStacked]}>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <LText variant="caption" style={styles.heading}>
              Similar on Studently
            </LText>
            <LText variant="caption" tone="muted" style={styles.dot}>
              ·
            </LText>
            <LText variant="caption" tone="muted">
              {BASIS_LABEL[priceBasis]}
            </LText>
          </View>
          <LText style={styles.range}>
            Often {dollars(guide.lowUsd)}–{dollars(guide.highUsd)} / month
          </LText>
          <LText variant="caption" tone="muted" style={styles.median}>
            Median {dollars(guide.medianUsd)} · based on {guide.n} live listings
          </LText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Use ${dollars(guide.medianUsd)}`}
          accessibilityHint="Fills monthly rent. You can still edit the amount."
          onPress={onUse}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.useBtn,
            narrow && styles.useBtnFull,
            hovered && styles.useBtnHover,
            pressed && styles.useBtnPressed,
          ]}
        >
          <LText variant="caption" style={styles.useBtnText}>
            {`Use ${dollars(guide.medianUsd)}`}
          </LText>
        </Pressable>
      </View>

      <LText variant="caption" tone="muted" style={styles.disclaimer}>
        Asking prices on Studently; no guarantee of renting.
      </LText>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  card: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Lister.color.surfaceMuted,
    borderColor: Lister.color.border,
    borderWidth: 1,
    borderRadius: Lister.radius.md,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  mainRowStacked: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  heading: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  dot: {
    color: Lister.color.inkFaint,
  },
  range: {
    fontFamily: Lister.type.display,
    fontSize: 17,
    lineHeight: 23,
    color: Lister.color.ink,
    fontVariant: ["tabular-nums"],
  },
  median: {
    fontVariant: ["tabular-nums"],
  },
  useBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {}),
  },
  useBtnFull: {
    alignSelf: "flex-start",
  },
  useBtnHover: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  useBtnPressed: {
    opacity: 0.88,
  },
  useBtnText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    color: Lister.color.ink,
    fontVariant: ["tabular-nums"],
  },
  disclaimer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
    fontSize: 12,
    lineHeight: 17,
  },
});
