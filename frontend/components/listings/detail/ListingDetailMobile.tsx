import { SharedPhotoGallery } from './SharedPhotoGallery';
import { PlaceListingIntro } from './PlaceDetailSections';
import { detailLabels } from '@/lib/listingDetailOwnership';
import { placeExtras } from '@/lib/listingDetailDisplay';
import { mobileHeroHeight } from "@/lib/listingPhotoFrames";
import { WhatsAppInquirySheet } from "@/components/listings/detail/WhatsAppInquirySheet";
import { useWhatsAppInquiry } from "@/features/listings/useWhatsAppInquiry";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
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
  const galleryH = mobileHeroHeight(winH);
  const { session } = useAuthSession();
  const { data: listing, isLoading, isError } = useListing(listingId ?? "");
  const inquiry = useWhatsAppInquiry(listing);
  const saved = useIsSaved(listingId ?? "");
  const toggleSaved = useToggleSaved();
  const reported = useIsReported(listingId ?? "");
  const coincident = useNearbyListings(listingId ?? "", {
    enabled: Boolean(listing?.placeId),
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState<GalleryMode>("photos");
  const [activeTab, setActiveTab] = useState<DetailSectionId | null>(null);
  const [tabH, setTabH] = useState(48);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<DetailSectionId, number>>>({});

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

  useRecordListingView(listingId ?? "", Boolean(listingId) && !isError);

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
    if (hasPlace) next.push({ id: 'place', label: detailLabels(listing).placeTitle });
    if (hasAmenities) next.push({ id: "amenities", label: "Amenities" });
    if (hasRules) next.push({ id: "rules", label: "House rules" });
    if (multiUnit) next.push({ id: 'nearby', label: 'Other units' });
    if (hasPin) next.push({ id: "map", label: "Map" });
    if (!multiUnit && nearby.length > 0) next.push({ id: "nearby", label: "Other units" });
    return next;
  }, [listing, multiUnit, hasPlace, description, hasAmenities, hasRooms, isPbsa, hasRules, hasPin, nearby.length]);

  useEffect(() => {
    if (tabs.length === 0) {
      setActiveTab(null);
      return;
    }
    setActiveTab((cur) =>
      cur && tabs.some((t) => t.id === cur) ? cur : tabs[0].id,
    );
  }, [tabs]);

  const jumpTo = (id: DetailSectionId) => {
    setActiveTab(id);
    if (Platform.OS === "web" && multiUnit && (id === "nearby" || id === "place")) {
      scrollToListingSection(id === "nearby" ? "listing-other-units" : "listing-place");
      return;
    }
    const y = offsets.current[id];
    if (y == null) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - tabH),
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

  return (
    <ListerScreen edges={["left", "right"]}>
      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={tabs.length > 0 ? [1] : undefined}
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
            <View onLayout={(e) => setTabH(e.nativeEvent.layout.height)}>
              <ListingDetailSectionTabs
                tabs={tabs}
                activeId={activeTab}
                onJump={jumpTo}
              />
            </View>
          ) : null}

          {!multiUnit ? <View style={styles.sectionPad}><SharedPhotoGallery listing={listing}/></View> : null}
          {hasRooms ? (
            <View
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("rooms")}
            >
              <ListingDetailRooms listing={listing} posterPhone={posterPhone} onWhatsApp={inquiry.open} />
            </View>
          ) : !isPbsa ? (
            <View testID="listing-unit" collapsable={false} style={styles.sectionPad} onLayout={onSectionLayout("unit")}>
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
              style={styles.otherUnits}
              onLayout={onSectionLayout("nearby")}
            >
              <OtherPlaceUnits
                key={listing.id}
                listing={listing}
                siblings={nearby}
                loading={coincident.isLoading}
                error={coincident.isError}
                onRetry={() => { void coincident.refetch(); }}
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
        </ScrollView>

        <ListingDetailBottomBar
          onWhatsApp={inquiry.open}
          listing={listing}
          posterPhone={posterPhone}
          reported={Boolean(reported.data)}
          onReport={() => setReportOpen(true)}
          canReport={session?.role !== "poster"}
        />

        <WhatsAppInquirySheet inquiry={inquiry} />

        <ReportListingSheet
          listingId={listing.id}
          listingTitle={
            listing.title?.trim() || listing.pbsaBuildingName?.trim() || listing.area
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
    ...(Platform.OS === "web" ? ({ scrollMarginTop: 90 } as object) : null),
  },
  nearbyPad: {
    paddingTop: 16,
    paddingBottom: 8,
  },
});
