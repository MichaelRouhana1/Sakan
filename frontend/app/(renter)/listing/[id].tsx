import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { NearLandmark } from "@/components/listings/NearLandmark";
import { ReportListingSheet } from "@/components/listings/ReportListingSheet";
import { UtilityBadges } from "@/components/listings/UtilityBadges";
import { LookingPromptSheet } from "@/components/roommate/LookingPromptSheet";
import { GlassSurface, isAppleGlass } from "@/components/ui/Glass";
import { ROOMMATE_LAUNCH_AREA_SET } from "@/constants/roommateLaunch";
import { Skoun } from "@/constants/theme";
import { useListing } from "@/features/listings/useListing";
import { useRecordListingView } from "@/features/listings/useRecordListingView";
import { useIsReported } from "@/features/reports/useReportListing";
import {
  useNearbyRoommateCount,
  useMyLookingCard,
} from "@/features/roommate/useRoommate";
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
import {
  dismissLookingPrompt,
  recordBrowsedArea,
  wasLookingPromptDismissed,
} from "@/lib/roommateGrowth";
import { rentPriceType } from "@/lib/rentPriceType";
import { safeBack, useSafeHardwareBack } from "@/lib/safeBack";
import {
  buildWhatsAppListingUrl,
  hasUsableWhatsAppPhone,
} from "@/lib/whatsapp";

/** When listing APIs expose poster phone, pass it here. */
function getPosterPhone(_listingId: string): string | null {
  return null;
}

