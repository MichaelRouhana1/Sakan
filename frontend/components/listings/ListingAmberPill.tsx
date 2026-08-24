import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Skoun } from "@/constants/theme";
import type { ListingAmberPill as Pill } from "@/lib/listingCardMeta";
import { LISTING_PILL_ICONS } from "@/lib/listingPillIcons";

type Props = {
  pill: Pill;
  highlight?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ListingAmberPillView({
  pill,
  highlight,
  compact,
  style,
  textStyle,
}: Props) {
  const Icon = pill.icon ? LISTING_PILL_ICONS[pill.icon] : null;
  const iconSize = compact ? 10 : 11;
  const color = Skoun.color.ink;

  return (
    <View
      style={[
        styles.tag,
        compact && styles.tagCompact,
        highlight && styles.tagHighlight,
        style,
      ]}
    >
      {Icon ? <Icon size={iconSize} color={color} strokeWidth={2} /> : null}
      <Text style={[styles.tagText, compact && styles.tagTextCompact, textStyle]}>
        {pill.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tagCompact: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    gap: 3,
  },
  tagHighlight: {
    backgroundColor: "rgba(47, 111, 237, 0.06)",
    borderColor: "rgba(47, 111, 237, 0.2)",
  },
  tagText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: Skoun.color.ink,
  },
  tagTextCompact: {
    fontSize: 10,
  },
});
