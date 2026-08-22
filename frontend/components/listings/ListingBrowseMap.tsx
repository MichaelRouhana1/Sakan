import { Ionicons } from "@expo/vector-icons";
import Mapbox, { type Camera, type MapState } from "@rnmapbox/maps";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingMapCarousel, mapCarouselOverlayHeight } from "@/components/listings/ListingMapCarousel";
import { SkounMapPin, SKOUN_CAMPUS_PIN } from "@/components/listings/SkounMapPin";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import { useWalkingRoute } from "@/features/listings/useWalkingRoute";
import {
  buildPinClusterIndex,
  clusterBubbleSize,
  padBBox,
  queryVisibleFeatures,
  regionForExpansion,
  regionForListingFocus,
  regionToBBox,
  zoomFromLongitudeDelta,
  type VisibleMapFeature,
} from "@/lib/mapClusters";
import { formatDistanceShort } from "@/lib/formatDistance";
import {
  groupListingsByProximity,
  type MapPinGroup,
} from "@/lib/mapPinGroups";
import { MAP_TOKEN_MISSING_COPY, getMapboxStyle, hasMapboxToken } from "@/lib/mapboxEnv";
import {
  animateRegion,
  fitCoords,
  mapStateToRegion,
  type MapRegion,
} from "@/lib/nativeMapCamera";
import { rentPriceTypeCompact } from "@/lib/rentPriceType";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CampusMeta, Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
  campuses: CampusMeta[];
  universityMode?: boolean;
  loading?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  fillContainer?: boolean;
  onCarouselOpenChange?: (open: boolean) => void;
  onOpenListing?: (listing: Listing) => void;
  hoveredListingId?: string | null;
  hoverFlyListingId?: string | null;
  onHoverFlyComplete?: () => void;
  active?: boolean;
};

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function resolveNearestCampus(
  listing: Listing | null | undefined,
  campuses: CampusMeta[],
): CampusMeta | null {
  if (!listing || campuses.length === 0) return null;
  if (listing.nearestCampusSlug) {
    const target = listing.nearestCampusSlug.toLowerCase();
    const hit = campuses.find((c) => c.slug.toLowerCase() === target);
    if (hit) return hit;
  }
  return campuses[0] ?? null;
}

type SheetState =
  | { kind: "none" }
  | { kind: "carousel"; listingId: string };

const MARKER_W = 88;
const MARKER_H = 78;
const PIN_HEAD_CENTER_Y = 48;
const CAMPUS_PIN_H = SKOUN_CAMPUS_PIN.height;
const CAMPUS_HEAD_CENTER_Y = SKOUN_CAMPUS_PIN.headCenterY;
const DIST_BADGE_W = 72;
const SELECTED_LINE = "#C23B2E";
const CLUSTER_FILL = "#C23B2E";
const EMPTY_ROUTE = {
  type: "FeatureCollection" as const,
  features: [] as [],
};

