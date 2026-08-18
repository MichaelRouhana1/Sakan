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
import { ListingDetailAmenities } from "@/components/listings/detail/ListingDetailAmenities";
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
import { ReportListingSheet } from "@/components/listings/ReportListingSheet";
import { Skoun } from "@/constants/theme";
import { useListing } from "@/features/listings/useListing";
import { useNearbyListings } from "@/features/listings/useNearbyListings";
import { useRecordListingView } from "@/features/listings/useRecordListingView";
import { useIsReported } from "@/features/reports/useReportListing";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import { safeBack } from "@/lib/safeBack";

/** When listing APIs expose poster phone, pass it here. */
function listingWhatsApp(listing: {
  whatsappNumber?: string | null;
  contactPhone?: string | null;
}): string | null {
  return listing.whatsappNumber || listing.contactPhone || null;
}

type Props = {
  listingId?: string;
  onClose?: () => void;
};

export function ListingDetailMobile({ listingId, onClose }: Props) {
  const { height: winH } = useWindowDimensions();
  const galleryH = Math.round(Math.min(Math.max(winH * 0.44, 280), 420));
  const { data: listing, isLoading, isError } = useListing(listingId ?? "");
  const saved = useIsSaved(listingId ?? "");
  const toggleSaved = useToggleSaved();
  const reported = useIsReported(listingId ?? "");
  const coincident = useNearbyListings(listingId ?? "", {
    enabled: Boolean(listing && listing.lng != null && listing.lat != null),
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
      (listing?.houseRules && listing.houseRules.length > 0),
  );
  const hasPin = listing?.lat != null && listing?.lng != null;
  const nearby = coincident.data ?? [];

  const tabs: DetailSectionTab[] = useMemo(() => {
    if (!listing) return [];
    const next: DetailSectionTab[] = [];
    if (description) next.push({ id: "description", label: "Description" });
    next.push({ id: "amenities", label: "Amenities" });
    if (hasRooms) next.push({ id: "rooms", label: "Room types" });
    if (hasRules) next.push({ id: "rules", label: "House rules" });
    if (hasPin) next.push({ id: "map", label: "Map" });
    if (nearby.length > 0) next.push({ id: "nearby", label: "Nearby" });
    return next;
  }, [listing, description, hasRooms, hasRules, hasPin, nearby.length]);

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

          {description ? (
            <View
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("description")}
            >
              <ListingDetailAbout description={description} />
            </View>
          ) : null}

          <View
            collapsable={false}
            style={styles.sectionPad}
            onLayout={onSectionLayout("amenities")}
          >
            <ListingDetailAmenities listing={listing} />
          </View>

          {hasRooms ? (
            <View
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("rooms")}
            >
              <ListingDetailRooms listing={listing} posterPhone={posterPhone} />
            </View>
          ) : !isPbsa ? (
            <View style={styles.sectionPad}>
              <ListingDetailUnitSpecs listing={listing} />
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

          {hasPin ? (
            <View
              collapsable={false}
              style={styles.sectionPad}
              onLayout={onSectionLayout("map")}
            >
              <ListingDetailMapSection listing={listing} />
            </View>
          ) : null}

          {nearby.length > 0 ? (
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
          listing={listing}
          posterPhone={posterPhone}
          reported={Boolean(reported.data)}
          onReport={() => setReportOpen(true)}
        />

        <ReportListingSheet
          listingId={listing.id}
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      </View>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Skoun.color.bg },
  content: {
    paddingBottom: 24,
    backgroundColor: Skoun.color.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Skoun.space.lg,
  },
  sectionPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  nearbyPad: {
    paddingTop: 16,
    paddingBottom: 8,
  },
});
