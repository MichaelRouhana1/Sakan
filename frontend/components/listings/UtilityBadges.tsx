import { StyleSheet, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Pick<
    Listing,
    "electricity" | "water" | "wifiIncluded" | "routerUps" | "elevator24_7"
  >;
};

export function UtilityBadges({ listing }: Props) {
  return (
    <View style={styles.row}>
      <Badge label={ELECTRICITY_LABELS[listing.electricity]} />
      <Badge label={WATER_LABELS[listing.water]} />
      {listing.wifiIncluded ? <Badge label="Wi-Fi Included" /> : null}
      {listing.routerUps ? <Badge label="Router UPS" /> : null}
      {listing.elevator24_7 ? <Badge label="24/7 Elevator" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
