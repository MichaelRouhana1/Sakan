import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ListingAvailabilityControl } from "@/components/listings/ListingAvailabilityControl";
import { HostStatusPill } from "@/components/web/host/HostStatusPill";
import { hostListingStatus } from "@/components/web/host/hostListingStatus";
import {
  hostListingAnalyticsPath,
  posterListingAnalyticsPath,
} from "@/constants/hostRoutes";
import { Skoun } from "@/constants/theme";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  onPress?: () => void;
  onEdit?: () => void;
};

function listingStatus(listing: Listing) {
  return hostListingStatus(listing);
}

export function HostListingGridCard({ listing, onPress, onEdit }: Props) {
  const router = useRouter();
  const cover = resolveMediaUrl(
    listing.coverUrl ?? listing.photos[0]?.url ?? null,
  );
  const status = listingStatus(listing);
  const title = listing.title?.trim() || listing.area;
  const subtitle = `Home in ${listing.area}`;

  const showEdit = Boolean(onEdit) && listing.status === "active";

  function openAnalytics() {
    const href =
      Platform.OS === "web"
        ? hostListingAnalyticsPath(listing.id)
        : posterListingAnalyticsPath(listing.id);
    router.push(href as never);
  }

  return (
    <View style={styles.card}>
      <View style={styles.media}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onPress}
          style={({ pressed }) => [styles.mediaPress, pressed && styles.pressed]}
        />
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={[StyleSheet.absoluteFill, styles.noPointer]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholder, styles.noPointer]}>
            <Ionicons name="image-outline" size={22} color={Skoun.color.inkFaint} />
          </View>
        )}
        <View style={[styles.pillWrap, styles.noPointer]}>
          <HostStatusPill label={status.label} tone={status.tone} />
        </View>
        <View style={styles.onImage}>
          {listing.status === "active" ? (
            <ListingAvailabilityControl
              listingId={listing.id}
              availability={listing.availability}
              variant="dropdown"
              surface="overlay"
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listing analytics"
            onPress={openAnalytics}
            style={styles.imageBtn}
          >
            <Text style={styles.imageBtnText}>Analytics</Text>
          </Pressable>
          {showEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit listing"
              onPress={onEdit}
              style={styles.imageBtn}
            >
              <Text style={styles.imageBtnText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={styles.body}
      >
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    cursor: "pointer",
  },
  pressed: {
    opacity: 0.92,
  },
  media: {
    width: "100%",
    aspectRatio: 20 / 19,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  mediaPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  noPointer: {
    pointerEvents: "none",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  pillWrap: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  body: {
    paddingTop: 8,
    gap: 2,
  },
  onImage: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
  },
  imageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    ...(Platform.OS === "web"
      ? {
          cursor: "pointer" as const,
          boxShadow: "0 1px 6px rgba(0, 0, 0, 0.08)",
        }
      : null),
  },
  imageBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.ink,
  },
  title: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
});
