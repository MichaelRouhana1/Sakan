import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";
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
  danger: { icon: Studently.color.danger, well: Studently.color.dangerSoft },
  warning: { icon: Studently.color.warning, well: Studently.color.warningSoft },
  primary: { icon: Studently.color.primary, well: Studently.color.primaryMist },
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
                color={selected ? tint.icon : Studently.color.inkMuted}
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
    borderRadius: Studently.radius.md,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.surfaceMuted,
    ...(IS_WEB
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color, border-color, box-shadow",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  rowHover: {
    borderColor: Studently.color.borderStrong,
    backgroundColor: "#EEF2F7",
  },
  rowSelected: {
    borderColor: Studently.color.primary,
    backgroundColor: Studently.color.primaryMist,
  },
  rowPressed: {
    opacity: 0.94,
  },
  rowFocus: {
    ...(IS_WEB
      ? ({
          outlineWidth: 2,
          outlineStyle: "solid",
          outlineColor: Studently.color.primary,
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
    backgroundColor: Studently.color.surfaceMuted,
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
    fontFamily: Studently.type.bodySemi,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Studently.color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Studently.color.surface,
  },
  radioOn: {
    borderColor: Studently.color.primaryDeep,
    backgroundColor: Studently.color.primaryDeep,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Studently.color.surface,
  },
});
