import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";
import { waterFactChips } from "@/lib/waterFacts";
import { powerFactChip } from "@/lib/electricityFacts";
import type { Listing } from "@/types/listing";

export function WaterFactChips({ listing }: { listing: Pick<Listing, "water" | "waterSources" | "hotWater" | "waterBillIncluded"> }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(base);
  const chips = waterFactChips(listing);
  if (!chips.length) return null;
  return (
    <View style={styles.row} accessibilityLabel={chips.join(", ")}>
      {chips.map((chip) => (
        <View key={chip} style={styles.chip}>
          <LText variant="caption" style={{ fontSize: designSize(12), color: Studently.color.ink }}>
            {chip}
          </LText>
        </View>
      ))}
    </View>
  );
}

export function PowerFactChip({ listing }: { listing: Pick<Listing, "electricity" | "powerSources" | "powerHours" | "hasSolar"> }) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(base);
  const chip = powerFactChip(listing);
  if (!chip) return null;
  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <LText variant="caption">{chip}</LText>
      </View>
    </View>
  );
}

const base = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Studently.color.surface,
  },
});
