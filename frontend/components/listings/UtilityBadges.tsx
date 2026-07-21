import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { labelElectricity, labelWater } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Pick<
    Listing,
    "electricity" | "water" | "wifiIncluded" | "routerUps" | "elevator24_7"
  >;
  compact?: boolean;
};

function Badge({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={13} color={Skoun.color.primaryDeep} />
      <LText variant="caption" style={styles.label} numberOfLines={1}>
        {label}
      </LText>
    </View>
  );
}

export function UtilityBadges({ listing, compact }: Props) {
  const items: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }[] = [
    { icon: "flash-outline", label: labelElectricity(listing.electricity) },
    { icon: "water-outline", label: labelWater(listing.water) },
  ];
  if (listing.wifiIncluded) {
    items.push({ icon: "wifi-outline", label: "Wi‑Fi" });
  }
  if (listing.routerUps) {
    items.push({ icon: "battery-charging-outline", label: "UPS" });
  }
  if (listing.elevator24_7) {
    items.push({ icon: "swap-vertical-outline", label: "Elevator" });
  }

  const shown = compact ? items.slice(0, 3) : items;

  return (
    <View style={styles.row}>
      {shown.map((item) => (
        <Badge key={item.label} icon={item.icon} label={item.label} />
      ))}
      {compact && items.length > 3 ? (
        <View style={styles.badge}>
          <LText variant="caption" tone="muted">
            +{items.length - 3}
          </LText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Skoun.radius.sm,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    maxWidth: "100%",
  },
  label: {
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.ink,
  },
});
