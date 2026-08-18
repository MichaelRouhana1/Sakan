import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { amenityLabel } from "@/constants/listingWizard";
import { Skoun } from "@/constants/theme";
import { labelElectricity, labelWater } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
};

const PREVIEW = 8;

function iconFor(label: string): keyof typeof Ionicons.glyphMap {
  const t = label.toLowerCase();
  if (t.includes("wifi") || t.includes("internet") || t.includes("fiber")) {
    return "wifi-outline";
  }
  if (t.includes("gym") || t.includes("fitness")) return "barbell-outline";
  if (t.includes("laundry")) return "shirt-outline";
  if (t.includes("elevator") || t.includes("lift")) return "swap-vertical-outline";
  if (t.includes("desk") || t.includes("study")) return "book-outline";
  if (t.includes("kitchen")) return "restaurant-outline";
  if (t.includes("ac") || t.includes("air")) return "snow-outline";
  if (t.includes("cctv") || t.includes("security") || t.includes("keycard")) {
    return "shield-outline";
  }
  if (t.includes("park") || t.includes("bike")) return "bicycle-outline";
  if (t.includes("lounge") || t.includes("tv")) return "tv-outline";
  if (t.includes("water")) return "water-outline";
  if (t.includes("power") || t.includes("electric") || t.includes("generator")) {
    return "flash-outline";
  }
  return "checkmark-circle-outline";
}

function fallbackAmenities(listing: Listing): string[] {
  const items = [
    labelElectricity(listing.electricity),
    labelWater(listing.water),
  ];
  if (listing.wifiIncluded) items.push("Wi‑Fi included");
  if (listing.routerUps) items.push("Router UPS");
  if (listing.elevator24_7) items.push("24/7 elevator");
  return items;
}

export function ListingDetailAmenities({ listing }: Props) {
  const all = useMemo(() => {
    const listed = (listing.amenities ?? [])
      .map((s) => amenityLabel(s).trim())
      .filter(Boolean);
    return listed.length > 0 ? listed : fallbackAmenities(listing);
  }, [listing]);
  const [open, setOpen] = useState(false);
  const shown = open || all.length <= PREVIEW ? all : all.slice(0, PREVIEW);

  if (all.length === 0) return null;

  return (
    <View style={styles.card}>
      <LText variant="title" style={styles.heading}>
        Amenities
      </LText>
      <View style={styles.grid}>
        {shown.map((item) => (
          <View key={item} style={styles.cell}>
            <Ionicons
              name={iconFor(item)}
              size={18}
              color={Skoun.color.primaryDeep}
            />
            <LText variant="caption" style={styles.label} numberOfLines={2}>
              {item}
            </LText>
          </View>
        ))}
      </View>
      {all.length > PREVIEW ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen((v) => !v)}
        >
          <LText variant="caption" style={styles.more}>
            {open ? "Show less" : `View all amenities (${all.length})`}
          </LText>
        </Pressable>
      ) : null}
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
  cell: {
    width: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  label: {
    flex: 1,
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.ink,
  },
  more: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
    textAlign: "center",
  },
});
