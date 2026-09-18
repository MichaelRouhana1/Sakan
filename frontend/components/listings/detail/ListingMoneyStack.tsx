import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { listingMoveInRows } from "@/components/listings/detail/listingMoveIn";
import { Skoun } from "@/constants/theme";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  align?: "start" | "end";
  /** `ledger` = three-cell stub. `stack` = compact stacked facts. */
  layout?: "ledger" | "stack";
};

export function ListingMoneyStack({
  listing,
  align = "start",
  layout,
}: Props) {
  const rows = listingMoveInRows(listing);
  if (rows.length === 0) return null;
  const mode = layout ?? (align === "end" ? "stack" : "ledger");

  if (mode === "ledger") {
    return (
      <View style={styles.ledger}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[styles.cell, i > 0 && styles.cellRule]}
          >
            <LText variant="caption" style={styles.kicker}>
              {row.label}
            </LText>
            <LText variant="caption" style={styles.amt}>
              {row.value}
            </LText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.stack, align === "end" && styles.end]}>
      {rows.map((row) => (
        <View
          key={row.label}
          style={[styles.stackCell, align === "end" && styles.end]}
        >
          <LText variant="caption" style={styles.kicker}>
            {row.label}
          </LText>
          <LText variant="caption" style={styles.amt}>
            {row.value}
          </LText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ledger: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cell: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingRight: 8,
  },
  cellRule: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "#C9D4E4",
    paddingLeft: 10,
    paddingRight: 0,
  },
  stack: {
    gap: 8,
    marginTop: 4,
  },
  stackCell: {
    gap: 1,
  },
  end: {
    alignItems: "flex-end",
  },
  kicker: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: Skoun.color.inkMuted,
  },
  amt: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    lineHeight: 17,
    color: Skoun.color.ink,
    fontVariant: ["tabular-nums"],
  },
});
