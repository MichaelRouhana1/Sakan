import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

type Props = {
  houseRules?: string[] | null;
  cancellationPolicy?: string | null;
};

type Row = { title: string; body: string };

export function ListingDetailHouseRules({
  houseRules,
  cancellationPolicy,
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
        next.push({ title: `House rule ${i + 1}`, body: text });
      }
    });
    return next;
  }, [houseRules, cancellationPolicy]);

  const [open, setOpen] = useState<Record<number, boolean>>({});

  if (rows.length === 0) return null;

  return (
    <View style={styles.card}>
      <LText variant="title" style={styles.heading}>
        House rules
      </LText>
      {rows.map((row, i) => {
        const expanded = Boolean(open[i]);
        const long = row.body.length > 90;
        const preview =
          !expanded && long ? `${row.body.slice(0, 90).trim()}…` : row.body;
        return (
          <View
            key={`${row.title}-${i}`}
            style={[styles.row, i > 0 && styles.rowBorder]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={Skoun.color.primary}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <LText variant="subtitle">{row.title}</LText>
              <LText variant="caption" tone="muted">
                {preview}
              </LText>
              {long ? (
                <Pressable
                  accessibilityRole="button"
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
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  heading: { fontSize: 18, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Skoun.color.border,
  },
  more: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
});
