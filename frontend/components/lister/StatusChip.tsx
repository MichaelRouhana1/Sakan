import { StyleSheet, View } from "react-native";
import { Lister } from "@/constants/listerTheme";
import { labelStatus } from "@/lib/listingLabels";
import type { ListingStatus } from "@/types/listing";
import { LText } from "./Typography";

const palette: Record<
  ListingStatus,
  { bg: string; fg: string; border: string }
> = {
  active: {
    bg: Lister.color.primarySoft,
    fg: Lister.color.primaryDeep,
    border: Lister.color.primary,
  },
  draft: {
    bg: Lister.color.brassSoft,
    fg: Lister.color.draft,
    border: Lister.color.brass,
  },
  archived: {
    bg: "#EEF0F2",
    fg: Lister.color.archived,
    border: Lister.color.borderStrong,
  },
  removed: {
    bg: Lister.color.dangerSoft,
    fg: Lister.color.removed,
    border: Lister.color.danger,
  },
};

export function StatusChip({ status }: { status: ListingStatus }) {
  const colors = palette[status];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.fg }]} />
      <LText variant="caption" style={{ color: colors.fg, fontFamily: Lister.type.bodySemi }}>
        {labelStatus(status)}
      </LText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Lister.radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
