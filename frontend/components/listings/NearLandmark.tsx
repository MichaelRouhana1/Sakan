import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";

type Props = {
  landmark: string | null | undefined;
  area?: string;
  compact?: boolean;
};

/** Trust cue for “near {landmark}” on cards / detail. */
export function NearLandmark({ landmark, area, compact }: Props) {
  if (!landmark?.trim()) {
    if (!area) return null;
    return (
      <View style={[styles.row, compact && styles.compact]}>
        <Ionicons
          name="navigate-outline"
          size={compact ? 13 : 16}
          color={Studently.color.inkMuted}
        />
        <LText variant="caption" tone="muted" numberOfLines={1}>
          {area}
        </LText>
      </View>
    );
  }

  return (
    <View
      style={[styles.row, styles.emphasis, compact && styles.compact]}
      accessibilityLabel={`Near ${landmark}`}
    >
      <Ionicons
        name="location"
        size={compact ? 13 : 16}
        color={Studently.color.primary}
      />
      <LText
        variant="caption"
        numberOfLines={2}
        style={styles.label}
      >
        {landmark.trim().toLowerCase().startsWith("near ")
          ? landmark.trim()
          : `Near ${landmark.trim()}`}
      </LText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compact: {
    marginTop: 2,
  },
  emphasis: {
    alignSelf: "flex-start",
    backgroundColor: Studently.color.primaryMist,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Studently.radius.pill,
    borderWidth: 1,
    borderColor: Studently.color.primarySoft,
    maxWidth: "100%",
  },
  label: {
    color: Studently.color.primaryDeep,
    fontFamily: Studently.type.bodySemi,
    flexShrink: 1,
  },
});
