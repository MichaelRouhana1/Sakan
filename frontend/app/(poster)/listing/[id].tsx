import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { StatusChip } from "@/components/lister/StatusChip";
import { LText } from "@/components/lister/Typography";
import { UtilityPills } from "@/components/lister/UtilityPills";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { NearLandmark } from "@/components/listings/NearLandmark";
import { Lister } from "@/constants/listerTheme";
import { useListing } from "@/features/listings/useListing";
import {
  useArchiveListing,
  useSetLookingForRoommate,
} from "@/features/roommate/useRoommate";
import { formatFreshUsd } from "@/lib/format";
import {
  daysUntil,
  formatExpiry,
  labelAudience,
  labelGenderRestriction,
  labelListingType,
} from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import { safeBack, useSafeHardwareBack } from "@/lib/safeBack";

export default function PosterListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listing, isLoading, isError, refetch } = useListing(id ?? "");
  const setLooking = useSetLookingForRoommate();
  const archive = useArchiveListing();
  useSafeHardwareBack("/(poster)");

  if (isLoading) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <ActivityIndicator color={Lister.color.primary} />
        </View>
      </ListerScreen>
    );
  }

  if (isError || !listing) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <LText variant="title">Listing not found</LText>
          <LButton
            label="Back to listings"
            variant="secondary"
            onPress={() => router.replace("/(poster)")}
            style={{ marginTop: 16 }}
          />
        </View>
      </ListerScreen>
    );
  }

  const days = daysUntil(listing.expiresAt);
  const urgent = days != null && days >= 0 && days <= 5;

  return (
    <ListerScreen edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.galleryWrap}>
          <ListingGallery
            photos={listing.photos}
            coverUrl={listing.coverUrl}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to listings"
            onPress={() => safeBack("/(poster)")}
            style={styles.backBtn}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={Lister.color.ink}
            />
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Enter>
            <View style={styles.hero}>
              <StatusChip status={listing.status} />
              <LText variant="display" style={styles.area}>
                {listing.area}
              </LText>
              <NearLandmark landmark={listing.landmark} />
              <LText variant="body" tone="primary" style={[rentPriceType, styles.price]}>
                {formatFreshUsd(listing.monthlyRentUsd)}
              </LText>
              <LText variant="body" tone="muted">
                {labelListingType(listing.listingType)}
                {listing.targetAudience === "students_only"
                  ? ` · ${labelAudience(listing.targetAudience)}`
                  : ""}
                {listing.genderRestriction !== "anyone"
                  ? ` · ${labelGenderRestriction(listing.genderRestriction)}`
                  : ""}
              </LText>
            </View>
          </Enter>

          <Enter delay={80}>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons
                  name="eye-outline"
                  size={20}
                  color={Lister.color.primary}
                />
                <LText variant="title">{listing.viewCount}</LText>
                <LText variant="caption" tone="muted">
                  Views
                </LText>
              </View>
              <View style={styles.stat}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={urgent ? Lister.color.warning : Lister.color.primary}
                />
                <LText
                  variant="subtitle"
                  style={{
                    color: urgent ? Lister.color.warning : Lister.color.ink,
                  }}
                >
                  {formatExpiry(listing.expiresAt)}
                </LText>
                <LText variant="caption" tone="muted">
                  Visibility
                </LText>
              </View>
            </View>
          </Enter>

          <Enter delay={140}>
            <LText variant="label" tone="muted" style={styles.section}>
              Utilities
            </LText>
            <UtilityPills listing={listing} />
          </Enter>

          <Enter delay={200}>
            <LText variant="label" tone="muted" style={styles.section}>
              Actions
            </LText>
            <View style={styles.actions}>
              <LButton
                label="Share listing"
                variant="secondary"
                onPress={() => {
                  void Share.share({
                    message: `Check my Skoun listing in ${listing.area} — ${formatFreshUsd(listing.monthlyRentUsd)}`,
                  });
                }}
              />
              {listing.status === "active" && listing.lookingForRoommate ? (
                <LButton
                  label="Find roommate"
                  onPress={() =>
                    router.push({
                      pathname: "/(poster)/find-roommate/[listingId]",
                      params: { listingId: listing.id },
                    })
                  }
                />
              ) : null}
              {listing.status === "active" && !listing.lookingForRoommate ? (
                <LButton
                  label="Enable roommate search"
                  variant="secondary"
                  onPress={() => {
                    void setLooking
                      .mutateAsync({
                        listingId: listing.id,
                        lookingForRoommate: true,
                      })
                      .then(() => refetch());
                  }}
                />
              ) : null}
              {listing.status === "active" ? (
                <LButton
                  label="Archive listing"
                  variant="ghost"
                  onPress={() => {
                    void archive.mutateAsync(listing.id).then(() => {
                      router.replace("/(poster)");
                    });
                  }}
                />
              ) : null}
              <LButton
                label="Refresh"
                variant="ghost"
                onPress={() => void refetch()}
              />
            </View>
          </Enter>
        </View>
      </ScrollView>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Lister.space.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Lister.space.lg,
  },
  galleryWrap: {
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(201,214,207,0.8)",
  },
  panel: {
    padding: Lister.space.lg,
    gap: 8,
  },
  hero: { gap: 6, marginBottom: 8 },
  area: { fontSize: 32 },
  price: { fontSize: 22, lineHeight: 28 },
  stats: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: Lister.color.surface,
    borderRadius: Lister.radius.lg,
    borderWidth: 1,
    borderColor: Lister.color.border,
    padding: Lister.space.md,
    gap: 4,
  },
  section: { marginTop: 16, marginBottom: 8 },
  actions: { gap: 10, marginTop: 4 },
  hint: { textAlign: "center", marginTop: 4 },
});
