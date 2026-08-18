import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";

type Props = {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  error?: boolean;
};

export function SegmentedPills({ options, value, onChange, error }: Props) {
  return (
    <View style={[styles.wrap, error && styles.wrapError]}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, on && styles.pillOn]}
          >
            <LText
              variant="caption"
              style={[styles.label, on && styles.labelOn]}
            >
              {opt.label}
            </LText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wrapError: {
    borderWidth: 2,
    borderColor: Lister.color.danger,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.dangerSoft,
    padding: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Lister.radius.pill,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    cursor: "pointer",
  },
  pillOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  label: { fontFamily: Lister.type.bodySemi, color: Lister.color.ink },
  labelOn: { color: Lister.color.primaryDeep },
});
