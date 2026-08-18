import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingListRatingDisplay } from "@/components/listings/ListingRatingBadge";
import { UtilityBadges } from "@/components/listings/UtilityBadges";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { formatDistanceMeters } from "@/lib/formatDistance";
import {
  labelElectricity,
  labelGenderRestriction,
  labelWater,
} from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  onViewMap?: () => void;
};

export function ListingDetailOverview({ listing, onViewMap }: Props) {
  const title =
    listing.title?.trim() ||
    listing.pbsaBuildingName?.trim() ||
    listing.area;
  const hasPin = listing.lat != null && listing.lng != null;
  const distance = formatDistanceMeters(
    listing.distanceMeters,
    listing.nearestCampusName,
  );
  const rating = listing.rating;
  const reviewCount = listing.reviewCount ?? 0;
  const elec = listing.infrastructure?.electricity.status ?? listing.electricity;
  const water = listing.infrastructure?.water.status ?? listing.water;
  const wifiLabel = listing.infrastructure?.internet.hasFiber
    ? `Fiber${listing.infrastructure.internet.speedMbps ? ` ${listing.infrastructure.internet.speedMbps}Mbps` : ""}`
    : listing.wifiIncluded
      ? "Wi‑Fi included"
      : null;
  const upsHours =
    listing.infrastructure?.internet.routerUpsHours ??
    (listing.routerUps ? 8 : null);

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <LText variant="display" style={styles.title}>
            {title}
          </LText>
          <LText variant="caption" tone="muted" style={styles.address}>
            {listing.landmark
              ? `${listing.landmark}, ${listing.area}`
              : listing.area}
          </LText>
        </View>
        <View style={styles.priceCol}>
          <LText variant="caption" tone="muted">
            From
          </LText>
          <LText variant="display" style={[rentPriceType, styles.price]}>
            {formatFreshUsd(listing.monthlyRentUsd)}
          </LText>
          <LText variant="caption" tone="muted">
            per month
          </LText>
        </View>
      </View>

      {reviewCount >= 1 && rating != null && Number.isFinite(rating) ? (
        <View style={styles.ratingRow}>
          <ListingListRatingDisplay rating={rating} reviewCount={reviewCount} />
        </View>
      ) : null}

      {distance || hasPin ? (
        <View style={styles.distanceRow}>
          <Ionicons name="location" size={20} color={Skoun.color.primary} />
          <View style={{ flex: 1 }}>
            {distance ? (
              <LText variant="subtitle" style={styles.distanceText}>
                {distance}
              </LText>
            ) : (
              <LText variant="caption" tone="muted">
                Pin on map
              </LText>
            )}
          </View>
          {hasPin && onViewMap ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View map"
              onPress={onViewMap}
            >
              <LText variant="caption" style={styles.viewMap}>
                View map
              </LText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.chipWrap}>
        {listing.targetAudience === "students_only" ? (
          <View style={[styles.chip, styles.chipAccent]}>
            <Ionicons name="school-outline" size={13} color={Skoun.color.ink} />
            <LText variant="caption" style={styles.chipText}>
              Students only
            </LText>
          </View>
        ) : null}
        {listing.genderRestriction !== "anyone" ? (
          <View style={styles.chip}>
            <LText variant="caption" style={styles.chipText}>
              {labelGenderRestriction(listing.genderRestriction)}
            </LText>
          </View>
        ) : null}
        {listing.nearestCampusName ? (
          <View style={styles.chip}>
            <Ionicons name="school" size={13} color={Skoun.color.primary} />
            <LText variant="caption" style={styles.chipText} numberOfLines={1}>
              {listing.nearestCampusName}
              {listing.distanceMeters != null
                ? ` · ${
                    listing.distanceMeters < 1000
                      ? `${Math.round(listing.distanceMeters)} m`
                      : `${(listing.distanceMeters / 1000).toFixed(1)} km`
                  }`
                : ""}
            </LText>
          </View>
        ) : null}
      </View>
      <UtilityBadges listing={listing} />

      <View style={styles.infra}>
        <View style={styles.infraHead}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={Skoun.color.primary}
          />
          <LText variant="subtitle">Utilities on this listing</LText>
        </View>
        <View style={styles.infraGrid}>
          <View style={styles.infraBox}>
            <Ionicons name="flash-outline" size={18} color={Skoun.color.warning} />
            <View style={{ flex: 1 }}>
              <LText variant="caption" tone="muted">
                Electricity
              </LText>
              <LText variant="subtitle">{labelElectricity(elec)}</LText>
              {listing.infrastructure?.electricity.generatorSpecs ? (
                <LText variant="caption" tone="muted">
                  {listing.infrastructure.electricity.generatorSpecs}
                </LText>
              ) : null}
            </View>
          </View>
          <View style={styles.infraBox}>
            <Ionicons name="water-outline" size={18} color="#0284C7" />
            <View style={{ flex: 1 }}>
              <LText variant="caption" tone="muted">
                Water
              </LText>
              <LText variant="subtitle">{labelWater(water)}</LText>
            </View>
          </View>
          <View style={styles.infraBox}>
            <Ionicons name="wifi-outline" size={18} color="#16A34A" />
            <View style={{ flex: 1 }}>
              <LText variant="caption" tone="muted">
                Internet
              </LText>
              <LText variant="subtitle">
                {wifiLabel ?? (listing.wifiIncluded ? "Wi‑Fi included" : "Ask about Wi‑Fi")}
              </LText>
              {upsHours ? (
                <LText variant="caption" tone="muted">
                  Router UPS ~{upsHours}h
                </LText>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleCol: { flex: 1, gap: 4 },
  title: { fontSize: 22, lineHeight: 28 },
  address: { fontSize: 13 },
  priceCol: { alignItems: "flex-end", minWidth: 96 },
  price: { fontSize: 22, lineHeight: 26 },
  ratingRow: { paddingTop: 2 },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distanceText: { fontSize: 14 },
  viewMap: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  chipAccent: {
    backgroundColor: Skoun.color.brassSoft,
    borderColor: Skoun.color.borderStrong,
  },
  chipText: {
    fontFamily: Skoun.type.bodySemi,
    color: Skoun.color.ink,
  },
  infra: {
    gap: 10,
    paddingTop: 4,
  },
  infraHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infraGrid: { gap: 8 },
  infraBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
});
