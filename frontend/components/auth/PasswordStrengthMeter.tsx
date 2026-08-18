import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Skoun } from "@/constants/theme";
import {
  getPasswordChecks,
  getPasswordTier,
  PASSWORD_CHECK_LABELS,
  type PasswordCheckKey,
  type PasswordTier,
} from "@/lib/passwordStrength";

const TIER_COLOR: Record<Exclude<PasswordTier, "empty">, string> = {
  weak: "#DC2626",
  better: "#EA580C",
  strong: "#16A34A",
};

const CHECK_ORDER: PasswordCheckKey[] = [
  "length",
  "lower",
  "upper",
  "number",
  "special",
];

type Props = {
  password: string;
};

export function PasswordStrengthMeter({ password }: Props) {
  const tier = getPasswordTier(password);
  const checks = getPasswordChecks(password);
  const filled = tier === "empty" ? 0 : tier === "weak" ? 1 : tier === "better" ? 2 : 3;
  const barColor = tier === "empty" ? "#E4E4E7" : TIER_COLOR[tier];

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i < filled ? barColor : "#E4E4E7" },
            ]}
          />
        ))}
      </View>
      <View style={styles.labels}>
        {(["weak", "better", "strong"] as const).map((key) => (
          <Text
            key={key}
            style={[
              styles.tierLabel,
              tier === key ? { color: TIER_COLOR[key], fontFamily: Skoun.type.bodySemi } : null,
            ]}
          >
            {key === "better" ? "Better" : key === "strong" ? "Strong" : "Weak"}
          </Text>
        ))}
      </View>
      <View style={styles.checks}>
        {CHECK_ORDER.map((key) => {
          const on = checks[key];
          return (
            <View key={key} style={styles.checkRow}>
              <Ionicons
                name={on ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={on ? "#16A34A" : "#A1A1AA"}
              />
              <Text style={[styles.checkText, on && styles.checkOn]}>
                {PASSWORD_CHECK_LABELS[key]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  bars: { flexDirection: "row", gap: 6 },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tierLabel: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: "#A1A1AA",
    textTransform: "capitalize",
  },
  checks: { gap: 4 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkText: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: "#71717A",
  },
  checkOn: {
    color: "#3F3F46",
  },
});
