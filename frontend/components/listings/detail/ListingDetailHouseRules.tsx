import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import {
  listingDetailChrome as chrome,
  type ListingDetailVariant,
} from "@/components/listings/detail/listingDetailChrome";
import { Studently } from "@/constants/theme";

type Props = {
  houseRules?: string[] | null;
  cancellationPolicy?: string | null;
  variant?: ListingDetailVariant;
};

type Row = { title: string; body: string };
const STANDARD_RULES = ["smoking", "pets", "overnight guests"];

export function ListingDetailHouseRules({
  houseRules,
  cancellationPolicy,
  variant = "card",
}: Props) {
  const rows = useMemo(() => {
    const next: Row[] = [];
    if (cancellationPolicy?.trim()) {
      next.push({ title: "Cancellation", body: cancellationPolicy.trim() });
    }
    (houseRules ?? []).forEach((rule, i) => {
      const text = rule.trim();
      if (!text) return;
      const split = text.indexOf(":");
      if (split > 0 && split < 48) {
        next.push({
          title: text.slice(0, split).trim(),
          body: text.slice(split + 1).trim(),
        });
      } else {
        next.push({
          title: text.toLowerCase() === "quiet study hours enforced" ? "Quiet hours" : `House rule ${i + 1}`,
          body: text,
        });
      }
    });
    return next;
  }, [houseRules, cancellationPolicy]);

  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [contentWidth, setContentWidth] = useState(0);

  const web = variant === "web";
  const indexedRows = rows.map((row, index) => ({ ...row, index }));
  const standardRows = STANDARD_RULES.map(title =>
    indexedRows.find(row => row.title.toLowerCase() === title),
  ).filter(row => row !== undefined);
  const hasStandardTrio = standardRows.length === STANDARD_RULES.length;
  const primary = hasStandardTrio ? standardRows : indexedRows.slice(0, 3);
  const secondary = indexedRows.filter(row => !primary.includes(row));
  const threeAcross = contentWidth >= 600 && rows.length === 3 && hasStandardTrio;
  const twoColumns = contentWidth >= 440 && rows.length >= 4;
  const columns = threeAcross
    ? standardRows.map(row => [row])
    : twoColumns
      ? [primary, secondary]
      : [indexedRows];

  if (rows.length === 0) return null;

  return (
    <View testID="listing-house-rules" style={[web ? chrome.web : chrome.card, styles.gap]}>
      <LText
        accessibilityRole="header"
        variant="title"
        style={[web ? chrome.webHeading : chrome.cardHeading, styles.heading]}
      >
        House rules
      </LText>
      <View
        onLayout={event => setContentWidth(event.nativeEvent.layout.width)}
        style={[styles.content, columns.length > 1 && styles.columns]}
      >
        {columns.map((column, columnIndex) => (
          <View
            key={columnIndex}
            style={[styles.column, threeAcross && columnIndex > 0 && styles.columnDivider]}
          >
            {column.map((row, rowIndex) => {
              const i = row.index;
              const expanded = Boolean(open[i]);
              const long = row.body.length > 90;
              const preview =
                !expanded && long ? `${row.body.slice(0, 90).trim()}…` : row.body;
              return (
                <View
                  key={`${row.title}-${i}`}
                  style={[styles.row, rowIndex > 0 && styles.rowBorder]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={Studently.color.primary}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <LText variant="subtitle">{row.title}</LText>
                    <LText variant="caption" tone="muted">
                      {preview}
                    </LText>
                    {long ? (
                      <Pressable
                        accessibilityRole="button"
                        aria-expanded={expanded}
                        onPress={() =>
                          setOpen((prev) => ({ ...prev, [i]: !prev[i] }))
                        }
                      >
                        <LText variant="caption" style={styles.more}>
                          {expanded ? "Show less" : "View more"}
                        </LText>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 4 },
  heading: { marginBottom: 8 },
  content: { gap: 0 },
  columns: { flexDirection: "row", gap: 28, alignItems: "stretch" },
  column: { flex: 1, minWidth: 0 },
  columnDivider: {
    paddingLeft: 24,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Studently.color.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Studently.color.border,
  },
  more: {
    color: Studently.color.primary,
    fontFamily: Studently.type.bodySemi,
  },
});
