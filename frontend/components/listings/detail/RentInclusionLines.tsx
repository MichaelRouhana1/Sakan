import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  rentInclusionLines,
  type RentInclusionInput,
} from "@/lib/rentInclusion";

export function RentInclusionLines({ listing }: { listing: RentInclusionInput }) {
  const lines = rentInclusionLines(listing);
  return (
    <View testID="rent-inclusion-lines" style={styles.block}>
      <LText variant="caption" tone="muted">
        Included in the USD rent
      </LText>
      {lines.map((line) => (
        <LText
          key={line.key}
          testID={`rent-inclusion-${line.key}`}
          variant="caption"
          tone={line.included ? undefined : "muted"}
          style={line.included ? styles.on : undefined}
        >
          {line.detail}
        </LText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4, paddingTop: 4 },
  on: {
    fontFamily: Skoun.type.bodySemi,
    color: Skoun.color.ink,
  },
});
