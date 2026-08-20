import { StyleSheet, Text, View } from "react-native";
import { Skoun } from "@/constants/theme";

type PillTone = "progress" | "action" | "live" | "muted";

const TONES: Record<PillTone, { dot: string; text: string }> = {
  progress: { dot: "#F59E0B", text: Skoun.color.ink },
  action: { dot: "#EF4444", text: Skoun.color.ink },
  live: { dot: "#22C55E", text: Skoun.color.ink },
  muted: { dot: "#94A3B8", text: Skoun.color.inkMuted },
};

type Props = {
  label: string;
  tone?: PillTone;
};

export function HostStatusPill({ label, tone = "muted" }: Props) {
  const colors = TONES[tone];
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
  },
});
