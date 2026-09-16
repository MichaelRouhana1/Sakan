import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  REPORT_REASONS,
  type ReportReasonAccent,
} from "@/features/reports/reasons";
import type { ReportReason } from "@/features/reports/useReportListing";

const IS_WEB = Platform.OS === "web";

const ACCENT: Record<
  ReportReasonAccent,
  { icon: string; well: string }
> = {
  danger: { icon: Skoun.color.danger, well: Skoun.color.dangerSoft },
  warning: { icon: Skoun.color.warning, well: Skoun.color.warningSoft },
  primary: { icon: Skoun.color.primary, well: Skoun.color.primaryMist },
};

type Props = {
  value: ReportReason | null;
  reduceMotion?: boolean;
  onChange: (reason: ReportReason) => void;
};

export function ReportReasonOptions({
  value,
  reduceMotion = false,
  onChange,
}: Props) {
  const duration = reduceMotion ? "0ms" : "200ms";

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Report reason"
      style={styles.list}
    >
      {REPORT_REASONS.map((item) => {
        const selected = value === item.value;
        const tint = ACCENT[item.accent];
        return (
          <Pressable
            key={item.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            accessibilityHint={item.hint}
            onPress={() => onChange(item.value)}
            style={({ hovered, pressed, focused }) => [
              styles.row,
              { transitionDuration: duration } as object,
              selected && styles.rowSelected,
              hovered && !selected && styles.rowHover,
              pressed && styles.rowPressed,
              focused && styles.rowFocus,
            ]}
          >
            <View
              style={[
                styles.well,
                { transitionDuration: duration } as object,
                selected && { backgroundColor: tint.well },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={selected ? tint.icon : Skoun.color.inkMuted}
              />
            </View>
            <View style={styles.copy}>
              <LText
                variant="subtitle"
                style={selected ? styles.labelOn : styles.label}
              >
                {item.label}
              </LText>
              <LText variant="caption" tone="muted">
                {item.hint}
              </LText>
            </View>
            <View
              style={[styles.radio, selected && styles.radioOn]}
              accessibilityElementsHidden
            >
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
    ...(IS_WEB
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color, border-color, box-shadow",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  rowHover: {
    borderColor: Skoun.color.borderStrong,
    backgroundColor: "#EEF2F7",
  },
  rowSelected: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  rowPressed: {
    opacity: 0.94,
  },
  rowFocus: {
    ...(IS_WEB
      ? ({
          outlineWidth: 2,
          outlineStyle: "solid",
          outlineColor: Skoun.color.primary,
          outlineOffset: 2,
        } as object)
      : null),
  },
  well: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.surfaceMuted,
    ...(IS_WEB
      ? ({
          transitionProperty: "background-color",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  labelOn: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Skoun.type.bodySemi,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Skoun.color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.surface,
  },
  radioOn: {
    borderColor: Skoun.color.primaryDeep,
    backgroundColor: Skoun.color.primaryDeep,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Skoun.color.surface,
  },
});
