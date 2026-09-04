import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HostStatusPill } from "@/components/web/host/HostStatusPill";
import { hostListingStatus } from "@/components/web/host/hostListingStatus";
import { Skoun } from "@/constants/theme";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  onPress?: () => void;
};

function listingStatus(listing: Listing) {
  return hostListingStatus(listing);
}

export function HostListingGridCard({ listing, onPress }: Props) {
  const cover = resolveMediaUrl(
    listing.coverUrl ?? listing.photos[0]?.url ?? null,
  );
  const status = listingStatus(listing);
  const title = listing.title?.trim() || listing.area;
  const subtitle = `Home in ${listing.area}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.media}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={22} color={Skoun.color.inkFaint} />
          </View>
        )}
        <View style={styles.pillWrap}>
          <HostStatusPill label={status.label} tone={status.tone} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
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