function shortPriceLabel(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function ClusterBubble({ count }: { count: number }) {
  const size = clusterBubbleSize(count);
  return (
    <View
      style={[
        styles.clusterBubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      accessibilityElementsHidden
    >
      <LText
        variant="caption"
        style={[styles.clusterText, size >= 46 && styles.clusterTextLg]}
        numberOfLines={1}
      >
        {count}
      </LText>
    </View>
  );
}

function hasCoords(
  listing: Listing,
): listing is Listing & { lng: number; lat: number } {
  return listing.lng != null && listing.lat != null;
}

function PriceMarker({
  amount,
  count,
  selected = false,
}: {
  amount: number;
  count: number;
  selected?: boolean;
}) {
  const label =
    count > 1
      ? `${shortPriceLabel(amount)} · ${count}`
      : shortPriceLabel(amount);

  return (
    <View style={styles.markerSlot} accessibilityElementsHidden>
      <View style={styles.markerInner}>
        <View style={styles.pricePill}>
          <LText variant="caption" style={styles.priceText} numberOfLines={1}>
            {label}
          </LText>
        </View>
        <SkounMapPin
          variant="listing"
          dropped={false}
          selected={false}
          accent={selected ? "danger" : "default"}
        />
      </View>
    </View>
  );
}

function midpoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { latitude: number; longitude: number } {
  return {
    latitude: (a.lat + b.lat) / 2,
    longitude: (a.lng + b.lng) / 2,
  };
}

function DistanceBadge({ label }: { label: string }) {
  return (
    <View style={styles.distanceBadge} accessibilityElementsHidden>
      <LText variant="caption" style={styles.distanceBadgeText} numberOfLines={1}>
        {label}
      </LText>
    </View>
  );
}

const MAP_HEIGHT_COLLAPSED = 320;

const PIN_SELECT_MIN_ZOOM = 16;
const PIN_SELECT_NEAR_ZOOM = 18;
const CAMPUS_ZOOM_BOOST_START_M = 400;
const CAMPUS_ZOOM_BOOST_FULL_M = 100;

function pinSelectZoomForCampusDistance(meters: number): number {
  if (meters >= CAMPUS_ZOOM_BOOST_START_M) return PIN_SELECT_MIN_ZOOM;
  if (meters <= CAMPUS_ZOOM_BOOST_FULL_M) return PIN_SELECT_NEAR_ZOOM;
  const t =
    (CAMPUS_ZOOM_BOOST_START_M - meters) /
    (CAMPUS_ZOOM_BOOST_START_M - CAMPUS_ZOOM_BOOST_FULL_M);
  return PIN_SELECT_MIN_ZOOM + t * (PIN_SELECT_NEAR_ZOOM - PIN_SELECT_MIN_ZOOM);
}

function expandedMapHeight(): number {
  const h = Dimensions.get("window").height;
  return Math.max(360, h - appleTabScrollInset - 148);
}

function CarouselWindowLayer({
  fillContainer,
  open,
  children,
}: {
  fillContainer: boolean;
  open: boolean;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <View
      style={[styles.sheetBelow, fillContainer && styles.sheetOverlay]}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}

export function ListingBrowseMap({
  listings,
  campuses,
  universityMode = false,
  loading,
  expanded = false,
  onExpandedChange,
  fillContainer = false,
  onCarouselOpenChange,
  onOpenListing,
}: Props) {
  const cameraRef = useRef<Camera | null>(null);
  const ignoreNextMapPress = useRef(false);
  const flyStepRef = useRef<"idle" | "out" | "pan" | "in">("idle");
  const flyPanRef = useRef<MapRegion | null>(null);
  const flyInRef = useRef<MapRegion | null>(null);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const heightAnim = useRef(new Animated.Value(MAP_HEIGHT_COLLAPSED)).current;
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [mapReady, setMapReady] = useState(false);
  const tokenMissing = !hasMapboxToken();

  useEffect(() => {
    const to = expanded ? expandedMapHeight() : MAP_HEIGHT_COLLAPSED;
    Animated.timing(heightAnim, {
      toValue: to,
      duration: reduceMotion ? 0 : 300,
      useNativeDriver: false,
    }).start();
  }, [expanded, reduceMotion, heightAnim]);

  const mappable = useMemo(
    () => listings.filter(hasCoords),
    [listings],
  );

  const groups = useMemo(
    () => groupListingsByProximity(mappable),
    [mappable],
  );

  const groupsById = useMemo(() => {
    const map = new Map<string, MapPinGroup>();
    for (const g of groups) map.set(g.id, g);
    return map;
  }, [groups]);

  const clusterIndex = useMemo(
    () => (groups.length > 0 ? buildPinClusterIndex(groups) : null),
    [groups],
  );

  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const mapWidthPx = Dimensions.get("window").width;

  const visibleFeatures = useMemo((): VisibleMapFeature[] => {
    if (!clusterIndex || !mapRegion) {
      return groups.map((g) => ({
        kind: "leaf" as const,
        groupId: g.id,
        lat: g.lat,
        lng: g.lng,
      }));
    }
    const bbox = padBBox(regionToBBox(mapRegion));
    const zoom = zoomFromLongitudeDelta(
      mapRegion.longitudeDelta,
      mapWidthPx,
    );
    return queryVisibleFeatures(clusterIndex, bbox, zoom);
  }, [clusterIndex, mapRegion, groups, mapWidthPx]);

  const visibleLeaves = useMemo(() => {
    const leaves: MapPinGroup[] = [];
    for (const f of visibleFeatures) {
      if (f.kind !== "leaf") continue;
      const group = groupsById.get(f.groupId);
      if (group) leaves.push(group);
    }
    return leaves;
  }, [visibleFeatures, groupsById]);

  const visibleClusters = useMemo(
    () =>
      visibleFeatures.filter(
        (f): f is Extract<VisibleMapFeature, { kind: "cluster" }> =>
          f.kind === "cluster",
      ),
    [visibleFeatures],
  );

  const carouselListings = useMemo(
    () =>
      [...mappable].sort((a, b) => {
        const rent = a.monthlyRentUsd - b.monthlyRentUsd;
        if (rent !== 0) return rent;
        return a.id.localeCompare(b.id);
      }),
    [mappable],
  );

  const selectedListing = useMemo(() => {
    if (sheet.kind !== "carousel") return null;
    return carouselListings.find((l) => l.id === sheet.listingId) ?? null;
  }, [sheet, carouselListings]);

  const selectedGroupId = useMemo(() => {
    if (sheet.kind !== "carousel") return null;
    for (const g of groups) {
      if (g.listings.some((l) => l.id === sheet.listingId)) return g.id;
    }
    return null;
  }, [sheet, groups]);

  const listingIdsKey = useMemo(
    () => mappable.map((l) => l.id).join(","),
    [mappable],
  );

  const campusesKey = useMemo(
    () => campuses.map((c) => c.slug).join(","),
    [campuses],
  );

  useEffect(() => {
    setSheet({ kind: "none" });
  }, [listingIdsKey, campusesKey, universityMode]);

  const sheetOpen = sheet.kind !== "none";

  useEffect(() => {
    onCarouselOpenChange?.(sheetOpen);
  }, [sheetOpen, onCarouselOpenChange]);

  const focusCampus = useMemo(
    () => resolveNearestCampus(selectedListing, campuses),
    [selectedListing, campuses],
  );

  const walkingRoute = useWalkingRoute({
    enabled: Boolean(universityMode && selectedListing && focusCampus),
    listingId: selectedListing?.id ?? null,
    campusSlug: focusCampus?.slug ?? null,
    from: focusCampus
      ? { lng: focusCampus.lng, lat: focusCampus.lat }
      : null,
    to:
      selectedListing?.lng != null && selectedListing.lat != null
        ? { lng: selectedListing.lng, lat: selectedListing.lat }
        : null,
  });

  const routeShape = useMemo(() => {
    if (
      !universityMode ||
      !focusCampus ||
      !selectedListing ||
      walkingRoute?.status !== "ok" ||
      walkingRoute.coords.length < 2
    ) {
      return EMPTY_ROUTE;
    }
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: walkingRoute.coords.map(
          (c) => [c.lng, c.lat] as [number, number],
        ),
      },
    };
  }, [universityMode, focusCampus, selectedListing, walkingRoute]);

  const routeVisible =
    walkingRoute?.status === "ok" && walkingRoute.coords.length >= 2;

  const midpointCoord = useMemo(() => {
    if (!universityMode || !focusCampus || !selectedListing) return null;
    if (walkingRoute && walkingRoute.coords.length >= 2) {
      const mid = walkingRoute.coords[Math.floor(walkingRoute.coords.length / 2)];
      return { latitude: mid.lat, longitude: mid.lng };
    }
    return midpoint(
      { lat: focusCampus.lat, lng: focusCampus.lng },
      { lat: selectedListing.lat, lng: selectedListing.lng },
    );
  }, [universityMode, focusCampus, selectedListing, walkingRoute]);

  const midpointLabel = useMemo(() => {
    if (!selectedListing) return null;
    let dist =
      walkingRoute?.status === "ok"
        ? walkingRoute.distanceM
        : selectedListing.distanceMeters;
    if (
      dist == null &&
      focusCampus &&
      selectedListing.lat != null &&
      selectedListing.lng != null
    ) {
      dist = calculateDistanceMeters(
        focusCampus.lat,
        focusCampus.lng,
        selectedListing.lat,
        selectedListing.lng,
      );
    }
    return formatDistanceShort(dist);
  }, [selectedListing, focusCampus, walkingRoute]);

  useEffect(() => {
    if (!mapReady || groups.length === 0) return;
    const coords = groups.map((g) => ({
      latitude: g.lat,
      longitude: g.lng,
    }));
    if (universityMode && campuses.length > 0) {
      for (const c of campuses) {
        coords.push({ latitude: c.lat, longitude: c.lng });
      }
    }
    if (coords.length === 0) return;

    const delay = expanded ? 320 : 80;
    const t = setTimeout(() => {
      fitCoords(
        cameraRef.current,
        coords,
        { top: 48, right: 36, bottom: 56, left: 36 },
        expanded ? 0 : 400,
      );
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-fit on sheet / array identity churn
  }, [mapReady, listingIdsKey, campusesKey, universityMode, expanded]);

  function markMarkerPress() {
    ignoreNextMapPress.current = true;
    setTimeout(() => {
      ignoreNextMapPress.current = false;
    }, 400);
  }

  function cancelFly() {
    flyStepRef.current = "idle";
    flyPanRef.current = null;
    flyInRef.current = null;
  }

  function focusListingOnMap(listing: Listing) {
    if (listing.lat == null || listing.lng == null) return;
    const win = Dimensions.get("window");
    const overlayH =
      mapCarouselOverlayHeight(win.width) + Math.max(insets.bottom, 12) + 20;
    let zoom = 16;
    if (universityMode) {
      const campus = resolveNearestCampus(listing, campuses);
      if (campus) {
        const distM =
          listing.distanceMeters ??
          calculateDistanceMeters(
            campus.lat,
            campus.lng,
            listing.lat,
            listing.lng,
          );
        zoom = pinSelectZoomForCampusDistance(distM);
      }
    }
    const target = regionForListingFocus(
      listing.lat,
      listing.lng,
      mapWidthPx,
      win.height,
      overlayH,
      zoom,
    );
    const current = mapRegion;
    const outLat = current
      ? Math.max(current.latitudeDelta, target.latitudeDelta) * 2.2
      : 0;
    const outLng = current
      ? Math.max(current.longitudeDelta, target.longitudeDelta) * 2.2
      : 0;
    if (reduceMotion || !current) {
      cancelFly();
      animateRegion(
        cameraRef.current,
        target,
        mapWidthPx,
        reduceMotion ? 0 : 420,
      );
      return;
    }
    const zoomedOut: MapRegion = {
      latitude: current.latitude,
      longitude: current.longitude,
      latitudeDelta: outLat,
      longitudeDelta: outLng,
    };
    flyPanRef.current = {
      latitude: target.latitude,
      longitude: target.longitude,
      latitudeDelta: outLat,
      longitudeDelta: outLng,
    };
    flyInRef.current = target;
    flyStepRef.current = "out";
    animateRegion(cameraRef.current, zoomedOut, mapWidthPx, 320);
  }

  function openCarousel(listingId: string, fly = true) {
    setSheet({ kind: "carousel", listingId });
    if (!fly) return;
    const listing = mappable.find((l) => l.id === listingId);
    if (listing) focusListingOnMap(listing);
  }

  function onGroupPress(group: MapPinGroup) {
    markMarkerPress();
    const listing = group.listings[0];
    if (!listing) return;
    openCarousel(listing.id, universityMode);
  }

  function onClusterPress(
    feature: Extract<VisibleMapFeature, { kind: "cluster" }>,
  ) {
    markMarkerPress();
    const aspect =
      mapRegion && mapRegion.longitudeDelta > 0
        ? mapRegion.latitudeDelta / mapRegion.longitudeDelta
        : 1;
    const next = regionForExpansion(
      feature.lat,
      feature.lng,
      feature.expansionZoom,
      mapWidthPx,
      aspect,
    );
    animateRegion(
      cameraRef.current,
      next,
      mapWidthPx,
      reduceMotion ? 0 : 400,
    );
  }

  function onMapIdle(state: MapState) {
    const region = mapStateToRegion(state);
    if (region) setMapRegion(region);
    const step = flyStepRef.current;
    if (step === "out" && flyPanRef.current) {
      flyStepRef.current = "pan";
      animateRegion(cameraRef.current, flyPanRef.current, mapWidthPx, 450);
      return;
    }
    if (step === "pan" && flyInRef.current) {
      flyStepRef.current = "in";
      animateRegion(cameraRef.current, flyInRef.current, mapWidthPx, 380);
      return;
    }
    if (step === "in") {
      flyStepRef.current = "idle";
    }
  }

  function dismissCarousel() {
    cancelFly();
    setSheet({ kind: "none" });
  }

  function onMapPress() {
    if (ignoreNextMapPress.current) {
      ignoreNextMapPress.current = false;
      return;
    }
    dismissCarousel();
  }

  function openListingDetail(listing: Listing) {
    if (onOpenListing) {
      onOpenListing(listing);
      return;
    }
    router.push({
      pathname: "/(renter)/listing/[id]",
      params: { id: listing.id },
    });
  }

  const canToggleExpand = Boolean(onExpandedChange);
  const firstCenter = groups[0] ?? campuses[0];

  return (
    <View
      style={[
        styles.root,
        fillContainer ? styles.rootFill : expanded && styles.rootExpanded,
      ]}
    >
      <Animated.View
        style={[
          styles.mapShell,
          fillContainer ? styles.mapShellFill : { height: heightAnim },
        ]}
        collapsable={false}
      >
        {(!mapReady || loading) && !tokenMissing ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={Skoun.color.primary} />
            <LText variant="caption" tone="muted">
              {loading ? "Updating map…" : "Loading map…"}
            </LText>
          </View>
        ) : null}
        {tokenMissing ? (
          <View style={styles.emptyOverlay}>
            <LText variant="subtitle">Map unavailable</LText>
            <LText variant="body" tone="muted" style={styles.emptyBody}>
              {MAP_TOKEN_MISSING_COPY}
            </LText>
          </View>
        ) : null}
        {groups.length === 0 && mapReady && !loading ? (
          <View style={styles.emptyOverlay}>
            <LText variant="subtitle">No pins on the map</LText>
            <LText variant="body" tone="muted" style={styles.emptyBody}>
              {listings.length > 0
                ? "These listings don’t have a location pin yet. Switch to List to browse them."
                : "Nothing matches these filters. Try another city or campus."}
            </LText>
          </View>
        ) : null}
        {!tokenMissing ? (
          <Mapbox.MapView
            style={styles.map}
            styleURL={getMapboxStyle()}
            compassEnabled
            scaleBarEnabled={false}
            pitchEnabled
            rotateEnabled
            onDidFinishLoadingMap={() => setMapReady(true)}
            onMapLoadingError={() => {
              console.warn("[skoun] Mapbox failed to load");
            }}
            onPress={onMapPress}
            onMapIdle={onMapIdle}
            onCameraChanged={(state) => {
              if (state.gestures.isGestureActive) cancelFly();
            }}
          >
            <Mapbox.Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: firstCenter
                  ? [firstCenter.lng, firstCenter.lat]
                  : [35.5018, 33.8938],
                zoomLevel: 11,
                pitch: 0,
              }}
            />
            <Mapbox.ShapeSource id="skoun-campus-route" shape={routeShape}>
              <Mapbox.LineLayer
                id="skoun-campus-route-line"
                slot="top"
                style={{
                  lineColor: "#FF3B30",
                  lineWidth: 6,
                  lineOpacity: routeVisible ? 1 : 0,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </Mapbox.ShapeSource>

            {universityMode
              ? campuses.map((campus) => (
                  <Mapbox.MarkerView
                    key={`campus-${campus.slug}`}
                    coordinate={[campus.lng, campus.lat]}
                    anchor={{
                      x: 0.5,
                      y: CAMPUS_HEAD_CENTER_Y / CAMPUS_PIN_H,
                    }}
                    allowOverlap
                  >
                    <View accessibilityLabel={`${campus.name} campus`}>
                      <SkounMapPin variant="campus" dropped />
                    </View>
                  </Mapbox.MarkerView>
                ))
              : null}

            {visibleClusters.map((cluster) => (
              <Mapbox.MarkerView
                key={`cluster-${cluster.clusterId}`}
                coordinate={[cluster.lng, cluster.lat]}
                anchor={{ x: 0.5, y: 0.5 }}
                allowOverlap
              >
                <Pressable
                  onPressIn={() => markMarkerPress()}
                  onPress={() => onClusterPress(cluster)}
                  accessibilityLabel={`${cluster.pointCount} places — tap to zoom`}
                >
                  <ClusterBubble count={cluster.pointCount} />
                </Pressable>
              </Mapbox.MarkerView>
            ))}

            {visibleLeaves.map((group) => {
              const selected = selectedGroupId === group.id;
              const a11y =
                group.count > 1
                  ? `${group.count} listings from ${shortPriceLabel(group.displayPriceUsd)}`
                  : `${group.listings[0]?.area ?? "Listing"}, ${shortPriceLabel(group.displayPriceUsd)}`;
              return (
                <Mapbox.MarkerView
                  key={group.id}
                  coordinate={[group.lng, group.lat]}
                  anchor={{ x: 0.5, y: PIN_HEAD_CENTER_Y / MARKER_H }}
                  allowOverlap
                  isSelected={selected}
                >
                  <Pressable
                    onPressIn={() => markMarkerPress()}
                    onPress={() => onGroupPress(group)}
                    accessibilityLabel={a11y}
                  >
                    <PriceMarker
                      amount={group.displayPriceUsd}
                      count={group.count}
                      selected={selected}
                    />
                  </Pressable>
                </Mapbox.MarkerView>
              );
            })}

            {universityMode && midpointLabel && midpointCoord ? (
              <Mapbox.MarkerView
                coordinate={[midpointCoord.longitude, midpointCoord.latitude]}
                anchor={{ x: 0.5, y: 0.5 }}
                allowOverlap
                pointerEvents="none"
              >
                <DistanceBadge label={midpointLabel} />
              </Mapbox.MarkerView>
            ) : null}
          </Mapbox.MapView>
        ) : null}

        {canToggleExpand ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Collapse map" : "Expand map"}
            onPress={() => onExpandedChange?.(!expanded)}
            style={styles.expandBtn}
            hitSlop={8}
          >
            <Ionicons
              name={expanded ? "contract-outline" : "expand-outline"}
              size={20}
              color={Skoun.color.primary}
            />
          </Pressable>
        ) : null}
      </Animated.View>

      {!sheetOpen ? (
        <View
          style={fillContainer ? styles.hintOverlay : styles.hintBar}
          accessibilityRole="text"
          pointerEvents="none"
        >
          <LText variant="caption" tone="muted">
            Tap a pin or cluster for details
          </LText>
        </View>
      ) : null}

      <CarouselWindowLayer
        fillContainer={fillContainer}
        open={sheet.kind === "carousel" && !!selectedListing}
      >
        {sheet.kind === "carousel" && selectedListing ? (
          <ListingMapCarousel
            listings={carouselListings}
            selectedId={selectedListing.id}
            onIndexChange={(listingId) => openCarousel(listingId, true)}
            onDismiss={dismissCarousel}
            onPressCard={openListingDetail}
            bottomInset={Math.max(insets.bottom, 12) + 20}
          />
        ) : null}
      </CarouselWindowLayer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
    marginBottom: 8,
  },
  rootExpanded: {
    flex: 1,
    marginBottom: 0,
  },
  rootFill: {
    flex: 1,
    marginBottom: 0,
    gap: 0,
    position: "relative",
  },
  mapShell: {
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.bgWash,
    position: "relative",
  },
  mapShellFill: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    position: "relative",
    overflow: "hidden",
  },
  map: { ...StyleSheet.absoluteFillObject },
  expandBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    shadowColor: "#121826",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  markerSlot: {
    width: MARKER_W,
    height: MARKER_H,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  markerInner: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: MARKER_W,
  },
  pricePill: {
    minHeight: 22,
    maxWidth: MARKER_W - 4,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Skoun.radius.sm,
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  priceText: {
    ...rentPriceTypeCompact,
    color: Skoun.color.ink,
  },
  clusterBubble: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLUSTER_FILL,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#121826",
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  clusterText: {
    color: "#FFFFFF",
    fontFamily: Skoun.type.bodyBold,
    fontSize: 13,
  },
  clusterTextLg: {
    fontSize: 15,
  },
  sheetBelow: {
    gap: 6,
  },
  hintBar: {
    alignItems: "center",
    paddingVertical: 4,
  },
  hintOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 88,
    alignItems: "center",
    zIndex: 400,
  },
  sheetOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 450,
  },
  distanceBadge: {
    minHeight: 22,
    maxWidth: DIST_BADGE_W,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1.5,
    borderColor: SELECTED_LINE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121826",
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  distanceBadgeText: {
    color: "#8E241A",
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Skoun.color.primaryMist,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  emptyBody: { textAlign: "center" },
});
