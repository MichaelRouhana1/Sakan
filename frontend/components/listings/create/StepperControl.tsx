import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (n: number) => string;
  onChange: (n: number) => void;
  error?: boolean;
  required?: boolean;
};

export function StepperControl({
  label,
  value,
  min = 0,
  max = 20,
  step = 1,
  format,
  onChange,
  error,
  required,
}: Props) {
  return (
    <View style={[styles.row, error && styles.rowError]}>
      <LText variant="subtitle" style={styles.label}>
        {label}
        {required ? (
          <LText variant="subtitle" tone="danger">
            {" *"}
          </LText>
        ) : null}
      </LText>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, round(value - step)))}
          style={[styles.btn, value <= min && styles.btnOff]}
        >
          <Ionicons name="remove" size={18} color={Lister.color.ink} />
        </Pressable>
        <LText variant="subtitle" style={styles.value}>
          {format ? format(value) : String(value)}
        </LText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, round(value + step)))}
          style={[styles.btn, value >= max && styles.btnOff]}
        >
          <Ionicons name="add" size={18} color={Lister.color.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function round(n: number) {
  return Math.round(n * 2) / 2;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
  },
  rowError: {
    borderBottomColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
    borderRadius: Lister.radius.md,
    paddingHorizontal: 8,
  },
  label: { flex: 1, paddingRight: 12 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Lister.color.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surface,
    cursor: "pointer",
  },
  btnOff: { opacity: 0.4 },
  value: { minWidth: 36, textAlign: "center" },
});
