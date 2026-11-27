import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { SharedPhotoGallery } from "./SharedPhotoGallery";
import { PlaceListingIntro } from "./PlaceDetailSections";
import { detailLabels } from "@/lib/listingDetailOwnership";
import { placeExtras } from "@/lib/listingDetailDisplay";
import { mobileHeroHeight } from "@/lib/listingPhotoFrames";
import { WhatsAppInquirySheet } from "@/components/listings/detail/WhatsAppInquirySheet";
import { useWhatsAppInquiry } from "@/features/listings/useWhatsAppInquiry";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { ListingDetailAbout } from "@/components/listings/detail/ListingDetailAbout";
import {
  ListingDetailAmenities,
  listingAmenityLabels,
} from "@/components/listings/detail/ListingDetailAmenities";
import { ListingDetailBottomBar } from "@/components/listings/detail/ListingDetailBottomBar";
import {
  ListingDetailGallery,
  type GalleryMode,
} from "@/components/listings/detail/ListingDetailGallery";
import { ListingDetailHouseRules } from "@/components/listings/detail/ListingDetailHouseRules";
import { ListingDetailMapSection } from "@/components/listings/detail/ListingDetailMapSection";
import {
  ListingDetailMobileHeader,
  MOBILE_DETAIL_HEADER_ROW_HEIGHT,
} from "@/components/listings/detail/ListingDetailMobileHeader";
import { ListingDetailDiscoverySection } from "@/components/listings/detail/ListingDetailDiscoverySection";
import { useListingDetailDiscovery } from "@/components/listings/detail/useListingDetailDiscovery";
import { ListingDetailNearbyRail } from "@/components/listings/detail/ListingDetailNearbyRail";
import { ListingDetailOverview } from "@/components/listings/detail/ListingDetailOverview";
import { ListingDetailRooms } from "@/components/listings/detail/ListingDetailRooms";
import {
  ListingDetailSectionTabs,
  type DetailSectionId,
  type DetailSectionTab,
} from "@/components/listings/detail/ListingDetailSectionTabs";
import { ListingDetailUnitSpecs } from "@/components/listings/detail/ListingDetailUnitSpecs";
import { OtherPlaceUnits } from "@/components/listings/detail/OtherPlaceUnits";
import { ReportListingSheet } from "@/components/listings/ReportListingSheet";
import { Studently } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useListing } from "@/features/listings/useListing";
import { useNearbyListings } from "@/features/listings/useNearbyListings";
import { useRecordListingView } from "@/features/listings/useRecordListingView";
import { useRecordRecentlyViewed } from "@/features/listings/useRecentlyViewedListings";
import { useIsReported } from "@/features/reports/useReportListing";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import { safeBack } from "@/lib/safeBack";
import { scrollToListingSection } from "@/lib/scrollToListingSection";

/** When listing APIs expose poster phone, pass it here. */
function listingWhatsApp(listing: {
  whatsappNumber?: string | null;
}): string | null {
  return listing.whatsappNumber || null;
}

type Props = {
  listingId?: string;
  onClose?: () => void;
};

