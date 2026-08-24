import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  Droplets,
  Globe,
  Lightbulb,
  Shield,
  Users,
  Zap,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { CoincidentListingsSection } from "@/components/listings/CoincidentListingsSection";
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
  labelElectricity,
  labelListingType,
  labelWater,
} from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import {
  buildWhatsAppListingUrl,
  hasUsableWhatsAppPhone,
} from "@/lib/whatsapp";
import type { ListingPhoto, PbsaRoomType } from "@/types/listing";

type Props = {
  listingId: string;
};

export function ListingDetailWeb({ listingId }: Props) {
  const { data: listing, isLoading, isError } = useListing(listingId);
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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomCategoryFilter, setRoomCategoryFilter] = useState<string>("all");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);

  // Accordion collapsed state for PBSA room categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    studio: false,
    ensuite: false,
    shared_room: false,
    apartment: false,
  });

  useRecordListingView(listingId, Boolean(listingId) && !isError);

  // Active room type selection for PBSA
  const selectedRoom = useMemo(() => {
    if (!listing?.pbsaRoomTypes || listing.pbsaRoomTypes.length === 0) return null;
    return (
      listing.pbsaRoomTypes.find((r) => r.id === selectedRoomId) ||
      listing.pbsaRoomTypes[0]
    );
  }, [listing?.pbsaRoomTypes, selectedRoomId]);

  // Dynamic photos depending on selected room or main property
  const currentPhotos: ListingPhoto[] = useMemo(() => {
    if (selectedRoom && selectedRoom.photos && selectedRoom.photos.length > 0) {
      return selectedRoom.photos;
    }
    if (listing?.photos && listing.photos.length > 0) {
      return listing.photos;
    }
    if (listing?.coverUrl) {
      return [{ id: "cover", url: listing.coverUrl, sortOrder: 0 }];
    }
    return [];
  }, [selectedRoom, listing?.photos, listing?.coverUrl]);

  // Group room types by category (Hook must be declared before any conditional returns)
  const roomTypesByCategory = useMemo(() => {
    if (!listing?.pbsaRoomTypes) {
      return { studio: [], ensuite: [], shared_room: [], apartment: [] };
    }
    const rooms = listing.pbsaRoomTypes;
    const grouped: Record<string, PbsaRoomType[]> = {
      studio: [],
      ensuite: [],
      shared_room: [],
      apartment: [],
    };
    rooms.forEach((r) => {
      const cat = r.category || "studio";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    });
    return grouped;
  }, [listing?.pbsaRoomTypes]);

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

  const isPbsa = listing.isPbsa || listing.listingType === "pbsa_building";
  const displayPrice = selectedRoom
    ? selectedRoom.monthlyRentUsd
    : listing.monthlyRentUsd;

  const posterPhone = listing.whatsappNumber || null;
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

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <View style={styles.page}>
      {/* Amberstudent Top Fold 2-Column Grid */}
      <View style={styles.topFoldGrid}>
        
        {/* LEFT COLUMN (~68% width): Breadcrumbs -> Gallery -> Action Pills -> Header & Details */}
        <View style={styles.leftColContainer}>
          {/* 1. Amber Breadcrumbs Bar */}
          <View style={styles.breadcrumbList}>
            <Pressable onPress={() => router.push("/search" as never)}>
              <LText variant="caption" tone="primary" style={styles.breadcrumbLink}>
                Home
              </LText>
            </Pressable>
            <LText variant="caption" tone="muted"> › </LText>
            <LText variant="caption" tone="muted">Lebanon</LText>
            <LText variant="caption" tone="muted"> › </LText>
            <LText variant="caption" tone="muted">Beirut</LText>
            <LText variant="caption" tone="muted"> › </LText>
            <LText variant="caption" style={styles.breadcrumbActive}>
              {isPbsa && listing.pbsaBuildingName ? listing.pbsaBuildingName : `${listing.area} Student Housing`}
            </LText>
          </View>

          <View style={styles.leftContentBody}>
            {/* 2. Amber Photo Preview Gallery Grid (Main Hero + 3 Side Thumbnails) */}
            <View style={styles.heroGridContainer}>
            {/* Main Hero Column */}
            <View style={styles.heroMainColumn}>
              {currentPhotos[0] ? (
                <Pressable
                  style={styles.heroMainPressable}
                  onPress={() => {
                    setActivePhotoIndex(0);
                    setLightboxOpen(true);
                  }}
                >
                  <Image
                    source={{ uri: currentPhotos[activePhotoIndex]?.url || currentPhotos[0].url }}
                    style={styles.heroMainImg}
                    contentFit="cover"
                  />
                  
                  {/* Left Carousel Arrow */}
                  <Pressable
                    style={styles.carouselArrowLeft}
                    onPress={(e) => {
                      e.stopPropagation();
                      setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : currentPhotos.length - 1));
                    }}
                  >
                    <Ionicons name="chevron-back" size={16} color="#111928" />
                  </Pressable>

                  {/* Right Carousel Arrow */}
                  <Pressable
                    style={styles.carouselArrowRight}
                    onPress={(e) => {
                      e.stopPropagation();
                      setActivePhotoIndex((prev) => (prev < currentPhotos.length - 1 ? prev + 1 : 0));
                    }}
                  >
                    <Ionicons name="chevron-forward" size={16} color="#111928" />
                  </Pressable>

                  {/* Pagination Dots */}
                  <View style={styles.dotsTrack}>
                    {currentPhotos.slice(0, 6).map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.dotItem,
                          activePhotoIndex === idx && styles.dotItemActive,
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Ionicons name="image-outline" size={40} color={Skoun.color.inkFaint} />
                  <LText variant="caption" tone="faint">No photos available</LText>
                </View>
              )}
            </View>

            {/* 3 Stacked Side Thumbnails */}
            <View style={styles.heroSideColumn}>
              {/* Top Thumb: Video Walkthrough */}
              <Pressable style={styles.sideThumbItem} onPress={() => setLightboxOpen(true)}>
                <Image
                  source={{ uri: currentPhotos[1]?.url || currentPhotos[0]?.url || "" }}
                  style={styles.sideThumbImg}
                  contentFit="cover"
                />
                <View style={styles.sideVideoBadge}>
                  <View style={styles.playCircleIcon}>
                    <Ionicons name="play" size={14} color="#111928" />
                  </View>
                </View>
              </Pressable>

              {/* Middle Thumb: 360 Tour */}
              <Pressable style={styles.sideThumbItem} onPress={() => setLightboxOpen(true)}>
                <Image
                  source={{ uri: currentPhotos[2]?.url || currentPhotos[0]?.url || "" }}
                  style={styles.sideThumbImg}
                  contentFit="cover"
                />
                <View style={styles.side360Badge}>
                  <LText variant="caption" style={styles.side360Text}>360°</LText>
                </View>
              </Pressable>

              {/* Bottom Thumb: +X Photos */}
              <Pressable style={styles.sideThumbItem} onPress={() => setLightboxOpen(true)}>
                <Image
                  source={{ uri: currentPhotos[3]?.url || currentPhotos[0]?.url || "" }}
                  style={styles.sideThumbImg}
                  contentFit="cover"
                />
                <View style={styles.sideMoreOverlay}>
                  <LText variant="title" style={styles.sideMoreText}>
                    +{Math.max(1, currentPhotos.length - 3)}
                  </LText>
                </View>
              </Pressable>
            </View>
          </View>

          {/* 3. Action Buttons Row (Photos, Videos, 3D, Map View) */}
          <View style={styles.actionButtonsBar}>
            <Pressable style={styles.actionPillBtn} onPress={() => setLightboxOpen(true)}>
              <Ionicons name="camera-outline" size={16} color="#111928" />
              <LText variant="caption" style={styles.actionPillText}>Photos</LText>
            </Pressable>

            <Pressable style={styles.actionPillBtn} onPress={() => setLightboxOpen(true)}>
              <Ionicons name="videocam-outline" size={16} color="#111928" />
              <LText variant="caption" style={styles.actionPillText}>Videos</LText>
            </Pressable>

            <Pressable style={styles.actionPillBtn} onPress={() => setLightboxOpen(true)}>
              <Ionicons name="cube-outline" size={16} color="#111928" />
              <LText variant="caption" style={styles.actionPillText}>3D Views</LText>
            </Pressable>

            <Pressable
              style={styles.actionPillBtn}
              onPress={() => {
                if (listing.lat && listing.lng) {
                  void Linking.openURL(`https://maps.google.com/?q=${listing.lat},${listing.lng}`);
                }
              }}
            >
              <Ionicons name="map-outline" size={16} color="#111928" />
              <LText variant="caption" style={styles.actionPillText}>Map View</LText>
            </Pressable>
          </View>

          {/* 4. Property Title & Price Header */}
          <View style={styles.propertyOverviewContainer} id="overview">
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <LText variant="display" style={styles.propertyName}>
                  {isPbsa && listing.pbsaBuildingName ? listing.pbsaBuildingName : `${listing.area} Student Housing`}
                </LText>
                <LText variant="body" tone="muted" style={styles.propertyAddress}>
                  {listing.landmark ? `${listing.landmark}, ${listing.area}` : `${listing.area}, Beirut, Lebanon`}
                </LText>
              </View>

              <View style={styles.priceHeaderRhs}>
                <LText variant="caption" tone="muted">From</LText>
                <LText variant="display" style={[rentPriceType, styles.priceValue]}>
                  {formatFreshUsd(displayPrice)}
                </LText>
                <LText variant="caption" tone="muted">per month</LText>
              </View>
            </View>

            {/* Distance & Travel Modes Strip */}
            <View style={styles.distanceInfoStrip}>
              <Ionicons name="location" size={24} color={Skoun.color.primary} />
              <View style={{ flex: 1 }}>
                <LText variant="subtitle" style={styles.distanceFromCenterText}>
                  {distance || `Near ${listing.area} City Hub`}
                </LText>

                <View style={styles.distanceByModesRow}>
                  <LText variant="caption" tone="muted">(</LText>
                  <Ionicons name="car-outline" size={14} color="#374151" />
                  <LText variant="caption" style={styles.modeDurationText}> 8min</LText>
                  <LText variant="caption" tone="muted"> · </LText>
                  <Ionicons name="bus-outline" size={14} color="#374151" />
                  <LText variant="caption" style={styles.modeDurationText}> 15min</LText>
                  <LText variant="caption" tone="muted"> · </LText>
                  <Ionicons name="walk-outline" size={14} color="#374151" />
                  <LText variant="caption" style={styles.modeDurationText}> 22min</LText>
                  <LText variant="caption" tone="muted">)</LText>

                  <Pressable
                    onPress={() => {
                      if (listing.lat && listing.lng) {
                        void Linking.openURL(`https://maps.google.com/?q=${listing.lat},${listing.lng}`);
                      }
                    }}
                  >
                    <LText variant="caption" style={styles.viewOnMapBtn}>View map</LText>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* University Proximity Track */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.distancePillsScroll}>
              {[
                { name: "American University of Beirut (AUB)", dist: "0.3 mi · 5 min walk" },
                { name: "Lebanese American University (LAU)", dist: "0.8 mi · 12 min transit" },
                { name: "Université Saint-Joseph (USJ)", dist: "2.1 mi · 18 min bus" },
                { name: "Haigazian University", dist: "1.4 mi · 15 min walk" },
              ].map((uni, idx) => (
                <View key={idx} style={styles.distancePillCard}>
                  <View style={styles.uniIconCircle}>
                    <Ionicons name="school" size={14} color="#011851" />
                  </View>
                  <LText variant="caption" style={styles.uniPillText}>
                    {uni.name} | {uni.dist}
                  </LText>
                </View>
              ))}
            </ScrollView>

            {/* Policy & Perks Track */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.policyPillsScroll}>
              <View style={[styles.policyPill, styles.policyPillHighlight]}>
                <Zap size={13} color={Skoun.color.primaryDeep} strokeWidth={2} />
                <LText variant="caption" style={styles.policyHighlightText}>24/7 Power Guarantee</LText>
              </View>
              <View style={[styles.policyPill, styles.policyPillHighlight]}>
                <Droplets size={13} color={Skoun.color.primaryDeep} strokeWidth={2} />
                <LText variant="caption" style={styles.policyHighlightText}>Artesian Well Water</LText>
              </View>
              <View style={styles.policyPill}>
                <Globe size={13} color={Skoun.color.ink} strokeWidth={2} />
                <LText variant="caption" style={styles.policyPillText}>Fiber + 8h Router UPS</LText>
              </View>
              <View style={styles.policyPill}>
                <Shield size={13} color={Skoun.color.ink} strokeWidth={2} />
                <LText variant="caption" style={styles.policyPillText}>No Visa No Pay</LText>
              </View>
              <View style={styles.policyPill}>
                <Users size={13} color={Skoun.color.ink} strokeWidth={2} />
                <LText variant="caption" style={styles.policyPillText}>Dual Occupancy</LText>
              </View>
              <View style={styles.policyPill}>
                <Lightbulb size={13} color={Skoun.color.ink} strokeWidth={2} />
                <LText variant="caption" style={styles.policyPillText}>Bills Included</LText>
              </View>
            </ScrollView>
          </View>

          {/* 5. LEBANON REALITY INFRASTRUCTURE STRIP */}
          <View style={styles.lebanonInfraSection}>
            <View style={styles.lebanonInfraHeader}>
              <Ionicons name="shield-checkmark" size={22} color={Skoun.color.primary} />
              <LText variant="title" style={styles.lebanonInfraTitle}>
                Lebanon Reality Infrastructure Guarantee 🇱🇧
              </LText>
            </View>

            <View style={styles.lebanonInfraGrid}>
              <View style={styles.infraBox}>
                <Ionicons name="flash" size={20} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <LText variant="subtitle">Electricity & Generator</LText>
                  <LText variant="caption" style={{ fontWeight: "700", color: Skoun.color.primaryDeep }}>
                    {labelElectricity(listing.infrastructure?.electricity.status || listing.electricity)}
                  </LText>
                  <LText variant="caption" tone="muted">
                    {listing.infrastructure?.electricity.ampLimit || 10}A Limit · {listing.infrastructure?.electricity.generatorSpecs || "24/7 Generator Switch"}
                  </LText>
                </View>
              </View>

              <View style={styles.infraBox}>
                <Ionicons name="water" size={20} color="#0284C7" />
                <View style={{ flex: 1 }}>
                  <LText variant="subtitle">Water Reliability</LText>
                  <LText variant="caption" style={{ fontWeight: "700", color: Skoun.color.primaryDeep }}>
                    {labelWater(listing.infrastructure?.water.status || listing.water)}
                  </LText>
                  <LText variant="caption" tone="muted">
                    {listing.infrastructure?.water.notes || "Artesian Well + Roof Tank UPS Pump"}
                  </LText>
                </View>
              </View>

              <View style={styles.infraBox}>
                <Ionicons name="wifi" size={20} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <LText variant="subtitle">Fiber & Router UPS</LText>
                  <LText variant="caption" style={{ fontWeight: "700", color: Skoun.color.primaryDeep }}>
                    {listing.infrastructure?.internet.hasFiber ? "Fiber Optic 100Mbps" : "High-Speed Wi-Fi"}
                  </LText>
                  <LText variant="caption" tone="muted">
                    {listing.infrastructure?.internet.routerUpsHours || 8}-Hour Router UPS Backup During Blackouts
                  </LText>
                </View>
              </View>
            </View>
          </View>

          {/* 6. CONDITIONAL LAYOUT: PBSA vs STANDARD MODEL */}
          {isPbsa ? (
            /* PBSA MODEL: Interactive Available Room Types */
            <View style={styles.roomTypesSection} id="room_type">
              <View style={styles.roomTypesHeaderRow}>
                <LText variant="title" style={styles.sectionHeadingText}>
                  Available Room Types ({listing.pbsaRoomTypes?.length || 3})
                </LText>
              </View>

              {/* Room Category Tabs */}
              <View style={styles.roomTabsContainer}>
                {[
                  { id: "all", label: `All (${listing.pbsaRoomTypes?.length || 3})` },
                  { id: "studio", label: "Studio (1)" },
                  { id: "ensuite", label: "Ensuite (1)" },
                  { id: "shared_room", label: "Shared Room (1)" },
                ].map((tab) => (
                  <Pressable
                    key={tab.id}
                    onPress={() => setRoomCategoryFilter(tab.id)}
                    style={[
                      styles.roomTabPill,
                      roomCategoryFilter === tab.id && styles.roomTabPillActive,
                    ]}
                  >
                    <LText
                      variant="caption"
                      style={[
                        styles.roomTabText,
                        roomCategoryFilter === tab.id && styles.roomTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </LText>
                  </Pressable>
                ))}
              </View>

              {/* Accordion Categories */}
              {(["studio", "ensuite", "shared_room"] as const).map((catKey) => {
                const catRooms = roomTypesByCategory[catKey] || [];
                if (roomCategoryFilter !== "all" && roomCategoryFilter !== catKey) return null;
                if (catRooms.length === 0) return null;

                const isCollapsed = collapsedCategories[catKey];
                const catTitles = {
                  studio: { title: "Studio", desc: "All-in-one space with bedroom, private bathroom, living area, and kitchenette — Ideal for complete independence" },
                  ensuite: { title: "Ensuite", desc: "A private room with its own bathroom — Maximum privacy and comfort" },
                  shared_room: { title: "Shared Twin Room", desc: "Shared room for two students with twin beds and private bathroom" },
                  apartment: { title: "Apartment", desc: "Multi-room apartment with shared living and kitchen areas" },
                };

                return (
                  <View key={catKey} style={styles.accordionCategoryItem}>
                    {/* Accordion Header */}
                    <Pressable
                      style={styles.accordionHeaderPressable}
                      onPress={() => toggleCategory(catKey)}
                    >
                      <View style={styles.accordionIconBox}>
                        <Ionicons name="home" size={20} color="#1F2A37" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <LText variant="subtitle" style={styles.accordionTitleText}>
                          {catTitles[catKey].title}
                        </LText>
                        <LText variant="caption" tone="muted" style={styles.accordionSubTitleText}>
                          {catTitles[catKey].desc}
                        </LText>
                      </View>
                      <Ionicons
                        name={isCollapsed ? "chevron-down" : "chevron-up"}
                        size={18}
                        color="#1F2A37"
                      />
                    </Pressable>

                    {/* Accordion Content (Room Cards) */}
                    {!isCollapsed ? (
                      <View style={styles.accordionContentContainer}>
                        {catRooms.map((room) => {
                          const isSelected = selectedRoom?.id === room.id;
                          return (
                            <View key={room.id} style={[styles.roomCardBox, isSelected && styles.roomCardSelected]}>
                              <View style={styles.roomCardInnerRow}>
                                {/* Thumbnail */}
                                <Pressable
                                  style={styles.roomCardImgWrap}
                                  onPress={() => {
                                    setSelectedRoomId(room.id);
                                    setActivePhotoIndex(0);
                                  }}
                                >
                                  <Image
                                    source={{ uri: room.photos[0]?.url || listing.coverUrl || "" }}
                                    style={styles.roomCardThumbImg}
                                    contentFit="cover"
                                  />
                                  <View style={styles.photoCountPill}>
                                    <Ionicons name="images-outline" size={10} color="#fff" />
                                    <LText variant="caption" style={styles.photoCountText}>
                                      {room.photos.length || 1}
                                    </LText>
                                  </View>
                                </Pressable>

                                {/* Room Details */}
                                <View style={styles.roomCardInfoCol}>
                                  <View style={styles.roomCardTitleRow}>
                                    <LText variant="subtitle" style={styles.roomCardTitle}>
                                      {room.name}
                                    </LText>
                                  </View>

                                  <LText variant="caption" tone="muted" style={styles.roomCardDescription}>
                                    {room.description}
                                  </LText>

                                  <View style={styles.roomCardMetaLine}>
                                    <LText variant="caption" style={styles.availabilityText}>
                                      Available from: <LText variant="caption" style={{ fontWeight: "700" }}>{room.availableFrom || "Sep 1, 2026"}</LText>
                                    </LText>
                                    <LText variant="caption" tone="muted"> · </LText>
                                    <LText variant="caption" style={styles.priceContainerText}>
                                      From: <LText variant="caption" style={{ fontWeight: "700", color: Skoun.color.primaryDeep }}>{formatFreshUsd(room.monthlyRentUsd)}/month</LText>
                                    </LText>
                                  </View>

                                  {/* Amenity Tags */}
                                  <View style={styles.roomTagRow}>
                                    {room.features.map((feat, fIdx) => (
                                      <View key={fIdx} style={styles.amberTagPill}>
                                        <LText variant="caption" style={styles.amberTagText}>
                                          {feat}
                                        </LText>
                                      </View>
                                    ))}
                                  </View>
                                </View>

                                {/* Select Action Button */}
                                <Pressable
                                  style={[
                                    styles.selectRoomBtn,
                                    isSelected && styles.selectRoomBtnActive,
                                  ]}
                                  onPress={() => {
                                    setSelectedRoomId(room.id);
                                    setActivePhotoIndex(0);
                                  }}
                                >
                                  <LText
                                    variant="caption"
                                    style={[
                                      styles.selectRoomBtnText,
                                      isSelected && styles.selectRoomBtnTextActive,
                                    ]}
                                  >
                                    {isSelected ? "Selected ✓" : "Select Room"}
                                  </LText>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            /* STANDARD UNIT / FLATSHARE MODEL */
            <View style={styles.standardSpecsSection}>
              <LText variant="title" style={styles.sectionHeadingText}>
                Unit Specifications
              </LText>
              <View style={styles.specsGridThreeCol}>
                <View style={styles.specTile}>
                  <Ionicons name="business-outline" size={20} color={Skoun.color.primary} />
                  <LText variant="label" tone="muted">Floor Level</LText>
                  <LText variant="subtitle">{listing.unitSpecs?.floorLevel || "3rd Floor (24/7 Elevator)"}</LText>
                </View>

                <View style={styles.specTile}>
                  <Ionicons name="bed-outline" size={20} color={Skoun.color.primary} />
                  <LText variant="label" tone="muted">Room Category</LText>
                  <LText variant="subtitle">
                    {listing.listingType === "private_room" ? "Private Room in Flatshare" : "Entire Apartment"}
                  </LText>
                </View>

                <View style={styles.specTile}>
                  <Ionicons name="people-outline" size={20} color={Skoun.color.primary} />
                  <LText variant="label" tone="muted">Roommate Info</LText>
                  <LText variant="subtitle">
                    {listing.unitSpecs?.roommateDetails?.count || 2} Students ({listing.unitSpecs?.roommateDetails?.occupations || "AUB & LAU Students"})
                  </LText>
                </View>

                <View style={styles.specTile}>
                  <Ionicons name="cash-outline" size={20} color={Skoun.color.primary} />
                  <LText variant="label" tone="muted">Security Deposit</LText>
                  <LText variant="subtitle">{formatFreshUsd(listing.unitSpecs?.depositUsd || listing.monthlyRentUsd)}</LText>
                </View>
              </View>
            </View>
          )}

          {/* 7. About Property Section */}
          <View style={styles.aboutPropertySection} id="description">
            <LText variant="title" style={styles.sectionHeadingLineText}>
              About the Property
            </LText>

            <View style={styles.aboutContentBox}>
              <LText variant="body" style={styles.aboutParagraphText}>
                <LText variant="subtitle" style={{ fontWeight: "700" }}>{listing.area} Student Accommodation </LText>
                is ideally located near top universities in Beirut, offering a modern mix of studios & flatshares crafted for comfortable student living. Nearby campuses such as AUB & LAU are just minutes away.
              </LText>

              {showFullAbout ? (
                <View style={{ gap: 12, marginTop: 12 }}>
                  <LText variant="subtitle" style={styles.aboutSubHeading}>Features & Living Experience</LText>
                  <LText variant="body" tone="muted">
                    Equipped with dedicated study desks, high-speed fiber internet, and 24/7 power generator switching. Private bathrooms, air conditioning, and full kitchen facilities enable a seamless academic lifestyle.
                  </LText>

                  <LText variant="subtitle" style={styles.aboutSubHeading}>Location & Transport</LText>
                  <LText variant="body" tone="muted">
                    Situated in a vibrant neighborhood with grocery markets, pharmacies, quiet cafes, and quick taxi routes to downtown Beirut.
                  </LText>
                </View>
              ) : null}

              <Pressable
                style={styles.showMoreBtn}
                onPress={() => setShowFullAbout(!showFullAbout)}
              >
                <LText variant="caption" style={styles.showMoreBtnText}>
                  {showFullAbout ? "Show less ↑" : "Show more ↓"}
                </LText>
              </Pressable>
            </View>
          </View>

          {/* 8. Amenities Section */}
          <View style={styles.amenitiesContainer} id="amenities">
            <LText variant="title" style={styles.sectionHeadingText}>
              Amenities
            </LText>

            <View style={styles.amenitiesCategoryGroup}>
              <LText variant="subtitle" style={styles.amenityCategoryHeader}>
                Shared Community And Utilities
              </LText>
              <View style={styles.amenityTagsContainer}>
                {[
                  "1Gbps* Fiber Internet",
                  "24/7 Power Generator",
                  "Artesian Water Supply",
                  "Communal Student Lounge",
                  "Study Desks & Outlets",
                  "Bike & Scooter Storage",
                  "Communal TV & Lounge",
                ].map((item, i) => (
                  <View key={i} style={styles.amenityTagPill}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={Skoun.color.primaryDeep} />
                    <LText variant="caption" style={styles.amenityTagText}>{item}</LText>
                  </View>
                ))}
              </View>

              <View style={styles.amenityDivider} />

              <LText variant="subtitle" style={styles.amenityCategoryHeader}>
                Security & Building Services
              </LText>
              <View style={styles.amenityTagsContainer}>
                {[
                  "24/7 Elevator UPS",
                  "Keycard Entry & CCTV",
                  "Laundry Room",
                  "No Pets Allowed",
                ].map((item, i) => (
                  <View key={i} style={styles.amenityTagPill}>
                    <Ionicons name="shield-outline" size={16} color={Skoun.color.primaryDeep} />
                    <LText variant="caption" style={styles.amenityTagText}>{item}</LText>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* 9. House Rules & Cancellation Policies */}
          <View style={styles.policiesSectionContainer} id="house_rules">
            <LText variant="title" style={styles.sectionHeadingText}>
              House Rules & Policies
            </LText>

            <View style={styles.policiesListContainer}>
              <View style={styles.policyRowItem}>
                <Ionicons name="checkmark-done-circle" size={20} color="#011851" />
                <View style={{ flex: 1 }}>
                  <LText variant="subtitle" style={styles.policyItemTitle}>Cooling Off Period</LText>
                  <LText variant="caption" tone="muted">
                    7 calendar days cooling-off period is allowed from the date of booking with full deposit refund.
                  </LText>
                </View>
              </View>

              <View style={styles.policyRowItem}>
                <Ionicons name="school" size={20} color="#011851" />
                <View style={{ flex: 1 }}>
                  <LText variant="subtitle" style={styles.policyItemTitle}>No Place No Pay</LText>
                  <LText variant="caption" tone="muted">
                    Full refund for first-year students if university offer or student visa is cancelled.
                  </LText>
                </View>
              </View>

              <View style={styles.policyRowItem}>
                <Ionicons name="swap-horizontal" size={20} color="#011851" />
                <View style={{ flex: 1 }}>
                  <LText variant="subtitle" style={styles.policyItemTitle}>Replacement Tenant Policy</LText>
                  <LText variant="caption" tone="muted">
                    Early termination permitted if approved replacement student tenant is found.
                  </LText>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Vertical Separator Line */}
      <View style={styles.verticalSeparator} />

      {/* RIGHT COLUMN (~32% width): Amber Top Sticky Booking Sidebar */}
      <View style={styles.rightStickySidebar}>
        {/* Card 1: Main CTA & Social Proof Card */}
        <View style={styles.stickyTopCard}>
          {/* Header Title with Save & Share Icons */}
          <View style={styles.stickyCardHeaderRow}>
            <LText variant="title" style={styles.stickyBuildingTitle}>
              {isPbsa && listing.pbsaBuildingName ? listing.pbsaBuildingName : `${listing.area} Housing`}
            </LText>
            <View style={styles.topIconActions}>
              <Pressable onPress={() => toggleSaved.mutate(listing)} style={styles.topCircleBtn}>
                <Ionicons
                  name={saved.data ? "heart" : "heart-outline"}
                  size={16}
                  color={saved.data ? Skoun.color.danger : "#6B7280"}
                />
              </Pressable>
              <Pressable onPress={() => void copyLink()} style={styles.topCircleBtn}>
                <Ionicons name="share-outline" size={16} color="#111928" />
              </Pressable>
            </View>
          </View>

          {/* Primary Action Button: See Availability */}
          <Pressable
            style={styles.seeAvailabilityBtn}
            onPress={() => setInquiryModalOpen(true)}
          >
            <LText variant="subtitle" style={styles.seeAvailabilityText}>
              See Availability
            </LText>
          </Pressable>

          {/* Secondary Action Button: Enquire Now */}
          <Pressable
            style={styles.enquireNowBtn}
            onPress={() => {
              if (!posterPhone || !canContact) return;
              const url = buildWhatsAppListingUrl({
                phone: posterPhone,
                propertyType: selectedRoom ? selectedRoom.name : labelListingType(listing.listingType),
                area: listing.area,
              });
              void Linking.openURL(url);
            }}
          >
            <LText variant="subtitle" style={styles.enquireNowText}>
              Enquire Now
            </LText>
          </Pressable>

          {/* Social Proof Banner Pill */}
          <View style={styles.socialProofPill}>
            <Ionicons name="document-text" size={14} color={Skoun.color.primary} />
            <LText variant="caption" style={styles.socialProofText}>
              Sakina +1 booked this property recently
            </LText>
          </View>
        </View>

        {/* Card 2: Amber Trust Accordion Card */}
        <View style={styles.stickyTrustCard}>
          {[
            { icon: "thumbs-up-outline", title: "Lowest Price Guaranteed" },
            { icon: "shield-checkmark-outline", title: "Verified Properties" },
            { icon: "headset-outline", title: "24x7 Personal Assistance" },
            { icon: "person-outline", title: "Move-In Buddy" },
            { icon: "star-outline", title: "10.4K+ Reviews" },
          ].map((item, idx) => (
            <View key={idx} style={styles.trustAccordionRow}>
              <View style={styles.trustIconCircle}>
                <Ionicons name={item.icon as any} size={15} color={Skoun.color.primary} />
              </View>
              <LText variant="caption" style={styles.trustItemTitle}>{item.title}</LText>
              <Ionicons name="chevron-down" size={14} color="#1F2A37" style={{ marginLeft: "auto" }} />
            </View>
          ))}
        </View>
      </View>

      </View>

      {/* Lightbox Modal */}
      <Modal visible={lightboxOpen} transparent animationType="fade">
        <View style={styles.lightboxOverlay}>
          <Pressable style={styles.lightboxCloseBtn} onPress={() => setLightboxOpen(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>

          <View style={styles.lightboxContent}>
            {currentPhotos[activePhotoIndex] ? (
              <Image
                source={{ uri: currentPhotos[activePhotoIndex].url }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            ) : null}

            <View style={styles.lightboxNavRow}>
              <Pressable
                disabled={activePhotoIndex === 0}
                onPress={() => setActivePhotoIndex((prev) => Math.max(0, prev - 1))}
                style={[styles.lightboxNavBtn, activePhotoIndex === 0 && { opacity: 0.3 }]}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </Pressable>
              <LText variant="caption" style={{ color: "#fff" }}>
                {activePhotoIndex + 1} / {currentPhotos.length}
              </LText>
              <Pressable
                disabled={activePhotoIndex === currentPhotos.length - 1}
                onPress={() => setActivePhotoIndex((prev) => Math.min(currentPhotos.length - 1, prev + 1))}
                style={[styles.lightboxNavBtn, activePhotoIndex === currentPhotos.length - 1 && { opacity: 0.3 }]}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Inquiry Modal */}
      <Modal visible={inquiryModalOpen} transparent animationType="slide">
        <View style={styles.inquiryOverlay}>
          <View style={styles.inquiryCard}>
            <View style={styles.inquiryHeader}>
              <LText variant="title">Schedule Tour / Inquire</LText>
              <Pressable onPress={() => setInquiryModalOpen(false)}>
                <Ionicons name="close" size={22} color={Skoun.color.ink} />
              </Pressable>
            </View>
            <LText variant="body" tone="muted" style={{ marginVertical: 12 }}>
              Send an instant inquiry for {listing.area} ({selectedRoom ? selectedRoom.name : "Property"}).
            </LText>
            <LButton
              label="Open WhatsApp Direct Chat"
              icon={<Ionicons name="logo-whatsapp" size={18} color="#fff" />}
              onPress={() => {
                if (!posterPhone || !canContact) return;
                setInquiryModalOpen(false);
                const url = buildWhatsAppListingUrl({
                  phone: posterPhone,
                  propertyType: selectedRoom ? selectedRoom.name : labelListingType(listing.listingType),
                  area: listing.area,
                });
                void Linking.openURL(url);
              }}
              style={{ backgroundColor: "#25D366" }}
            />
          </View>
        </View>
      </Modal>

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
    paddingBottom: 40,
    backgroundColor: Skoun.color.bg,
    maxWidth: 1240,
    alignSelf: "center",
    width: "100%",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  topFoldGrid: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    alignItems: "flex-start",
  },
  verticalSeparator: {
    width: 1,
    backgroundColor: "#E5E7EB",
    alignSelf: "stretch",
    marginHorizontal: 8,
  },
  leftColContainer: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  leftContentBody: {
    gap: 24,
    width: "100%",
  },
  rightStickySidebar: {
    width: 440,
    position: "sticky" as unknown as "relative",
    top: 80,
    alignSelf: "flex-start",
    gap: 16,
  },
  breadcrumbList: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingVertical: 4,
  },
  breadcrumbLink: {
    color: Skoun.color.primary,
  },
  breadcrumbActive: {
    fontWeight: "600",
    color: "#111928",
  },
  heroGridContainer: {
    flexDirection: "row",
    height: 400,
    gap: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  heroMainColumn: {
    flex: 3,
    height: "100%",
    position: "relative",
  },
  heroMainPressable: {
    width: "100%",
    height: "100%",
  },
  heroMainImg: {
    width: "100%",
    height: "100%",
  },
  carouselArrowLeft: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  } as Record<string, unknown>,
  carouselArrowRight: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  } as Record<string, unknown>,
  dotsTrack: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dotItem: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotItemActive: {
    backgroundColor: "#fff",
    width: 14,
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heroSideColumn: {
    flex: 1,
    height: "100%",
    gap: 8,
  },
  sideThumbItem: {
    flex: 1,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  sideThumbImg: {
    width: "100%", height: "100%",
  },
  sideVideoBadge: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  playCircleIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  side360Badge: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  side360Text: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  sideMoreOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(17,25,40,0.65)",
    alignItems: "center", justifyContent: "center",
  },
  sideMoreText: {
    color: "#fff",
    fontWeight: "800",
  },
  actionButtonsBar: {
    flexDirection: "row",
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  actionPillText: {
    color: "#111928",
    fontWeight: "600",
  },
  propertyOverviewContainer: {
    gap: 12,
    marginTop: 8,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  propertyName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#111928",
    letterSpacing: -0.5,
  },
  propertyAddress: {
    marginTop: 4,
  },
  priceHeaderRhs: {
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: 28,
    color: Skoun.color.primaryDeep,
    fontWeight: "800",
  },
  distanceInfoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  distanceFromCenterText: {
    color: "#111928",
    fontWeight: "600",
  },
  distanceByModesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  modeDurationText: {
    fontWeight: "600",
    color: "#374151",
  },
  viewOnMapBtn: {
    marginLeft: 12,
    color: Skoun.color.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  distancePillsScroll: {
    marginVertical: 2,
  },
  distancePillCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    marginRight: 8,
  },
  uniIconCircle: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center", justifyContent: "center",
  },
  uniPillText: {
    fontSize: 12,
    color: "#011851",
  },
  policyPillsScroll: {
    marginTop: 2,
  },
  policyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    marginRight: 8,
  },
  policyPillHighlight: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: Skoun.color.primarySoft,
  },
  policyHighlightText: {
    color: Skoun.color.primaryDeep,
    fontWeight: "600",
  },
  policyPillText: {
    color: "#111928",
  },
  lebanonInfraSection: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Skoun.color.primarySoft,
    backgroundColor: Skoun.color.surface,
    gap: 14,
  },
  lebanonInfraHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lebanonInfraTitle: {
    color: Skoun.color.primaryDeep,
    fontWeight: "700",
  },
  lebanonInfraGrid: {
    gap: 10,
  },
  infraBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  roomTypesSection: {
    gap: 16,
  },
  roomTypesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeadingText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111928",
  },
  roomTabsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  roomTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  roomTabPillActive: {
    backgroundColor: "#111928",
    borderColor: "#111928",
  },
  roomTabText: {
    color: "#374151",
  },
  roomTabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  accordionCategoryItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
  },
  accordionHeaderPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  accordionIconBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center", justifyContent: "center",
  },
  accordionTitleText: {
    fontWeight: "700",
    color: "#1F2A37",
  },
  accordionSubTitleText: {
    fontSize: 12,
    marginTop: 2,
  },
  accordionContentContainer: {
    padding: 16,
    gap: 16,
  },
  roomCardBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    padding: 16,
    backgroundColor: Skoun.color.surface,
  },
  roomCardSelected: {
    borderColor: Skoun.color.primary,
    borderWidth: 2,
    backgroundColor: Skoun.color.primaryMist,
  },
  roomCardInnerRow: {
    flexDirection: "row",
    gap: 16,
  },
  roomCardImgWrap: {
    width: 130,
    height: 110,
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  roomCardThumbImg: {
    width: "100%", height: "100%",
  },
  photoCountPill: {
    position: "absolute",
    bottom: 6, right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoCountText: {
    color: "#fff",
    fontSize: 10,
  },
  roomCardInfoCol: {
    flex: 1,
    gap: 4,
  },
  roomCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roomCardTitle: {
    fontWeight: "700",
    color: "#1F2A37",
  },
  roomCardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  roomCardMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  availabilityText: {
    fontSize: 12,
  },
  priceContainerText: {
    fontSize: 12,
  },
  roomTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  amberTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: Skoun.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  amberTagText: {
    fontSize: 11,
    color: "#374151",
  },
  selectRoomBtn: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  selectRoomBtnActive: {
    backgroundColor: Skoun.color.primaryDeep,
    borderColor: Skoun.color.primaryDeep,
  },
  selectRoomBtnText: {
    fontWeight: "600",
    color: "#111928",
  },
  selectRoomBtnTextActive: {
    color: "#fff",
  },
  standardSpecsSection: {
    gap: 12,
  },
  specsGridThreeCol: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  specTile: {
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 10,
    backgroundColor: Skoun.color.surfaceMuted,
    gap: 4,
  },
  aboutPropertySection: {
    gap: 12,
  },
  sectionHeadingLineText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111928",
  },
  aboutContentBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  aboutParagraphText: {
    lineHeight: 22,
  },
  aboutSubHeading: {
    fontWeight: "700",
    marginTop: 8,
  },
  showMoreBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  showMoreBtnText: {
    color: Skoun.color.primary,
    fontWeight: "600",
  },
  amenitiesContainer: {
    gap: 12,
  },
  amenitiesCategoryGroup: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  amenityCategoryHeader: {
    fontWeight: "700",
  },
  amenityTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amenityTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  amenityTagText: {
    color: "#111928",
  },
  amenityDivider: {
    height: 1,
    backgroundColor: Skoun.color.border,
    marginVertical: 4,
  },
  policiesSectionContainer: {
    gap: 12,
  },
  policiesListContainer: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  policyRowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  policyItemTitle: {
    fontWeight: "700",
  },
  stickyTopCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 12,
  },
  stickyCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stickyBuildingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111928",
    flex: 1,
    lineHeight: 20,
  },
  topIconActions: {
    flexDirection: "row",
    gap: 8,
  },
  topCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  seeAvailabilityBtn: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  seeAvailabilityText: {
    color: "#ffffff",
    fontWeight: "500",
    fontSize: 14,
  },
  enquireNowBtn: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Skoun.color.primary,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  enquireNowText: {
    color: Skoun.color.primary,
    fontWeight: "500",
    fontSize: 14,
  },
  socialProofPill: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: Skoun.color.primaryMist,
  },
  socialProofText: {
    color: "#1F2A37",
    fontWeight: "400",
    fontSize: 12,
  },
  stickyTrustCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  trustAccordionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  trustIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  trustItemTitle: {
    color: "#1F2A37",
    fontWeight: "400",
    fontSize: 14,
    marginLeft: 12,
  },
  stickySpecsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 12,
  },
  stickySpecRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skounVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 24, right: 24,
    zIndex: 10,
    padding: 8,
  },
  lightboxContent: {
    width: "90%", height: "80%",
    alignItems: "center", justifyContent: "center",
  },
  lightboxImage: {
    width: "100%", height: "90%",
  },
  lightboxNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 16,
  },
  lightboxNavBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  inquiryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  inquiryCard: {
    width: "100%", maxWidth: 480,
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  inquiryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
