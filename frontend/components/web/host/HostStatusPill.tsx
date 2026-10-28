import { StyleSheet, Text, View } from "react-native";
import { Studently } from "@/constants/theme";

type PillTone = "progress" | "action" | "live" | "muted";

const TONES: Record<PillTone, { dot: string; text: string }> = {
  progress: { dot: "#F59E0B", text: Studently.color.ink },
  action: { dot: "#EF4444", text: Studently.color.ink },
  live: { dot: "#22C55E", text: Studently.color.ink },
  muted: { dot: "#94A3B8", text: Studently.color.inkMuted },
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
    boxShadow: "0 1px 6px rgba(0, 0, 0, 0.08)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
  },
});
