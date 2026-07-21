import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Lister } from "@/constants/listerTheme";
import { labelElectricity, labelWater } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";
import { LText } from "./Typography";

type Props = {
  listing: Pick<
    Listing,
    "electricity" | "water" | "wifiIncluded" | "routerUps" | "elevator24_7"
  >;
};

function Pill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={Lister.color.primaryDeep} />
      <LText variant="caption" tone="ink" style={styles.label}>
        {label}
      </LText>
    </View>
  );
}

export function UtilityPills({ listing }: Props) {
  return (
    <View style={styles.row}>
      <Pill icon="flash-outline" label={labelElectricity(listing.electricity)} />
      <Pill icon="water-outline" label={labelWater(listing.water)} />
      {listing.wifiIncluded ? (
        <Pill icon="wifi-outline" label="Wi‑Fi included" />
      ) : null}
      {listing.routerUps ? (
        <Pill icon="battery-charging-outline" label="Router UPS" />
      ) : null}
      {listing.elevator24_7 ? (
        <Pill icon="swap-vertical-outline" label="24/7 Elevator" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Lister.radius.sm,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  label: {
    fontFamily: Lister.type.bodyMedium,
  },
});
