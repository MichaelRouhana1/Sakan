import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { GeneralLoadingBlock } from "@/components/common/GeneralLoadingBlock";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { CoincidentListingsSection } from "@/components/listings/CoincidentListingsSection";
import { ListingListRatingDisplay } from "@/components/listings/ListingRatingBadge";
import { ListingDetailAbout } from "@/components/listings/detail/ListingDetailAbout";
import { ListingDetailAmenities } from "@/components/listings/detail/ListingDetailAmenities";
import { ListingDetailHouseRules } from "@/components/listings/detail/ListingDetailHouseRules";
import { ListingDetailMapSection } from "@/components/listings/detail/ListingDetailMapSection";
import { ListingNearbyCampuses } from "@/components/listings/detail/ListingNearbyCampuses";
import { ListingDetailRooms } from "@/components/listings/detail/ListingDetailRooms";
import { ListingDetailUnitSpecs } from "@/components/listings/detail/ListingDetailUnitSpecs";
import { ListingContactCard } from "@/components/listings/detail/ListingContactCard";
import { ReportListingDialog } from "@/components/web/ReportListingDialog";
import { Skoun } from "@/constants/theme";
import { WEB_NAV_HEIGHT } from "@/constants/webLayout";
import { formatWindowsSummary } from "@/lib/electricityCuts";
import { formatFreshUsd } from "@/lib/format";
import { scrollToListingSection } from "@/lib/scrollToListingSection";
import {
  labelAudience,
  labelElectricity,
  labelGenderRestriction,
  labelListingType,
  labelWater,
} from "@/lib/listingLabels";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import {
  buildWhatsAppListingUrl,
  hasUsableWhatsAppPhone,
} from "@/lib/whatsapp";
import { useListing } from "@/features/listings/useListing";
import { useNearbyListings } from "@/features/listings/useNearbyListings";
import { useRecordListingView } from "@/features/listings/useRecordListingView";
import { useIsReported } from "@/features/reports/useReportListing";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import type { Listing, ListingPhoto, PbsaRoomType } from "@/types/listing";

type Props = {
  listingId: string;
};

const IS_WEB = Platform.OS === "web";
const SIDE_W = 380;
const GALLERY_H = 400;
const GALLERY_GAP = 8;
const GALLERY_THUMB_COUNT = 3;
const PHOTO_FRAME = IS_WEB
  ? ({
      boxShadow:
        "0 0 0 1px rgba(18, 24, 38, 0.14), 0 4px 12px rgba(18, 24, 38, 0.12), 0 16px 36px rgba(18, 24, 38, 0.16)",
    } as object)
  : {
      borderWidth: 1,
      borderColor: "#D9E0EA",
      shadowColor: "#121826",
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    };

function listingTitle(listing: Listing): string {
  return (
    listing.title?.trim() ||
    listing.pbsaBuildingName?.trim() ||
    listing.area
  );
}

function listingPlace(listing: Listing): string {
  const area = listing.area.trim();
  const landmark = listing.landmark?.trim();
  if (landmark && landmark.toLowerCase() !== area.toLowerCase()) {
    return `${landmark}, ${area}`;
  }
  return area;
}

function resolvePhotos(
  listing: Listing,
  room: PbsaRoomType | null,
): ListingPhoto[] {
  const resolve = (photos: ListingPhoto[]) =>
    photos
      .map((p) => {
        const url = resolveMediaUrl(p.url);
        return url ? { ...p, url } : null;
      })
      .filter((p): p is ListingPhoto => Boolean(p));

  if (room?.photos?.length) return resolve(room.photos);
  if (listing.photos?.length) return resolve(listing.photos);
  const cover = resolveMediaUrl(listing.coverUrl);
  return cover ? [{ id: "cover", url: cover, sortOrder: 0 }] : [];
}