export function ListingDetailMobile({ listingId, onClose }: Props) {
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const galleryH = mobileHeroHeight(winH);
  const headerHeight = insets.top + MOBILE_DETAIL_HEADER_ROW_HEIGHT;
  const { session } = useAuthSession();
  const { data: listing, isLoading, isError } = useListing(listingId ?? "");
  const inquiry = useWhatsAppInquiry(listing);
  const saved = useIsSaved(listingId ?? "");
  const toggleSaved = useToggleSaved();
  const reported = useIsReported(listingId ?? "");
  const coincident = useNearbyListings(listingId ?? "", {
    enabled: Boolean(listing?.placeId),
  });
  const discovery = useListingDetailDiscovery(listingId ?? "");
  const [reportOpen, setReportOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState<GalleryMode>("photos");
  const [activeTab, setActiveTab] = useState<DetailSectionId | null>(null);
  const [tabH, setTabH] = useState(46);
  const [tabsY, setTabsY] = useState(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [tabsPinned, setTabsPinned] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<DetailSectionId, number>>>({});
  const headerSolidRef = useRef(false);
  const tabsPinnedRef = useRef(false);
  const activeTabRef = useRef<DetailSectionId | null>(null);
  const manualScrollUntilRef = useRef(0);

  const goBack = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    safeBack("/(renter)" as never);
  }, [onClose]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  useEffect(() => {
    scrollY.setValue(0);
    headerSolidRef.current = false;
    tabsPinnedRef.current = false;
    setHeaderSolid(false);
    setTabsPinned(false);
    setTabsY(0);
    offsets.current = {};
  }, [listingId, scrollY]);

  useRecordListingView(listingId ?? "", Boolean(listingId) && !isError);
  useRecordRecentlyViewed(listingId ?? "", Boolean(listing) && !isError);

  const isPbsa =
    listing?.isPbsa || listing?.listingType === "pbsa_building";
  const hasRooms = Boolean(listing?.pbsaRoomTypes?.length);
  const description = listing?.description?.trim() ?? "";
  const hasRules = Boolean(
    listing?.cancellationPolicy?.trim() ||
      listing?.houseRules?.some((rule) => rule.trim()),
  );
  const hasAmenities = listing ? listingAmenityLabels(listing).length > 0 : false;
  const hasPin = listing?.lat != null && listing?.lng != null;
  const nearby = coincident.data ?? [];
  const multiUnit = listing?.placeContext?.isMultiUnit === true;
  const hasPlace = listing ? placeExtras(listing).visible : false;

  const tabs: DetailSectionTab[] = useMemo(() => {
    if (!listing) return [];
    const next: DetailSectionTab[] = [];
    if (hasRooms) next.push({ id: "rooms", label: "Room types" });
    else if (!isPbsa) next.push({ id: "unit", label: "The unit" });
    if (description) next.push({ id: "description", label: "Description" });
    if (hasPlace) next.push({ id: "place", label: detailLabels(listing).placeTitle });
    if (hasAmenities) next.push({ id: "amenities", label: "Amenities" });
    if (hasRules) next.push({ id: "rules", label: "House rules" });
    if (multiUnit) next.push({ id: "nearby", label: "Other units" });
    if (hasPin) next.push({ id: "map", label: "Map" });
    if (!multiUnit && nearby.length > 0) next.push({ id: "nearby", label: "Other units" });
    if (discovery.visible) {
      next.push({
        id: "similar",
        label: discovery.hasSimilar ? "Similar" : "Recent",
      });
    }
    return next;
  }, [listing, multiUnit, hasPlace, description, hasAmenities, hasRooms, isPbsa, hasRules, hasPin, nearby.length, discovery.visible, discovery.hasSimilar]);

  useEffect(() => {
    if (tabs.length === 0) {
      activeTabRef.current = null;
      setActiveTab(null);
      return;
    }
    setActiveTab((cur) => {
      const next = cur && tabs.some((t) => t.id === cur) ? cur : tabs[0].id;
      activeTabRef.current = next;
      return next;
    });
  }, [tabs]);

  const scrollMetaRef = useRef({
    galleryH,
    headerHeight,
    tabsY,
    tabH,
    tabs,
  });
  scrollMetaRef.current = { galleryH, headerHeight, tabsY, tabH, tabs };

  const handleScrollPosition = useCallback((y: number) => {
    const meta = scrollMetaRef.current;
    const solidThreshold = Math.max(24, meta.galleryH - meta.headerHeight - 20);
    const nextSolid = y >= solidThreshold;
    if (nextSolid !== headerSolidRef.current) {
      headerSolidRef.current = nextSolid;
      setHeaderSolid(nextSolid);
    }

    const nextPinned =
      meta.tabs.length > 0 &&
      meta.tabsY > 0 &&
      y >= meta.tabsY - meta.headerHeight;
    if (nextPinned !== tabsPinnedRef.current) {
      tabsPinnedRef.current = nextPinned;
      setTabsPinned(nextPinned);
    }

    if (Date.now() < manualScrollUntilRef.current || meta.tabs.length === 0) {
      return;
    }

    const probeY = y + meta.headerHeight + meta.tabH + 24;
    let matched: DetailSectionId | null = meta.tabs[0].id;
    for (const tab of meta.tabs) {
      const sectionY = offsets.current[tab.id];
      if (sectionY != null && sectionY <= probeY) {
        matched = tab.id;
      }
    }
    if (matched && matched !== activeTabRef.current) {
      activeTabRef.current = matched;
      setActiveTab(matched);
    }
  }, []);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
          useNativeDriver: Platform.OS !== "web",
          listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            handleScrollPosition(event.nativeEvent.contentOffset.y);
          },
        },
      ),
    [scrollY, handleScrollPosition],
  );

  const shareListing = useCallback(async () => {
    if (!listing) return;
    const title = listing.title?.trim() || listing.pbsaBuildingName?.trim() || listing.area;
    const url =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}/listing/${listing.id}`
        : undefined;
    const message = url ? `${title} — ${url}` : title;
    try {
      await Share.share(
        Platform.OS === "ios" && url
          ? { title, url, message: title }
          : { title, message },
      );
    } catch {
      if (Platform.OS === "web" && url) {
        try {
          await Clipboard.setStringAsync(url);
        } catch {
          // Ignore clipboard errors.
        }
      }
    }
  }, [listing]);

  const jumpTo = (id: DetailSectionId) => {
    activeTabRef.current = id;
    setActiveTab(id);
    manualScrollUntilRef.current = Date.now() + 550;
    if (Platform.OS === "web" && multiUnit && (id === "nearby" || id === "place")) {
      scrollToListingSection(id === "nearby" ? "listing-other-units" : "listing-place");
      return;
    }
    const y = offsets.current[id];
    if (y == null) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - headerHeight - tabH),
      animated: true,
    });
  };

  const onSectionLayout = (id: DetailSectionId) => (e: LayoutChangeEvent) => {
    offsets.current[id] = e.nativeEvent.layout.y;
  };

  if (isLoading) {
    return (
      <ListerScreen>
        <View style={styles.center}>
          <ActivityIndicator color={Studently.color.primary} />
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
            onPress={goBack}
            style={{ marginTop: 16 }}
          />
        </View>
      </ListerScreen>
    );
  }

  const posterPhone = listingWhatsApp(listing);
  const canReport = session?.role !== "poster";

  return (
    <ListerScreen edges={["left", "right"]}>
      <View style={styles.flex}>
        <Animated.ScrollView
          ref={scrollRef}
          testID="listing-detail-scroll"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={styles.content}
        >
          <View>
            <ListingDetailGallery
              key={listing.id}
              listing={listing}
              height={galleryH}
              saved={Boolean(saved.data)}
              savePending={toggleSaved.isPending}
              onBack={goBack}
              onToggleSave={() => toggleSaved.mutate(listing)}
              mode={galleryMode}
              onModeChange={setGalleryMode}
              hideTopBar
            />
            <ListingDetailOverview
              listing={listing}
              onViewMap={
                hasPin
                  ? () => {
                      setGalleryMode("map");
                      jumpTo("map");
                    }
                  : undefined
              }
            />
          </View>

          {tabs.length > 0 ? (
            <View
              onLayout={(e) => {
                setTabsY(e.nativeEvent.layout.y);
                setTabH(e.nativeEvent.layout.height);
              }}
              style={tabsPinned ? styles.tabsPlaceholder : undefined}
              pointerEvents={tabsPinned ? "none" : "auto"}
            >
              <ListingDetailSectionTabs
                tabs={tabs}
                activeId={activeTab}
                onJump={jumpTo}
              />
            </View>
          ) : null}

          {!multiUnit ? (
            <View style={styles.sectionPad}>
              <SharedPhotoGallery listing={listing} />
            </View>
          ) : null}
          {hasRooms ? (
            <View
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("rooms")}
            >
              <ListingDetailRooms
                listing={listing}
                posterPhone={posterPhone}
                onWhatsApp={inquiry.open}
              />
            </View>
          ) : !isPbsa ? (
            <View
              testID="listing-unit"
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("unit")}
            >
              <ListingDetailUnitSpecs listing={listing} />
            </View>
          ) : null}

          {description ? (
            <View
              testID="listing-about"
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("description")}
            >
              <ListingDetailAbout description={description} />
            </View>
          ) : null}

          {hasPlace ? (
            <PlaceListingIntro
              key={listing.id}
              listing={listing}
              onSectionLayout={onSectionLayout}
              style={styles.intro}
            />
          ) : null}

          {hasAmenities ? (
            <View
              testID="listing-amenities"
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("amenities")}
            >
              <ListingDetailAmenities listing={listing} />
            </View>
          ) : null}

          {hasRules ? (
            <View
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("rules")}
            >
              <ListingDetailHouseRules
                houseRules={listing.houseRules}
                cancellationPolicy={listing.cancellationPolicy}
              />
            </View>
          ) : null}

          {multiUnit ? (
            <View
              nativeID="listing-other-units"
              collapsable={false}
              style={[
                styles.otherUnits,
                Platform.OS === "web"
                  ? ({ scrollMarginTop: headerHeight + tabH + 8 } as object)
                  : null,
              ]}
              onLayout={onSectionLayout("nearby")}
            >
              <OtherPlaceUnits
                key={listing.id}
                listing={listing}
                siblings={nearby}
                loading={coincident.isLoading}
                error={coincident.isError}
                onRetry={() => {
                  void coincident.refetch();
                }}
              />
            </View>
          ) : null}

          {hasPin ? (
            <View
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("map")}
            >
              <ListingDetailMapSection listing={listing} />
            </View>
          ) : null}

          {!multiUnit && nearby.length > 0 ? (
            <View
              collapsable={false}
              style={styles.nearbyPad}
              onLayout={onSectionLayout("nearby")}
            >
              <ListingDetailNearbyRail listings={nearby} />
            </View>
          ) : null}

          {discovery.visible ? (
            <View
              nativeID="listing-similar"
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("similar")}
            >
              <ListingDetailDiscoverySection
                listingId={listing.id}
                variant="card"
              />
            </View>
          ) : null}

          {canReport ? (
            <View style={styles.reportWrap}>
              {reported.data ? (
                <View
                  testID="listing-detail-reported"
                  style={styles.reportRow}
                >
                  <Ionicons
                    name="flag"
                    size={15}
                    color={Studently.color.inkMuted}
                  />
                  <LText variant="caption" tone="muted">
                    You reported this listing
                  </LText>
                </View>
              ) : (
                <Pressable
                  testID="listing-detail-report"
                  accessibilityRole="button"
                  accessibilityLabel="Report this listing"
                  accessibilityHint="Opens reasons to flag this listing"
                  onPress={() => setReportOpen(true)}
                  style={({ pressed }) => [
                    styles.reportRow,
                    pressed && styles.reportRowPressed,
                  ]}
                >
                  <Ionicons
                    name="flag-outline"
                    size={15}
                    color={Studently.color.inkMuted}
                  />
                  <LText variant="caption" style={styles.reportLabel}>
                    Report this listing
                  </LText>
                </Pressable>
              )}
            </View>
          ) : null}
        </Animated.ScrollView>

        <ListingDetailMobileHeader
          scrollY={scrollY}
          galleryHeight={galleryH}
          saved={Boolean(saved.data)}
          savePending={toggleSaved.isPending}
          isSolid={headerSolid}
          tabsPinned={tabsPinned}
          onBack={goBack}
          onShare={() => void shareListing()}
          onToggleSave={() => toggleSaved.mutate(listing)}
        >
          {tabs.length > 0 && tabsPinned ? (
            <ListingDetailSectionTabs
              tabs={tabs}
              activeId={activeTab}
              onJump={jumpTo}
            />
          ) : null}
        </ListingDetailMobileHeader>

        <ListingDetailBottomBar
          onWhatsApp={inquiry.open}
          listing={listing}
          posterPhone={posterPhone}
        />

        <WhatsAppInquirySheet inquiry={inquiry} />

        <ReportListingSheet
          listingId={listing.id}
          listingTitle={
            listing.title?.trim() ||
            listing.pbsaBuildingName?.trim() ||
            listing.area
          }
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      </View>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Studently.color.bg },
  content: {
    paddingBottom: 24,
    backgroundColor: Studently.color.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Studently.space.lg,
  },
  tabsPlaceholder: {
    opacity: 0,
  },
  intro: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  sectionPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  otherUnits: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  nearbyPad: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  reportWrap: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    alignItems: "center",
  },
  reportRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  reportRowPressed: {
    opacity: 0.65,
  },
  reportLabel: {
    fontSize: 13,
    fontFamily: Studently.type.bodyMedium,
    color: Studently.color.inkMuted,
    textDecorationLine: "underline",
  },
});
