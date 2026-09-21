import { StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
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

export function PriceGuideCard({ guide, priceBasis, onUse }: {
  guide: PriceGuide;
  priceBasis: PriceBasis;
  onUse: () => void;
}) {
  return (
    <View testID="price-guide" style={styles.card}>
      <LText variant="subtitle">Similar on Skoun</LText>
      <LText>Often {dollars(guide.lowUsd)}–{dollars(guide.highUsd)} / month</LText>
      <LText variant="caption" tone="muted">{BASIS_LABEL[priceBasis]}</LText>
      <LText variant="caption" tone="muted">
        Median {dollars(guide.medianUsd)} · based on {guide.n} live listings
      </LText>
      <LButton
        variant="secondary"
        label={`Use ${dollars(guide.medianUsd)}`}
        accessibilityHint="Fills monthly rent. You can still edit the amount."
        onPress={onUse}
        style={styles.button}
      />
      <LText variant="caption" tone="muted">
        Asking prices on Skoun; no guarantee of renting.
      </LText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Lister.space.sm,
    padding: Lister.space.md,
    backgroundColor: Lister.color.surfaceMuted,
    borderColor: Lister.color.border,
    borderWidth: 1,
    borderRadius: Lister.radius.md,
  },
  button: { alignSelf: "flex-start", marginVertical: Lister.space.xs },
});
