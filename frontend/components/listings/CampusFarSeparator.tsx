import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

type Props = {
  label: string;
};

/** Full-width near/far split on campus distance browse. */
export function CampusFarSeparator({ label }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="header"
      accessibilityLabel={label}
    >
      <View style={styles.rule} />
      <LText variant="caption" tone="muted" style={styles.label}>
        {label}
      </LText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingVertical: 8,
    gap: 10,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Skoun.color.border,
  },
  label: {
    fontFamily: Skoun.type.bodyMedium,
  },
});