export default function RenterListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listing, isLoading, isError, refetch } = useListing(id ?? "");
  const saved = useIsSaved(id ?? "");
  const toggleSaved = useToggleSaved();
  const reported = useIsReported(id ?? "");
  const myCard = useMyLookingCard();
  const nearby = useNearbyRoommateCount(
    listing && ROOMMATE_LAUNCH_AREA_SET.has(listing.area)
      ? listing.area
      : undefined,
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [lookingPrompt, setLookingPrompt] = useState(false);
  useSafeHardwareBack("/(renter)");
  useRecordListingView(id ?? "", Boolean(id) && !isError);

  useEffect(() => {
    if (!listing?.area) return;
    void recordBrowsedArea(listing.area);
  }, [listing?.area]);

  useEffect(() => {
    if (!listing || !id) return;
    if (!ROOMMATE_LAUNCH_AREA_SET.has(listing.area)) return;
    if (myCard.data) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void wasLookingPromptDismissed(id).then((dismissed) => {
        if (!cancelled && !dismissed) setLookingPrompt(true);
      });
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [listing, id, myCard.data]);

  if (isLoading) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <ActivityIndicator color={Skoun.color.primary} />
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
            label="Back to search"
            variant="secondary"
            onPress={() => router.replace("/(renter)")}
            style={{ marginTop: 16 }}
          />
        </View>
      </ListerScreen>
    );
  }

  const posterPhone = getPosterPhone(listing.id);
  const canContact = hasUsableWhatsAppPhone(posterPhone);
  const distance = formatDistanceMeters(
    listing.distanceMeters,
    listing.nearestCampusName,
  );

  return (
    <ListerScreen edges={["left", "right", "bottom"]}>
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.galleryWrap}>
            <ListingGallery
              photos={listing.photos}
              coverUrl={listing.coverUrl}
            />
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to search"
                onPress={() => safeBack("/(renter)")}
                style={styles.iconBtn}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={Skoun.color.ink}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(saved.data) }}
                accessibilityLabel={
                  saved.data
                    ? "Remove from your shortlist"
                    : "Save to your account shortlist"
                }
                disabled={toggleSaved.isPending}
                onPress={() => toggleSaved.mutate(listing)}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.iconBtnPressed,
                  saved.data && styles.iconBtnSaved,
                ]}
              >
                <Ionicons
                  name={saved.data ? "heart" : "heart-outline"}
                  size={22}
                  color={
                    saved.data ? Skoun.color.danger : Skoun.color.ink
                  }
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.panel}>
            <Enter>
              <View style={styles.hero}>
                <View style={styles.heroChips}>
                  {listing.targetAudience === "students_only" ? (
                    <View style={styles.studentChip}>
                      <Ionicons
                        name="school-outline"
                        size={14}
                        color={Skoun.color.brass}
                      />
                      <LText variant="caption" style={styles.studentLabel}>
                        Students only
                      </LText>
                    </View>
                  ) : null}
                  {listing.genderRestriction !== "anyone" ? (
                    <View style={styles.genderChip}>
                      <LText variant="caption" style={styles.genderLabel}>
                        {labelGenderRestriction(listing.genderRestriction)}
                      </LText>
                    </View>
                  ) : null}
                </View>
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
                {distance ? (
                  <View style={styles.distance}>
                    <Ionicons
                      name="navigate-outline"
                      size={16}
                      color={Skoun.color.primary}
                    />
                    <LText
                      variant="caption"
                      tone="primary"
                      style={styles.distanceText}
                    >
                      {distance}
                    </LText>
                  </View>
                ) : null}
              </View>
            </Enter>

            <Enter delay={90}>
              <LText variant="label" tone="muted" style={styles.section}>
                Utilities you can trust
              </LText>
              <UtilityBadges listing={listing} />
            </Enter>

            <Enter delay={150}>
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
              {nearby.data?.inLaunch && nearby.data.count > 0 ? (
                <LText
                  variant="caption"
                  tone="primary"
                  style={{ marginTop: 10 }}
                >
                  {nearby.data.count} people looking nearby
                </LText>
              ) : null}
            </Enter>

            <Enter delay={200}>
              {reported.data ? (
                <LText
                  variant="caption"
                  tone="faint"
                  style={styles.reportAction}
                  accessibilityRole="text"
                >
                  Already reported
                </LText>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Report listing"
                  accessibilityHint="Opens reasons to flag this listing"
                  onPress={() => setReportOpen(true)}
                  style={({ pressed }) => [
                    styles.reportAction,
                    pressed && styles.reportActionPressed,
                  ]}
                >
                  <LText variant="caption" tone="muted">
                    Report listing
                  </LText>
                </Pressable>
              )}
            </Enter>
          </View>
        </ScrollView>

        <GlassSurface intensity="chrome" style={styles.footer}>
          <View style={styles.footerInner}>
            {canContact && posterPhone ? (
              <LButton
                label="Contact on WhatsApp"
                icon={
                  <Ionicons
                    name="logo-whatsapp"
                    size={20}
                    color={Skoun.color.surface}
                  />
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
              <View style={styles.disabledCta}>
                <LButton
                  label="WhatsApp contact soon"
                  disabled
                  accessibilityHint="Landlord phone will appear when account linking is ready"
                />
                <LText
                  variant="caption"
                  tone="muted"
                  style={styles.disabledHint}
                >
                  We’re connecting landlord numbers. You can still save this
                  listing.
                </LText>
                <LButton
                  label="Refresh"
                  variant="ghost"
                  onPress={() => void refetch()}
                />
              </View>
            )}
          </View>
        </GlassSurface>

        <ReportListingSheet
          listingId={listing.id}
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
        />
        <LookingPromptSheet
          visible={lookingPrompt}
          area={listing.area}
          nearbyCount={nearby.data?.count ?? null}
          onDismiss={() => {
            setLookingPrompt(false);
            void dismissLookingPrompt(listing.id);
          }}
        />
      </View>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingBottom: 140,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Skoun.space.lg,
  },
  galleryWrap: {
    position: "relative",
  },
  topBar: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(201,214,207,0.8)",
  },
  iconBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
  iconBtnSaved: {
    backgroundColor: "rgba(254,228,226,0.95)",
    borderColor: "rgba(180,35,24,0.25)",
  },
  panel: {
    padding: Skoun.space.lg,
    gap: 8,
  },
  hero: { gap: 6 },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  area: { fontSize: 34 },
  price: { fontSize: 22, lineHeight: 28 },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Skoun.color.brassSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.brass,
  },
  studentLabel: {
    color: Skoun.color.draft,
    fontFamily: Skoun.type.bodySemi,
  },
  genderChip: {
    backgroundColor: Skoun.color.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  genderLabel: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodySemi,
  },
  distance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  distanceText: {
    fontFamily: Skoun.type.bodySemi,
  },
  section: { marginTop: 20, marginBottom: 10 },
  trust: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    padding: Skoun.space.md,
    backgroundColor: Skoun.color.primaryMist,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.primarySoft,
  },
  trustText: { flex: 1 },
  reportAction: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingVertical: 4,
  },
  reportActionPressed: {
    opacity: 0.65,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: isAppleGlass
      ? "rgba(201,214,207,0.45)"
      : Skoun.color.border,
    borderRadius: 0,
  },
  footerInner: {
    paddingHorizontal: Skoun.space.lg,
    paddingTop: 12,
    paddingBottom: isAppleGlass ? 88 : 12,
  },
  disabledCta: { gap: 8 },
  disabledHint: { textAlign: "center" },
});
