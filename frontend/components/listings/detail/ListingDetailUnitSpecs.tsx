import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import {
  listingDetailChrome as chrome,
  type ListingDetailVariant,
} from "@/components/listings/detail/listingDetailChrome";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { labelListingType } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  variant?: ListingDetailVariant;
};

type Ion = ComponentProps<typeof Ionicons>["name"];
type Row = { label: string; value: string; icon: Ion };

function typeIcon(type: Listing["listingType"]): Ion {
  switch (type) {
    case "private_room":
      return "bed-outline";
    case "shared_dorm_bed":
      return "people-outline";
    case "pbsa_building":
      return "business-outline";
    default:
      return "home-outline";
  }
}

export function ListingDetailUnitSpecs({ listing, variant = "card" }: Props) {
  const specs = listing.unitSpecs;
  const floor = specs?.floorLevel;
  const deposit = specs?.depositUsd;
  const roommates = specs?.roommateDetails;
  const contract = specs?.minContractMonths;
  const web = variant === "web";

  const rows: Row[] = [
    {
      label: "Type",
      value: labelListingType(listing.listingType),
      icon: typeIcon(listing.listingType),
    },
  ];
  if (listing.bedrooms != null) {
    rows.push({
      label: "Bedrooms",
      value: listing.bedrooms === 0 ? "Studio" : String(listing.bedrooms),
      icon: "bed-outline",
    });
  }
  if (listing.bathrooms != null && listing.bathrooms > 0) {
    rows.push({
      label: "Baths",
      value: String(listing.bathrooms),
      icon: "water-outline",
    });
  }
  if (listing.areaSqm != null) {
    rows.push({
      label: "Size",
      value: `${listing.areaSqm} m²`,
      icon: "resize-outline",
    });
  }
  if (floor != null && String(floor).length > 0) {
    rows.push({ label: "Floor", value: String(floor), icon: "layers-outline" });
  }
  if (roommates) {
    rows.push({
      label: "Roommates",
      value: roommates.occupations
        ? `${roommates.count} · ${roommates.occupations}`
        : String(roommates.count),
      icon: "people-outline",
    });
  }
  if (deposit != null && deposit > 0) {
    rows.push({
      label: "Deposit",
      value: formatFreshUsd(deposit),
      icon: "cash-outline",
    });
  }
  if (contract != null && contract > 0) {
    rows.push({
      label: "Min stay",
      value: contract === 1 ? "1 month" : `${contract} months`,
      icon: "calendar-outline",
    });
  }

  if (rows.length === 0) return null;

  if (!web) {
    return (
      <View style={[chrome.card, styles.cardGap]}>
        <LText variant="title" style={chrome.cardHeading}>
          Unit specs
        </LText>
        <View style={styles.grid}>
          {rows.map((row) => (
            <View key={row.label} style={styles.tile}>
              <Ionicons name={row.icon} size={18} color={Skoun.color.primary} />
              <LText variant="caption" tone="muted">
                {row.label}
              </LText>
              <LText variant="subtitle">{row.value}</LText>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      <LText variant="title" style={styles.webHeading}>
        The unit
      </LText>
      <View style={styles.list}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[styles.row, i === rows.length - 1 && styles.rowLast]}
          >
            <View style={styles.labelRow}>
              <Ionicons
                name={row.icon}
                size={16}
                color={Skoun.color.inkMuted}
              />
              <LText variant="caption" tone="muted" style={styles.label}>
                {row.label}
              </LText>
            </View>
            <LText variant="body" style={styles.value}>
              {row.value}
            </LText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardGap: { gap: 12 },
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
  webHeading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: Skoun.type.bodyBold,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  value: {
    flex: 1,
    textAlign: "right",
    fontFamily: Skoun.type.bodySemi,
    color: Skoun.color.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
