import { hostListingStatus } from "@/components/web/host/hostListingStatus";
import { UnitRenewalControls, useListingClock } from "@/components/web/host/UnitRenewalControls";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { Lister } from "@/constants/listerTheme";
import { formatFreshUsd } from "@/lib/format";
import {
  daysUntil,
  formatExpiry,
  labelListingType,
} from "@/lib/listingLabels";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";
import { NearLandmark } from "@/components/listings/NearLandmark";
import { StatusChip } from "./StatusChip";
import { LText } from "./Typography";

type Props = {
  listing: Listing;
  index?: number;
  onPress?: () => void;
};

export function PosterListingCard({ listing, onPress }: Props) {
  const now = useListingClock();
  const timedStatus = hostListingStatus(listing, now);
  const urgent = timedStatus.tone === "action";
  const cover = resolveMediaUrl(
    listing.coverUrl ?? listing.photos[0]?.url ?? null,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.area}, ${listing.status}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.thumb}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.thumbFallback}>
              <Ionicons
                name="image-outline"
                size={22}
                color={Lister.color.inkFaint}
              />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(18,24,38,0.35)"]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.top}>
            <View style={styles.titleBlock}>
              <LText variant="subtitle" numberOfLines={1}>
                {listing.area}
              </LText>
              <LText variant="caption" tone="muted" numberOfLines={1}>
                {labelListingType(listing.listingType)}
              </LText>
              <NearLandmark landmark={listing.landmark} compact />
            </View>
            <StatusChip status={listing.status} />
          </View>

          <LText variant="body" tone="primary" style={[rentPriceType, styles.price]}>
            {formatFreshUsd(listing.monthlyRentUsd)}
          </LText>

          <View style={styles.metaRow}>
            <View style={styles.meta}>
              <Ionicons
                name="eye-outline"
                size={16}
                color={Lister.color.inkMuted}
              />
              <LText variant="caption" tone="muted">
                {listing.viewCount} views
              </LText>
            </View>
            <View style={styles.meta}>
              <Ionicons
                name="time-outline"
                size={16}
                color={urgent ? Lister.color.warning : Lister.color.inkMuted}
              />
              <LText
                variant="caption"
                style={{
                  color: urgent ? Lister.color.warning : Lister.color.inkMuted,
                  fontFamily: Lister.type.bodyMedium,
                }}
              >
                {timedStatus.label}
              </LText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Lister.color.inkFaint}
            />
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16 }}><UnitRenewalControls listing={listing} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  pressed: { opacity: 0.9 },
  row: {
    flexDirection: "row",
    minHeight: 112,
  },
  thumb: {
    width: 108,
    backgroundColor: Lister.color.bgWash,
  },
  thumbFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.primaryMist,
  },
  body: {
    flex: 1,
    padding: Lister.space.md,
    gap: 8,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  price: {
    fontSize: 20,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
});
