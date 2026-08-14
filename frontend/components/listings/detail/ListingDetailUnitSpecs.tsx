import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { labelListingType } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
};

export function ListingDetailUnitSpecs({ listing }: Props) {
  const specs = listing.unitSpecs;
  const floor = specs?.floorLevel;
  const deposit = specs?.depositUsd;
  const roommates = specs?.roommateDetails;
  const contract = specs?.minContractMonths;

  return (
    <View style={styles.card}>
      <LText variant="title" style={styles.heading}>
        Unit specs
      </LText>
      <View style={styles.grid}>
        <Tile
          icon="home-outline"
          label="Type"
          value={labelListingType(listing.listingType)}
        />
        {floor != null && String(floor).length > 0 ? (
          <Tile icon="layers-outline" label="Floor" value={String(floor)} />
        ) : null}
        {roommates ? (
          <Tile
            icon="people-outline"
            label="Roommates"
            value={
              roommates.occupations
                ? `${roommates.count} · ${roommates.occupations}`
                : `${roommates.count}`
            }
          />
        ) : null}
        {deposit != null ? (
          <Tile
            icon="cash-outline"
            label="Deposit"
            value={formatFreshUsd(deposit)}
          />
        ) : null}
        {contract != null ? (
          <Tile
            icon="calendar-outline"
            label="Min stay"
            value={`${contract} months`}
          />
        ) : null}
      </View>
    </View>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={18} color={Skoun.color.primary} />
      <LText variant="caption" tone="muted">
        {label}
      </LText>
      <LText variant="subtitle">{value}</LText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  heading: { fontSize: 18 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "47%",
    flexGrow: 1,
    gap: 4,
    padding: 12,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
});
