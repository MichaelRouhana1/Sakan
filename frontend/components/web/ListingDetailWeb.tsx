import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { CoincidentListingsSection } from "@/components/listings/CoincidentListingsSection";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { NearLandmark } from "@/components/listings/NearLandmark";
import { UtilityBadges } from "@/components/listings/UtilityBadges";
import { ReportListingDialog } from "@/components/web/ReportListingDialog";
import { Skoun } from "@/constants/theme";
import { useListing } from "@/features/listings/useListing";
import { useNearbyListings } from "@/features/listings/useNearbyListings";
import { useRecordListingView } from "@/features/listings/useRecordListingView";
import { useIsReported } from "@/features/reports/useReportListing";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import { formatFreshUsd } from "@/lib/format";
import { formatDistanceMeters } from "@/lib/formatDistance";
import {
  labelAudience,
  labelGenderRestriction,
  labelListingType,
} from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import {
  buildWhatsAppListingUrl,
  hasUsableWhatsAppPhone,
} from "@/lib/whatsapp";

function getPosterPhone(_listingId: string): string | null {
  return null;
}

type Props = {
  listingId: string;
};

export function ListingDetailWeb({ listingId }: Props) {
  const { data: listing, isLoading, isError, refetch } = useListing(listingId);
  const saved = useIsSaved(listingId);
  const toggleSaved = useToggleSaved();
  const reported = useIsReported(listingId);
  const coincident = useNearbyListings(listingId, {
    enabled: Boolean(
      listing && listing.lng != null && listing.lat != null,
    ),
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useRecordListingView(listingId, Boolean(listingId) && !isError);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Skoun.color.primary} size="large" />
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <View style={styles.center}>
        <LText variant="title">Listing not found</LText>
        <LButton
          label="Back to Find"
          variant="secondary"
          onPress={() => router.replace("/search" as never)}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const posterPhone = getPosterPhone(listing.id);
  const canContact = hasUsableWhatsAppPhone(posterPhone);
  const distance = formatDistanceMeters(
    listing.distanceMeters,
    listing.nearestCampusName,
  );

  const detailUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/listing/${listing.id}`
      : `/(renter)/listing/${listing.id}`;

  const copyLink = async () => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(detailUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${listing.area} — Skoun`,
          text: `Check out this rental in ${listing.area} on Skoun`,
          url: detailUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void Share.share({
        message: `${listing.area} — ${formatFreshUsd(listing.monthlyRentUsd)}\n${detailUrl}`,
      });
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.breadcrumb}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/search" as never)}
          style={({ hovered }) => [styles.crumb, hovered && styles.crumbHover]}
        >
          <LText variant="caption" tone="primary">
            Find
          </LText>
        </Pressable>
        <LText variant="caption" tone="muted">
          ›
        </LText>
        <LText variant="caption" tone="muted">
          {listing.area}
        </LText>
      </View>

      <View style={styles.layout}>
        <View style={styles.main}>
          <ListingGallery photos={listing.photos} coverUrl={listing.coverUrl} />

          <View style={styles.panel}>
            <LText variant="label" tone="muted" style={styles.section}>
              Utilities you can trust
            </LText>
            <UtilityBadges listing={listing} />

            {coincident.data && coincident.data.length > 0 ? (
              <View style={styles.coincident}>
                <CoincidentListingsSection listings={coincident.data} />
              </View>
            ) : null}

            <View style={styles.trust}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={Skoun.color.primary}
              />
              <LText variant="caption" tone="muted" style={styles.trustText}>
                Chat the landlord on WhatsApp to confirm availability and
                utilities before you visit.
              </LText>
            </View>
          </View>
        </View>

        <View style={styles.sidebar}>
          <View style={styles.sidebarInner}>
            <View style={styles.chips}>
              {listing.targetAudience === "students_only" ? (
                <View style={styles.chip}>
                  <Ionicons name="school-outline" size={14} color={Skoun.color.primaryDeep} />
                  <LText variant="caption">Students only</LText>
                </View>
              ) : null}
              {listing.genderRestriction !== "anyone" ? (
                <View style={styles.chip}>
                  <LText variant="caption">
                    {labelGenderRestriction(listing.genderRestriction)}
                  </LText>
                </View>
              ) : null}
            </View>

            <LText variant="display" style={styles.area}>
              {listing.area}
            </LText>
            <NearLandmark landmark={listing.landmark} />
            <LText variant="body" style={[rentPriceType, styles.price]}>
              {formatFreshUsd(listing.monthlyRentUsd)}
            </LText>
            <LText variant="body" tone="muted">
              {labelListingType(listing.listingType)}
              {listing.targetAudience === "students_only"
                ? ` · ${labelAudience(listing.targetAudience)}`
                : ""}
            </LText>
            {distance ? (
              <View style={styles.distance}>
                <Ionicons name="navigate-outline" size={16} color={Skoun.color.primary} />
                <LText variant="caption" tone="primary">
                  {distance}
                </LText>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(saved.data) }}
                onPress={() => toggleSaved.mutate(listing)}
                disabled={toggleSaved.isPending}
                style={({ hovered }) => [
                  styles.saveBtn,
                  saved.data && styles.saveBtnActive,
                  hovered && styles.saveBtnHover,
                ]}
              >
                <Ionicons
                  name={saved.data ? "heart" : "heart-outline"}
                  size={20}
                  color={saved.data ? Skoun.color.danger : Skoun.color.ink}
                />
                <LText variant="subtitle">
                  {saved.data ? "Saved" : "Save listing"}
                </LText>
              </Pressable>

              {canContact && posterPhone ? (
                <LButton
                  label="Contact on WhatsApp"
                  icon={
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  }
                  onPress={() => {
                    const url = buildWhatsAppListingUrl({
                      phone: posterPhone,
                      propertyType: labelListingType(listing.listingType),
                      area: listing.area,
                    });
                    void Linking.openURL(url);
                  }}
                />
              ) : (
                <View style={styles.disabledBlock}>
                  <LButton label="WhatsApp contact soon" disabled />
                  <LText variant="caption" tone="muted" style={styles.disabledHint}>
                    Landlord numbers are being connected. Save this listing for
                    now.
                  </LText>
                </View>
              )}

              <View style={styles.secondaryRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void copyLink()}
                  style={({ hovered }) => [
                    styles.secondaryBtn,
                    hovered && styles.secondaryHover,
                  ]}
                >
                  <Ionicons name="link-outline" size={18} color={Skoun.color.ink} />
                  <LText variant="caption">
                    {copied ? "Copied!" : "Copy link"}
                  </LText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void shareLink()}
                  style={({ hovered }) => [
                    styles.secondaryBtn,
                    hovered && styles.secondaryHover,
                  ]}
                >
                  <Ionicons name="share-outline" size={18} color={Skoun.color.ink} />
                  <LText variant="caption">Share</LText>
                </Pressable>
              </View>

              {reported.data ? (
                <LText variant="caption" tone="faint">
                  Already reported
                </LText>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setReportOpen(true)}
                  style={({ hovered }) => [
                    styles.reportLink,
                    hovered && styles.reportHover,
                  ]}
                >
                  <LText variant="caption" tone="muted">
                    Report listing
                  </LText>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>

      <ReportListingDialog
        listingId={listing.id}
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: 16,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crumb: {
    paddingVertical: 4,
  },
  crumbHover: {
    opacity: 0.8,
  },
  layout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 32,
    flexWrap: "wrap",
  },
  main: {
    flex: 1,
    minWidth: 280,
    gap: 24,
  },
  panel: {
    gap: 12,
    paddingBottom: 24,
  },
  section: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  coincident: {
    marginTop: 8,
  },
  trust: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Skoun.color.primaryMist,
    borderWidth: 1,
    borderColor: Skoun.color.primarySoft,
  },
  trustText: {
    flex: 1,
    lineHeight: 20,
  },
  sidebar: {
    width: 340,
    flexShrink: 0,
    position: "sticky" as unknown as "relative",
    top: 88,
  },
  sidebarInner: {
    backgroundColor: Skoun.color.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    padding: 24,
    gap: 8,
    boxShadow: "0 8px 24px rgba(18, 24, 38, 0.06)",
  } as Record<string, unknown>,
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Skoun.color.primaryMist,
  },
  area: {
    fontSize: 28,
    lineHeight: 34,
    color: Skoun.color.primaryDeep,
    letterSpacing: -0.3,
  },
  price: {
    fontSize: 22,
    color: Skoun.color.primaryDeep,
    marginTop: 4,
  },
  distance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  saveBtnActive: {
    borderColor: "rgba(180,35,24,0.25)",
    backgroundColor: Skoun.color.dangerSoft,
  },
  saveBtnHover: {
    borderColor: Skoun.color.borderStrong,
  },
  disabledBlock: {
    gap: 8,
  },
  disabledHint: {
    lineHeight: 18,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  secondaryHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  reportLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  reportHover: {
    opacity: 0.8,
  },
});