export function ListingDetailWeb({ listingId }: Props) {
  const { data: listing, isLoading, isError } = useListing(listingId);
  const saved = useIsSaved(listingId);
  const toggleSaved = useToggleSaved();
  const reported = useIsReported(listingId);
  const nearby = useNearbyListings(listingId, {
    enabled: Boolean(listing && listing.lng != null && listing.lat != null),
  });

  const [reportOpen, setReportOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sidebarFixed, setSidebarFixed] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const [sidebarHeight, setSidebarHeight] = useState(420);
  const sidebarAnchorRef = useRef<View>(null);

  const syncSidebarFixed = () => {
    if (!IS_WEB) return;
    const node = sidebarAnchorRef.current as unknown as {
      getBoundingClientRect?: () => DOMRect;
    } | null;
    const rect = node?.getBoundingClientRect?.();
    if (!rect || rect.width < 1) return;
    setSidebarFixed({ left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!IS_WEB) return;
    syncSidebarFixed();
    window.addEventListener("resize", syncSidebarFixed);
    return () => window.removeEventListener("resize", syncSidebarFixed);
  }, [listingId, isLoading]);

  useEffect(() => {
    if (!linkCopied) return;
    const t = setTimeout(() => setLinkCopied(false), 2000);
    return () => clearTimeout(t);
  }, [linkCopied]);

  useRecordListingView(listingId, Boolean(listingId) && !isError);

  const currentPhotos = useMemo(
    () => (listing ? resolvePhotos(listing, null) : []),
    [listing],
  );

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [listingId]);

  if (isLoading) {
    return (
      <GeneralLoadingBlock
        layout="page"
        state="working"
        label="Loading listing…"
        style={styles.center}
      />
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

  const isPbsa =
    listing.isPbsa || listing.listingType === "pbsa_building";
  const hasRooms = Boolean(listing.pbsaRoomTypes?.length);
  const displayPrice =
    hasRooms && listing.pbsaRoomTypes
      ? Math.min(
          listing.monthlyRentUsd,
          ...listing.pbsaRoomTypes.map((r: { monthlyRentUsd: number }) => r.monthlyRentUsd),
        )
      : listing.monthlyRentUsd;
  const posterPhone = listing.whatsappNumber || null;
  const canContact = hasUsableWhatsAppPhone(posterPhone);
  const callPhone = listing.contactPhone ?? null;
  const canCall = Boolean(
    callPhone && callPhone.replace(/\D/g, "").length >= 8,
  );
  const title = listingTitle(listing);
  const description = listing.description?.trim() ?? "";
  const hasRules = Boolean(
    listing.cancellationPolicy?.trim() ||
      (listing.houseRules && listing.houseRules.length > 0),
  );
  const hasPin = listing.lat != null && listing.lng != null;
  const siblings = nearby.data ?? [];

  const elec =
    listing.infrastructure?.electricity.status ?? listing.electricity;
  const water = listing.infrastructure?.water.status ?? listing.water;
  const wifiLabel = listing.infrastructure?.internet.hasFiber
    ? `Fiber${
        listing.infrastructure.internet.speedMbps
          ? ` ${listing.infrastructure.internet.speedMbps} Mbps`
          : ""
      }`
    : listing.wifiIncluded
      ? "Wi‑Fi included"
      : "Ask about Wi‑Fi";
  const upsHours =
    listing.infrastructure?.internet.routerUpsHours ??
    (listing.routerUps ? 8 : null);
  const elecNote =
    elec === "scheduled_cuts"
      ? [
          formatWindowsSummary(
            listing.electricityCutWindows ??
              listing.infrastructure?.electricity.windows ??
              [],
          ),
          listing.electricityHoursOn != null
            ? `${listing.electricityHoursOn}/24h with power`
            : listing.infrastructure?.electricity.hoursOn != null
              ? `${listing.infrastructure.electricity.hoursOn}/24h with power`
              : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : listing.infrastructure?.electricity.generatorSpecs ??
        (listing.generatorAmperes
          ? `${listing.generatorAmperes}A`
          : null);

  const openPhoto = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  const shareLink = async () => {
    const url = IS_WEB
      ? window.location.href
      : `https://skoun.app/listing/${listing.id}`;
    try {
      if (IS_WEB) {
        await Clipboard.setStringAsync(url);
        setLinkCopied(true);
      } else {
        await Share.share({ message: `${title}\n${url}`, url });
      }
    } catch {
      /* dismissed */
    }
  };

  const openWhatsApp = () => {
    if (!posterPhone || !canContact) return;
    void Linking.openURL(
      buildWhatsAppListingUrl({
        phone: posterPhone,
        propertyType: labelListingType(listing.listingType),
        area: listing.area,
      }),
    );
  };

  const jumpToMap = () => {
    if (!IS_WEB) return;
    scrollToListingSection("listing-map");
  };

  const wifiScan = listing.infrastructure?.internet.hasFiber
    ? `Fiber${
        listing.infrastructure.internet.speedMbps
          ? ` ${listing.infrastructure.internet.speedMbps} Mbps`
          : ""
      }`
    : listing.wifiIncluded
      ? "Wi‑Fi included"
      : "Ask about Wi‑Fi";

  const facts = [
    {
      icon: "home-outline" as const,
      label: "Type",
      value: labelListingType(listing.listingType),
    },
    {
      icon: "people-outline" as const,
      label: "Who it's for",
      value:
        listing.genderRestriction !== "anyone"
          ? `${labelAudience(listing.targetAudience)} · ${labelGenderRestriction(listing.genderRestriction)}`
          : labelAudience(listing.targetAudience),
    },
    {
      icon: "flash-outline" as const,
      label: "Power",
      value: labelElectricity(elec),
    },
    {
      icon: "water-outline" as const,
      label: "Water",
      value: labelWater(water),
    },
    {
      icon: "wifi-outline" as const,
      label: "Wi‑Fi",
      value: wifiScan,
    },
  ];

  const thumbs = currentPhotos.slice(1, 1 + GALLERY_THUMB_COUNT);
  const extraCount = Math.max(0, currentPhotos.length - (1 + GALLERY_THUMB_COUNT));

  return (
    <View style={styles.page}>
      <View style={styles.topbar}>
        <View style={styles.crumbs}>
          <Pressable
            onPress={() => router.push("/search" as never)}
            accessibilityRole="link"
            accessibilityLabel="Back to Find"
            style={styles.crumb}
          >
            {({ hovered }) => (
              <>
                <Ionicons
                  name="arrow-back"
                  size={15}
                  color={Skoun.color.primary}
                />
                <LText
                  variant="caption"
                  style={[styles.crumbText, hovered && styles.linkHover]}
                >
                  Find
                </LText>
              </>
            )}
          </Pressable>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={Skoun.color.inkFaint}
          />
          <LText variant="caption" tone="muted" style={styles.crumbCurrent}>
            {listing.area}
          </LText>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={Skoun.color.inkFaint}
          />
          <LText
            variant="caption"
            tone="muted"
            style={styles.crumbCurrent}
            numberOfLines={1}
          >
            {title}
          </LText>
        </View>
      </View>

      <View style={styles.columns}>
        <View style={styles.mainCol}>
          <View style={styles.gallery}>
            <View style={styles.galleryMain}>
              <Pressable
                onPress={() => currentPhotos[0] && openPhoto(activePhotoIndex)}
                accessibilityRole="button"
                accessibilityLabel="Open photos"
                style={styles.galleryOpen}
              >
                <View style={styles.galleryMainClip}>
                  {currentPhotos[0] ? (
                    <Image
                      source={{
                        uri:
                          currentPhotos[activePhotoIndex]?.url ||
                          currentPhotos[0].url,
                      }}
                      style={styles.galleryMainImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.galleryEmpty}>
                      <Ionicons
                        name="image-outline"
                        size={36}
                        color={Skoun.color.inkFaint}
                      />
                      <LText variant="caption" tone="faint">
                        No photos yet
                      </LText>
                    </View>
                  )}
                </View>
              </Pressable>
              {currentPhotos.length > 1 ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous photo"
                    onPress={() => {
                      setActivePhotoIndex((i) =>
                        i > 0 ? i - 1 : currentPhotos.length - 1,
                      );
                    }}
                    style={[styles.galleryArrow, styles.galleryArrowLeft]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={Skoun.color.ink}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next photo"
                    onPress={() => {
                      setActivePhotoIndex((i) =>
                        i < currentPhotos.length - 1 ? i + 1 : 0,
                      );
                    }}
                    style={[styles.galleryArrow, styles.galleryArrowRight]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={Skoun.color.ink}
                    />
                  </Pressable>
                  <View style={styles.galleryCount}>
                    <Ionicons name="images-outline" size={13} color="#fff" />
                    <LText variant="caption" style={styles.galleryCountText}>
                      {activePhotoIndex + 1} / {currentPhotos.length}
                    </LText>
                  </View>
                </>
              ) : null}
            </View>

            {thumbs.length > 0 ? (
              <View style={styles.galleryThumbs}>
                {thumbs.map((photo, i) => {
                  const index = i + 1;
                  const isLast = i === thumbs.length - 1 && extraCount > 0;
                  return (
                    <Pressable
                      key={photo.id}
                      onPress={() => openPhoto(index)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isLast
                          ? `Open remaining ${extraCount + 1} photos`
                          : `Open photo ${index + 1}`
                      }
                      style={styles.galleryThumb}
                    >
                      <View style={styles.galleryThumbClip}>
                        <Image
                          source={{ uri: photo.url }}
                          style={styles.galleryThumbImg}
                          contentFit="cover"
                        />
                        {isLast ? (
                          <View style={styles.galleryMore}>
                            <LText
                              variant="subtitle"
                              style={styles.galleryMoreText}
                            >
                              +{extraCount + 1}
                            </LText>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <View style={styles.titleRow}>
                <LText
                  variant="display"
                  accessibilityRole="header"
                  style={styles.title}
                >
                  {title}
                </LText>
                {listing.reviewCount != null &&
                listing.reviewCount >= 1 &&
                listing.rating != null ? (
                  <View style={styles.headerRating}>
                    <ListingListRatingDisplay
                      rating={listing.rating}
                      reviewCount={listing.reviewCount}
                      size="lg"
                    />
                  </View>
                ) : null}
              </View>
              <LText variant="body" tone="muted">
                {listingPlace(listing)}
              </LText>
            </View>
          </View>

          <View style={styles.facts}>
            {facts.map((f, i) => (
              <View
                key={f.label}
                style={[styles.fact, i === facts.length - 1 && styles.factLast]}
              >
                <View style={styles.factLabelRow}>
                  <Ionicons name={f.icon} size={13} color={Skoun.color.inkFaint} />
                  <LText variant="label" tone="muted" style={styles.factLabel}>
                    {f.label}
                  </LText>
                </View>
                <View style={styles.factValueRow}>
                  <LText variant="body" style={styles.factValue} numberOfLines={2}>
                    {f.value}
                  </LText>
                </View>
              </View>
            ))}
          </View>

          <View nativeID="listing-utilities" style={[styles.section, styles.anchor, styles.stack]}>
            <View style={styles.sectionHead}>
              <LText variant="label" style={styles.sectionNumber}>
                01
              </LText>
              <LText variant="title" style={styles.sectionTitle}>
                Utilities on this listing
              </LText>
              <View style={styles.sectionRule} />
            </View>
            <LText variant="caption" tone="muted" style={styles.sectionLead}>
              Power, water, and internet — the three things that actually
              decide whether a Beirut room is livable.
            </LText>
            <View style={styles.utilGrid}>
              <View style={[styles.utilCol, styles.utilColFirst]}>
                <Ionicons
                  name="flash-outline"
                  size={20}
                  color={Skoun.color.warning}
                />
                <LText variant="label" tone="muted">
                  Electricity
                </LText>
                <LText variant="subtitle">{labelElectricity(elec)}</LText>
                {elecNote ? (
                  <LText variant="caption" tone="muted">
                    {elecNote}
                  </LText>
                ) : null}
              </View>
              <View style={styles.utilRule} />
              <View style={styles.utilCol}>
                <Ionicons name="water-outline" size={20} color="#0284C7" />
                <LText variant="label" tone="muted">
                  Water
                </LText>
                <LText variant="subtitle">{labelWater(water)}</LText>
                {listing.infrastructure?.water.notes ? (
                  <LText variant="caption" tone="muted">
                    {listing.infrastructure.water.notes}
                  </LText>
                ) : null}
              </View>
              <View style={styles.utilRule} />
              <View style={[styles.utilCol, styles.utilColLast]}>
                <Ionicons name="wifi-outline" size={20} color="#0F766E" />
                <LText variant="label" tone="muted">
                  Internet
                </LText>
                <LText variant="subtitle">{wifiLabel}</LText>
                {upsHours ? (
                  <LText variant="caption" tone="muted">
                    Router UPS ~{upsHours}h
                  </LText>
                ) : null}
              </View>
            </View>
          </View>

          <View nativeID="listing-campus" style={[styles.anchor, styles.stackRoomy]}>
            <ListingNearbyCampuses
              listing={listing}
              onViewMap={hasPin ? jumpToMap : undefined}
            />
          </View>

          {hasRooms ? (
            <View nativeID="listing-unit" style={[styles.anchor, styles.stackRoomy]}>
              <ListingDetailRooms
                listing={listing}
                posterPhone={posterPhone}
                variant="web"
              />
            </View>
          ) : (
            <View nativeID="listing-unit" style={[styles.anchor, styles.stackRoomy]}>
              <ListingDetailUnitSpecs listing={listing} variant="web" />
            </View>
          )}

          {description ? (
            <View nativeID="listing-about" style={[styles.anchor, styles.stackRoomy]}>
              <ListingDetailAbout description={description} variant="web" />
            </View>
          ) : null}

          <View nativeID="listing-amenities" style={[styles.anchor, styles.stackRoomy]}>
            <ListingDetailAmenities listing={listing} variant="web" />
          </View>

          {hasRules ? (
            <View nativeID="listing-rules" style={[styles.anchor, styles.stackRoomy]}>
              <ListingDetailHouseRules
                houseRules={listing.houseRules}
                cancellationPolicy={listing.cancellationPolicy}
                variant="web"
              />
            </View>
          ) : null}

          {hasPin ? (
            <View nativeID="listing-map" style={[styles.anchor, styles.stackRoomy]}>
              <ListingDetailMapSection listing={listing} variant="web" />
            </View>
          ) : null}

          {siblings.length > 0 ? (
            <View style={styles.stackRoomy}>
              <CoincidentListingsSection listings={siblings} />
            </View>
          ) : null}
        </View>

        <View
          ref={sidebarAnchorRef}
          collapsable={false}
          onLayout={() => syncSidebarFixed()}
          style={[styles.sideCol, { minHeight: sidebarHeight }]}
        >
          <View
            onLayout={(e: LayoutChangeEvent) => {
              const h = Math.ceil(e.nativeEvent.layout.height);
              if (h > 0 && h !== sidebarHeight) setSidebarHeight(h);
              syncSidebarFixed();
            }}
            style={[
              styles.sideSticky,
              IS_WEB && sidebarFixed
                ? ({
                    position: "fixed",
                    top: WEB_NAV_HEIGHT + 24,
                    left: sidebarFixed.left,
                    width: sidebarFixed.width,
                    zIndex: 40,
                  } as object)
                : null,
            ]}
          >
            <ListingContactCard
              listing={listing}
              title={title}
              price={formatFreshUsd(displayPrice)}
              priceLabel={isPbsa || hasRooms ? "From" : "Monthly rent"}
              saved={Boolean(saved.data)}
              linkCopied={linkCopied}
              canContact={canContact}
              canCall={canCall}
              onSave={() => toggleSaved.mutate(listing)}
              onShare={() => void shareLink()}
              onWhatsApp={openWhatsApp}
              onCall={() => void Linking.openURL(`tel:${callPhone}`)}
              reported={Boolean(reported.data)}
              onReport={() => setReportOpen(true)}
            />
          </View>
        </View>
      </View>

      <Modal visible={lightboxOpen} transparent animationType="fade">
        <View style={styles.lightbox}>
          <Pressable
            onPress={() => setLightboxOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close photos"
            style={styles.lightboxClose}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {currentPhotos[activePhotoIndex] ? (
            <Image
              source={{ uri: currentPhotos[activePhotoIndex].url }}
              style={styles.lightboxImg}
              contentFit="contain"
            />
          ) : null}
          <View style={styles.lightboxNav}>
            <Pressable
              disabled={activePhotoIndex === 0}
              onPress={() => setActivePhotoIndex((i) => Math.max(0, i - 1))}
              style={[
                styles.lightboxNavBtn,
                activePhotoIndex === 0 && { opacity: 0.3 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <LText variant="caption" style={{ color: "#fff" }}>
              {activePhotoIndex + 1} / {currentPhotos.length}
            </LText>
            <Pressable
              disabled={activePhotoIndex === currentPhotos.length - 1}
              onPress={() =>
                setActivePhotoIndex((i) =>
                  Math.min(currentPhotos.length - 1, i + 1),
                )
              }
              style={[
                styles.lightboxNavBtn,
                activePhotoIndex === currentPhotos.length - 1 && {
                  opacity: 0.3,
                },
              ]}
            >
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>

      <ReportListingDialog
        listingId={listing.id}
        listingTitle={title}
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    alignSelf: "stretch",
    gap: 10,
    paddingBottom: 48,
    overflow: "visible",
    marginTop: -16,
  },
  center: {
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  crumbs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  crumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 2,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  crumbText: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodySemi,
  },
  crumbCurrent: {
    fontFamily: Skoun.type.bodyMedium,
    flexShrink: 1,
  },
  linkHover: {
    textDecorationLine: "underline",
    textDecorationColor: Skoun.color.primary,
  },
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 48,
    width: "100%",
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
    gap: 28,
  },
  sideCol: {
    width: SIDE_W,
    flexShrink: 0,
  },

  gallery: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: GALLERY_GAP,
    height: GALLERY_H,
    width: "100%",
  },
  galleryMain: {
    flex: 1,
    minWidth: 0,
    borderRadius: Skoun.radius.lg,
    backgroundColor: Skoun.color.bgWash,
    ...PHOTO_FRAME,
  },
  galleryOpen: {
    ...StyleSheet.absoluteFill,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  galleryMainClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
  },
  galleryMainImg: {
    width: "100%",
    height: "100%",
  },
  galleryEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  galleryArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    ...(IS_WEB
      ? ({
          cursor: "pointer",
          boxShadow:
            "0 1px 2px rgba(18, 24, 38, 0.22), 0 6px 16px rgba(18, 24, 38, 0.28)",
        } as object)
      : {
          shadowColor: "#121826",
          shadowOpacity: 0.28,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  },
  galleryArrowLeft: { left: 14 },
  galleryArrowRight: { right: 14 },
  galleryCount: {
    position: "absolute",
    right: 14,
    bottom: 14,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Skoun.radius.pill,
    backgroundColor: "rgba(18, 24, 38, 0.72)",
  },
  galleryCountText: {
    color: "#fff",
    fontFamily: Skoun.type.bodySemi,
  },
  galleryThumbs: {
    width: 280,
    flexShrink: 0,
    gap: GALLERY_GAP,
  },
  galleryThumb: {
    flex: 1,
    minHeight: 0,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.bgWash,
    overflow: "hidden",
    ...PHOTO_FRAME,
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  galleryThumbClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: Skoun.radius.md,
    overflow: "hidden",
  },
  galleryThumbImg: {
    width: "100%",
    height: "100%",
  },
  galleryMore: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(18, 24, 38, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryMoreText: {
    color: "#fff",
    fontFamily: Skoun.type.bodyBold,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.7,
  },
  headerRating: {
    flexShrink: 0,
    paddingTop: 6,
  },

  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  fact: {
    flexGrow: 1,
    flexBasis: "18%",
    minWidth: 140,
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  factLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  factLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  factValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    lineHeight: 21,
    color: Skoun.color.ink,
  },
  factValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  factLast: {
    borderRightWidth: 0,
  },

  section: {
    gap: 14,
  },
  stack: {
    borderTopWidth: 3,
    borderTopColor: "#D0D7E1",
    paddingTop: 24,
  },
  stackRoomy: {
    borderTopWidth: 3,
    borderTopColor: "#D0D7E1",
    paddingTop: 24,
    marginTop: 16,
  },
  anchor: {
    borderRadius: Skoun.radius.lg,
    ...(IS_WEB
      ? ({ scrollMarginTop: WEB_NAV_HEIGHT + 16 } as object)
      : null),
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 24,
  },
  sectionNumber: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodyBold,
    letterSpacing: 1,
    fontSize: 12,
  },
  sectionTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  sectionLead: {
    lineHeight: 20,
    marginTop: -4,
    paddingHorizontal: 24,
  },
  utilGrid: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  utilCol: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 20,
  },
  utilColFirst: {
    paddingLeft: 24,
  },
  utilColLast: {
    paddingRight: 24,
  },
  utilRule: {
    width: 2,
    alignSelf: "stretch",
    backgroundColor: "#D0D7E1",
    ...(IS_WEB ? ({ width: "2px" } as object) : null),
  },

  sideSticky: {
    width: "100%",
  },

  lightbox: {
    flex: 1,
    backgroundColor: "rgba(18, 24, 38, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lightboxClose: {
    position: "absolute",
    top: 24,
    right: 24,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
  lightboxImg: {
    width: "100%",
    maxWidth: 1100,
    height: "78%",
  },
  lightboxNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 16,
  },
  lightboxNavBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    ...(IS_WEB ? ({ cursor: "pointer" } as object) : null),
  },
});
