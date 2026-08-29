import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import { captureRef } from "react-native-view-shot";
import { LText } from "@/components/lister/Typography";
import {
  ListingMapCarousel,
  mapCarouselOverlayHeight,
  MAP_CAROUSEL_CLOSE_H,
} from "@/components/listings/ListingMapCarousel";
import { SkounMapPin } from "@/components/listings/SkounMapPin";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import { useWalkingRoute } from "@/features/listings/useWalkingRoute";
import {
  buildPinClusterIndex,
  clusterBubbleSize,
  idsInCluster,
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
import {
  animateRegion,
  fitCoords,
  type MapRegion,
} from "@/lib/nativeMapCamera";
import { rentPriceTypeCompact } from "@/lib/rentPriceType";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CampusMeta, Listing } from "@/types/listing";
import { campusPinLabel } from "@/lib/campusPinLabel";

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
  /** When set in university mode, frame this campus instead of all pins. */
  focusCampusSlug?: string | null;
};

const SETTLE_SLACK = 200;
const MAP_PROVIDER =
  Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

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
const DIST_BADGE_W = 72;
const DIST_BADGE_H = 28;
const SELECTED_LINE = "#C23B2E";
const CLUSTER_FILL = "#C23B2E";
const ROUTE_COLOR = "#FF3B30";
const CLEAR_PIN_KEY = "__clear__";

type PinVariant = {
  amount: number;
  count: number;
  selected: boolean;
};

function pinVariantKey(amount: number, count: number, selected: boolean) {
  return `${amount}|${count}|${selected ? 1 : 0}`;
}

/** Same `{ uri }` object for a given file — MapKit treats a new object as reload. */
const PIN_IMAGE_SRC = new Map<string, { uri: string }>();
function pinImageSrc(uri: string | undefined): { uri: string } | undefined {
  if (!uri) return undefined;
  const hit = PIN_IMAGE_SRC.get(uri);
  if (hit) return hit;
  const src = { uri };
  PIN_IMAGE_SRC.set(uri, src);
  return src;
}

function shortPriceLabel(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function ClusterBubble({ count }: { count: number }) {
  const size = clusterBubbleSize(count);
  return (
    <View
      style={[
        styles.clusterBubble,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      collapsable={false}
      accessibilityElementsHidden
    >
      <LText
        variant="caption"
        style={[styles.clusterText, size >= 46 && styles.clusterTextLg]}
        numberOfLines={1}
      >
        {String(count)}
      </LText>
    </View>
  );
}

function ClusterSnapshot({
  count,
  onCaptured,
}: {
  count: number;
  onCaptured: (count: number, uri: string) => void;
}) {
  const shotRef = useRef<View>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!shotRef.current) return;
      captureRef(shotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      })
        .then((uri) => {
          if (!alive) return;
          onCaptured(count, uri);
        })
        .catch(() => {});
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [count, onCaptured]);
  const size = clusterBubbleSize(count);
  return (
    <View
      ref={shotRef}
      collapsable={false}
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ClusterBubble count={count} />
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
  // Static views only — SkounMapPin's Animated.View blanks on iOS MapKit markers.
  const fill = selected ? "#C23B2E" : "#2F6FED";
  const deep = selected ? "#8E241A" : "#121826";

  return (
    <View
      style={styles.markerSlot}
      accessibilityElementsHidden
      collapsable={false}
    >
      <View style={styles.markerInner} collapsable={false}>
        <View style={styles.pricePill}>
          <LText variant="caption" style={styles.priceText} numberOfLines={1}>
            {label}
          </LText>
        </View>
        <View style={styles.staticPinSlot}>
          <View style={[styles.staticPinHead, { backgroundColor: fill }]}>
            <View style={styles.staticPinCutout} />
          </View>
          <View
            style={[
              styles.staticPinTip,
              {
                borderTopColor: deep,
              },
            ]}
          />
        </View>
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
    <View
      style={styles.distanceBadge}
      accessibilityElementsHidden
      collapsable={false}
    >
      <LText variant="caption" style={styles.distanceBadgeText} numberOfLines={1}>
        {label}
      </LText>
    </View>
  );
}

function DistBadgeSnapshot({
  label,
  onCaptured,
}: {
  label: string;
  onCaptured: (label: string, uri: string) => void;
}) {
  const shotRef = useRef<View>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!shotRef.current) return;
      captureRef(shotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      })
        .then((uri) => {
          if (!alive) return;
          onCaptured(label, uri);
        })
        .catch(() => {});
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per label
  }, [label]);
  return (
    <View
      ref={shotRef}
      collapsable={false}
      pointerEvents="none"
      style={styles.distSnapshotBox}
    >
      <DistanceBadge label={label} />
    </View>
  );
}

/**
 * Offscreen pin → PNG. Markers use native `image` prop so MapKit never syncs
 * live React views (custom children + animateToRegion = iOS crash).
 */
function PinSnapshot({
  variantKey,
  variant,
  onCaptured,
}: {
  variantKey: string;
  variant: PinVariant;
  onCaptured: (key: string, uri: string) => void;
}) {
  const shotRef = useRef<View>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!shotRef.current) return;
      captureRef(shotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      })
        .then((uri) => {
          if (!alive) return;
          onCaptured(variantKey, uri);
        })
        .catch(() => {});
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per variant
  }, [variantKey]);
  return (
    <View
      ref={shotRef}
      collapsable={false}
      pointerEvents="none"
      style={styles.snapshotBox}
    >
      <PriceMarker
        amount={variant.amount}
        count={variant.count}
        selected={variant.selected}
      />
    </View>
  );
}

/** Transparent PNG so clustered leaves stay mounted without a visible price pin. */
function ClearPinSnapshot({
  onCaptured,
}: {
  onCaptured: (key: string, uri: string) => void;
}) {
  const shotRef = useRef<View>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!shotRef.current) return;
      captureRef(shotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      })
        .then((uri) => {
          if (!alive) return;
          onCaptured(CLEAR_PIN_KEY, uri);
        })
        .catch(() => {});
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [onCaptured]);
  return (
    <View
      ref={shotRef}
      collapsable={false}
      pointerEvents="none"
      style={styles.snapshotBox}
    />
  );
}

/**
 * Cluster / campus markers still use children — thaw briefly only.
 * Listing pins use static images (see PinSnapshot).
 */
function useTracksViewChanges(deps: unknown[]): boolean {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps list
  }, deps);
  return tracks;
}

function TrackedMarker({
  trackKey,
  forceTracks = false,
  freezeTracks = false,
  children,
  ...rest
}: ComponentProps<typeof Marker> & {
  trackKey: string;
  forceTracks?: boolean;
  freezeTracks?: boolean;
}) {
  const autoTracks = useTracksViewChanges([trackKey]);
  const tracksViewChanges = freezeTracks
    ? false
    : forceTracks || autoTracks;
  return (
    <Marker {...rest} tracksViewChanges={tracksViewChanges}>
      {children}
    </Marker>
  );
}

/** Stable lat/lng object refs — MapKit dislikes fresh coordinate objects every render. */
const PIN_COORD = new Map<string, { latitude: number; longitude: number }>();
function pinCoord(
  id: string,
  lat: number,
  lng: number,
): { latitude: number; longitude: number } {
  const prev = PIN_COORD.get(id);
  if (prev && prev.latitude === lat && prev.longitude === lng) return prev;
  const next = { latitude: lat, longitude: lng };
  PIN_COORD.set(id, next);
  return next;
}

const PIN_ANCHOR = { x: 0.5, y: PIN_HEAD_CENTER_Y / MARKER_H };
const PIN_CENTER_OFFSET = {
  x: 0,
  y: MARKER_H / 2 - PIN_HEAD_CENTER_Y,
};
const CLUSTER_ANCHOR = { x: 0.5, y: 0.5 };
const CLUSTER_PARK = pinCoord("__cluster_park__", -85, 0);

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

function regionAtZoom11(
  lat: number,
  lng: number,
  widthPx: number,
  heightPx: number,
): MapRegion {
  const longitudeDelta = (360 * widthPx) / (Math.pow(2, 11) * 256);
  return {
    latitude: lat,
    longitude: lng,
    longitudeDelta,
    latitudeDelta: longitudeDelta * (heightPx / Math.max(widthPx, 1)),
  };
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
  focusCampusSlug = null,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const ignoreNextMapPress = useRef(false);
  const flyStepRef = useRef<"idle" | "out" | "pan" | "in">("idle");
  const flyPanRef = useRef<MapRegion | null>(null);
  const flyInRef = useRef<MapRegion | null>(null);
  const flyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingRegionRef = useRef<MapRegion | null>(null);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const heightAnim = useRef(new Animated.Value(MAP_HEIGHT_COLLAPSED)).current;
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [mapReady, setMapReady] = useState(false);
  /** True while animateToRegion fly runs — freeze marker tracks/coords churn. */
  const [cameraBusy, setCameraBusy] = useState(false);

  const win = Dimensions.get("window");
  const mapWidthPx = win.width;
  const mapHeightPx = fillContainer
    ? win.height
    : expanded
      ? expandedMapHeight()
      : MAP_HEIGHT_COLLAPSED;

  useEffect(() => {
    const to = expanded ? expandedMapHeight() : MAP_HEIGHT_COLLAPSED;
    Animated.timing(heightAnim, {
      toValue: to,
      duration: reduceMotion ? 0 : 300,
      useNativeDriver: false,
    }).start();
  }, [expanded, reduceMotion, heightAnim]);

  const mappable = useMemo(() => listings.filter(hasCoords), [listings]);

  const groups = useMemo(
    () => groupListingsByProximity(mappable),
    [mappable],
  );

  const clusterIndex = useMemo(
    () => (groups.length > 0 ? buildPinClusterIndex(groups) : null),
    [groups],
  );

  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);

  const visibleFeatures = useMemo((): VisibleMapFeature[] => {
    // Keep Supercluster while carousel open. Forcing all leaves + mass thaw
    // blanks pins then crashes MapKit on the next camera fly.
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

  const visibleClusters = useMemo(
    () =>
      visibleFeatures.filter(
        (f): f is Extract<VisibleMapFeature, { kind: "cluster" }> =>
          f.kind === "cluster",
      ),
    [visibleFeatures],
  );

  /**
   * Cluster bubble Markers never unmount. Zoom fly used to drop them while
   * remounting leaves in one commit — MapKit native crash. Hidden slots park
   * off-map and stay mounted.
   */
  const clusterSlotsRef = useRef<
    Array<Extract<VisibleMapFeature, { kind: "cluster" }> & { hidden: boolean }>
  >([]);
  const clusterSlots = useMemo(() => {
    const live = visibleClusters.map((c) => ({ ...c, hidden: false }));
    const prev = clusterSlotsRef.current;
    const n = Math.max(prev.length, live.length);
    const next: Array<
      Extract<VisibleMapFeature, { kind: "cluster" }> & { hidden: boolean }
    > = [];
    for (let i = 0; i < n; i++) {
      if (live[i]) next.push(live[i]);
      else if (prev[i]) next.push({ ...prev[i], hidden: true });
    }
    clusterSlotsRef.current = next;
    return next;
  }, [visibleClusters]);

  /** Listing pins stay mounted; hide when covered by a cluster bubble. */
  const clusteredIds = useMemo(() => {
    const ids = new Set<string>();
    if (!clusterIndex) return ids;
    for (const cluster of visibleClusters) {
      for (const id of idsInCluster(clusterIndex, cluster.clusterId)) {
        ids.add(id);
      }
    }
    return ids;
  }, [clusterIndex, visibleClusters]);

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

  const [pinImages, setPinImages] = useState<Record<string, string>>({});
  const pinVariants = useMemo(() => {
    const map = new Map<string, PinVariant>();
    for (const g of groups) {
      for (const selected of [false, true] as const) {
        const key = pinVariantKey(g.displayPriceUsd, g.count, selected);
        if (!map.has(key)) {
          map.set(key, {
            amount: g.displayPriceUsd,
            count: g.count,
            selected,
          });
        }
      }
    }
    return map;
  }, [groups]);

  const pendingVariants = useMemo(
    () => [...pinVariants.entries()].filter(([key]) => !pinImages[key]),
    [pinVariants, pinImages],
  );

  const pinsReady = useMemo(
    () =>
      groups.every(
        (g) => pinImages[pinVariantKey(g.displayPriceUsd, g.count, false)],
      ),
    [groups, pinImages],
  );

  const listingIdsKey = useMemo(
    () => mappable.map((l) => l.id).join(","),
    [mappable],
  );

  const [listingTracks, setListingTracks] = useState(true);
  useEffect(() => {
    if (!mapReady || !pinsReady) return;
    setListingTracks(true);
    const t = setTimeout(() => setListingTracks(false), 800);
    return () => clearTimeout(t);
  }, [mapReady, pinsReady]);

  const [clusterImages, setClusterImages] = useState<Record<number, string>>(
    {},
  );
  const pendingClusterCounts = useMemo(() => {
    const counts = new Set<number>();
    for (const c of clusterSlots) counts.add(c.pointCount);
    return [...counts].filter((n) => !clusterImages[n]);
  }, [clusterSlots, clusterImages]);
  const onClusterCaptured = useCallback((count: number, uri: string) => {
    const normalized = uri.startsWith("file://") ? uri : `file://${uri}`;
    setClusterImages((prev) =>
      prev[count] ? prev : { ...prev, [count]: normalized },
    );
  }, []);

  const [clusterTracks, setClusterTracks] = useState(true);
  useEffect(() => {
    if (!mapReady) return;
    setClusterTracks(true);
    const t = setTimeout(() => setClusterTracks(false), 600);
    return () => clearTimeout(t);
  }, [mapReady]);

  function unlockCamera() {
    setCameraBusy(false);
  }

  const flyScheduleTokenRef = useRef(0);
  const lastFocusRef = useRef<{ id: string; t: number } | null>(null);

  const onPinCaptured = useCallback((key: string, uri: string) => {
    const normalized = uri.startsWith("file://") ? uri : `file://${uri}`;
    setPinImages((prev) =>
      prev[key] ? prev : { ...prev, [key]: normalized },
    );
  }, []);

  const [distImages, setDistImages] = useState<Record<string, string>>({});
  const onDistCaptured = useCallback((label: string, uri: string) => {
    const normalized = uri.startsWith("file://") ? uri : `file://${uri}`;
    setDistImages((prev) =>
      prev[label] ? prev : { ...prev, [label]: normalized },
    );
  }, []);

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

  const routeCoords = useMemo(() => {
    if (
      !universityMode ||
      !focusCampus ||
      !selectedListing ||
      walkingRoute?.status !== "ok" ||
      walkingRoute.coords.length < 2
    ) {
      return null;
    }
    return walkingRoute.coords.map((c) => ({
      latitude: c.lat,
      longitude: c.lng,
    }));
  }, [universityMode, focusCampus, selectedListing, walkingRoute]);

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

  const pendingDistLabels = useMemo(() => {
    if (!universityMode || !midpointLabel) return [] as string[];
    return distImages[midpointLabel] ? [] : [midpointLabel];
  }, [universityMode, midpointLabel, distImages]);

  const distReadyUri =
    midpointLabel && midpointCoord ? distImages[midpointLabel] : undefined;
  const lastDistUri = useRef<string | undefined>(undefined);
  if (distReadyUri) lastDistUri.current = distReadyUri;
  const anyDistUri = Object.values(distImages)[0];
  const distMarkerUri = distReadyUri ?? lastDistUri.current ?? anyDistUri;
  const distMarkerCoord =
    distReadyUri && midpointCoord
      ? midpointCoord
      : focusCampus
        ? pinCoord("dist-park-campus", focusCampus.lat, focusCampus.lng)
        : null;
  const [distTracks, setDistTracks] = useState(false);
  const prevDistReady = useRef(false);
  useEffect(() => {
    const ready = Boolean(distReadyUri);
    if (ready && !prevDistReady.current) {
      setDistTracks(true);
      const t = setTimeout(() => setDistTracks(false), 700);
      prevDistReady.current = ready;
      return () => clearTimeout(t);
    }
    prevDistReady.current = ready;
  }, [distReadyUri]);

  function clearFlyTimers() {
    for (const t of flyTimersRef.current) clearTimeout(t);
    flyTimersRef.current = [];
  }

  function flushPendingRegion() {
    if (pendingRegionRef.current) {
      setMapRegion(pendingRegionRef.current);
      pendingRegionRef.current = null;
      return;
    }
    if (flyInRef.current) {
      setMapRegion(flyInRef.current);
    }
  }

  function cancelFly(opts?: { keepBusy?: boolean }) {
    clearFlyTimers();
    const wasFlying = flyStepRef.current !== "idle";
    flyStepRef.current = "idle";
    if (wasFlying) flushPendingRegion();
    flyPanRef.current = null;
    flyInRef.current = null;
    if (!opts?.keepBusy) setCameraBusy(false);
  }

  function scheduleAnim(region: MapRegion, durationMs: number) {
    animateRegion(mapRef.current, region, durationMs);
  }

  useEffect(() => {
    return () => clearFlyTimers();
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    if (focusCampusSlug) return;
    if (groups.length === 0 && !(universityMode && campuses.length > 0)) {
      return;
    }
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
      const duration = expanded ? 0 : 400;
      fitCoords(
        mapRef.current,
        coords,
        { top: 48, right: 36, bottom: 56, left: 36 },
        duration,
        mapWidthPx,
        mapHeightPx,
      );
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-fit on sheet / array identity churn
  }, [
    mapReady,
    listingIdsKey,
    campusesKey,
    universityMode,
    expanded,
    focusCampusSlug,
  ]);

  useEffect(() => {
    if (!mapReady || !universityMode || !focusCampusSlug) return;
    const campus = campuses.find((c) => c.slug === focusCampusSlug);
    if (!campus) return;
    focusCampusOnMap(campus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fly when campus target changes
  }, [
    mapReady,
    universityMode,
    focusCampusSlug,
    campuses.find((c) => c.slug === focusCampusSlug)?.lng,
    campuses.find((c) => c.slug === focusCampusSlug)?.lat,
  ]);

  function markMarkerPress() {
    ignoreNextMapPress.current = true;
    setTimeout(() => {
      ignoreNextMapPress.current = false;
    }, 400);
  }

  function focusCampusOnMap(campus: CampusMeta) {
    const target = regionForListingFocus(
      campus.lat,
      campus.lng,
      mapWidthPx,
      mapHeightPx,
      0,
      PIN_SELECT_MIN_ZOOM,
    );
    const current = mapRegion;
    const outLat = current
      ? Math.min(
          Math.max(current.latitudeDelta, target.latitudeDelta) * 2.2,
          0.35,
        )
      : 0;
    const outLng = current
      ? Math.min(
          Math.max(current.longitudeDelta, target.longitudeDelta) * 2.2,
          0.35,
        )
      : 0;

    cancelFly({ keepBusy: true });
    setCameraBusy(true);
    pendingRegionRef.current = null;

    if (reduceMotion || !current) {
      flyStepRef.current = "in";
      flyInRef.current = target;
      scheduleAnim(target, reduceMotion ? 0 : 420);
      const tOnly = setTimeout(() => {
        if (flyStepRef.current === "in") {
          flyStepRef.current = "idle";
          flushPendingRegion();
          flyInRef.current = null;
          const tUnlock = setTimeout(() => setCameraBusy(false), 220);
          flyTimersRef.current.push(tUnlock);
        }
      }, (reduceMotion ? 0 : 420) + SETTLE_SLACK);
      flyTimersRef.current.push(tOnly);
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
    scheduleAnim(zoomedOut, 320);

    const t1 = setTimeout(() => {
      if (flyStepRef.current !== "out" || !flyPanRef.current) return;
      flyStepRef.current = "pan";
      scheduleAnim(flyPanRef.current, 450);
      const t2 = setTimeout(() => {
        if (flyStepRef.current !== "pan" || !flyInRef.current) return;
        flyStepRef.current = "in";
        scheduleAnim(flyInRef.current, 380);
        const t3 = setTimeout(() => {
          if (flyStepRef.current === "in") {
            flyStepRef.current = "idle";
            flushPendingRegion();
            flyInRef.current = null;
            const tUnlock = setTimeout(() => setCameraBusy(false), 220);
            flyTimersRef.current.push(tUnlock);
          }
        }, 380 + SETTLE_SLACK);
        flyTimersRef.current.push(t3);
      }, 450 + SETTLE_SLACK);
      flyTimersRef.current.push(t2);
    }, 320 + SETTLE_SLACK);
    flyTimersRef.current.push(t1);
  }

  function focusListingOnMap(listing: Listing) {
    if (listing.lat == null || listing.lng == null) return;
    const overlayH =
      mapCarouselOverlayHeight(mapWidthPx) +
      Math.max(insets.bottom, 12) +
      MAP_CAROUSEL_CLOSE_H +
      28;
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
      mapHeightPx,
      overlayH,
      zoom,
    );
    const current = mapRegion;
    const outLat = current
      ? Math.min(
          Math.max(current.latitudeDelta, target.latitudeDelta) * 2.2,
          0.35,
        )
      : 0;
    const outLng = current
      ? Math.min(
          Math.max(current.longitudeDelta, target.longitudeDelta) * 2.2,
          0.25,
        )
      : 0;

    const now = Date.now();
    if (
      lastFocusRef.current &&
      lastFocusRef.current.id === listing.id &&
      now - lastFocusRef.current.t < 400
    ) {
      return;
    }
    lastFocusRef.current = { id: listing.id, t: now };

    cancelFly({ keepBusy: true });
    setCameraBusy(true);

    if (reduceMotion || !current) {
      flyStepRef.current = "in";
      flyInRef.current = target;
      scheduleAnim(target, reduceMotion ? 0 : 420);
      const tOnly = setTimeout(() => {
        if (flyStepRef.current === "in") {
          flyStepRef.current = "idle";
          flushPendingRegion();
          flyInRef.current = null;
          const tUnlock = setTimeout(() => unlockCamera(), 220);
          flyTimersRef.current.push(tUnlock);
        }
      }, (reduceMotion ? 0 : 420) + SETTLE_SLACK);
      flyTimersRef.current.push(tOnly);
      return;
    }

    // 3-step fly. cameraBusy freezes clustering region until settle.
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
    scheduleAnim(zoomedOut, 320);

    const t1 = setTimeout(() => {
      if (flyStepRef.current !== "out" || !flyPanRef.current) return;
      flyStepRef.current = "pan";
      scheduleAnim(flyPanRef.current, 450);
      const t2 = setTimeout(() => {
        if (flyStepRef.current !== "pan" || !flyInRef.current) return;
        flyStepRef.current = "in";
        scheduleAnim(flyInRef.current, 380);
        const t3 = setTimeout(() => {
          if (flyStepRef.current === "in") {
            flyStepRef.current = "idle";
            flushPendingRegion();
            flyPanRef.current = null;
            flyInRef.current = null;
            const tUnlock = setTimeout(() => unlockCamera(), 220);
            flyTimersRef.current.push(tUnlock);
          }
        }, 380 + SETTLE_SLACK);
        flyTimersRef.current.push(t3);
      }, 450 + SETTLE_SLACK);
      flyTimersRef.current.push(t2);
    }, 320 + SETTLE_SLACK);
    flyTimersRef.current.push(t1);
  }

  function openCarousel(listingId: string, fly = true) {
    if (fly) setCameraBusy(true);
    setSheet({ kind: "carousel", listingId });
    if (!fly) return;
    const listing = mappable.find((l) => l.id === listingId);
    if (!listing) {
      setCameraBusy(false);
      return;
    }
    const token = ++flyScheduleTokenRef.current;
    const t = setTimeout(() => {
      if (flyScheduleTokenRef.current !== token) return;
      focusListingOnMap(listing);
    }, 160);
    flyTimersRef.current.push(t);
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
    cancelFly();
    scheduleAnim(next, reduceMotion ? 0 : 400);
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
  const initialRegion = regionAtZoom11(
    firstCenter?.lat ?? 33.8938,
    firstCenter?.lng ?? 35.5018,
    mapWidthPx,
    mapHeightPx,
  );

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
        {!mapReady || loading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={Skoun.color.primary} />
            <LText variant="caption" tone="muted">
              {loading ? "Updating map…" : "Loading map…"}
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

        <MapView
          ref={mapRef}
          style={styles.map}
          provider={MAP_PROVIDER}
          initialRegion={initialRegion}
          pitchEnabled
          rotateEnabled
          onMapReady={() => {
            setMapReady(true);
          }}
          onPress={onMapPress}
          onPanDrag={() => cancelFly()}
          onRegionChangeComplete={(region: Region) => {
            const next: MapRegion = {
              latitude: region.latitude,
              longitude: region.longitude,
              latitudeDelta: region.latitudeDelta,
              longitudeDelta: region.longitudeDelta,
            };
            // Freeze clustering during camera fly — mid-fly recluster parked every
            // leaf (leavesHidden→10) and blanked the focus pin on iOS.
            if (flyStepRef.current !== "idle") {
              pendingRegionRef.current = next;
              return;
            }
            setMapRegion(next);
          }}
        >
          {routeCoords ? (
            <Polyline
              coordinates={routeCoords}
              strokeColor={ROUTE_COLOR}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          ) : null}

          {universityMode
            ? campuses.map((campus) => {
                const selected = campus.slug === focusCampusSlug;
                return (
                  <TrackedMarker
                    key={`campus-${campus.slug}`}
                    trackKey={`campus-${campus.slug}-${selected ? "on" : "off"}`}
                    freezeTracks={cameraBusy}
                    coordinate={pinCoord(
                      `campus-${campus.slug}`,
                      campus.lat,
                      campus.lng,
                    )}
                    anchor={{ x: 0.5, y: 1 }}
                    zIndex={selected ? 80 : 50}
                    accessibilityLabel={`${campusPinLabel(campus)} campus`}
                  >
                    <View style={styles.campusNamed}>
                      <View style={styles.campusNameChip}>
                        <LText
                          variant="caption"
                          style={styles.campusNameText}
                          numberOfLines={1}
                        >
                          {campusPinLabel(campus)}
                        </LText>
                      </View>
                      <SkounMapPin
                        variant="campus"
                        dropped
                        selected={selected}
                      />
                    </View>
                  </TrackedMarker>
                );
              })
            : null}

          {pinsReady
            ? groups.map((group) => {
                const clustered = clusteredIds.has(group.id);
                const selected = selectedGroupId === group.id;
                const uri =
                  (selected
                    ? pinImages[
                        pinVariantKey(
                          group.displayPriceUsd,
                          group.count,
                          true,
                        )
                      ]
                    : undefined) ??
                  pinImages[
                    pinVariantKey(group.displayPriceUsd, group.count, false)
                  ];
                const a11y =
                  group.count > 1
                    ? `${group.count} listings from ${shortPriceLabel(group.displayPriceUsd)}`
                    : `${group.listings[0]?.area ?? "Listing"}, ${shortPriceLabel(group.displayPriceUsd)}`;
                return (
                  <Marker
                    key={group.id}
                    identifier={group.id}
                    coordinate={pinCoord(group.id, group.lat, group.lng)}
                    anchor={PIN_ANCHOR}
                    centerOffset={PIN_CENTER_OFFSET}
                    zIndex={1}
                    opacity={clustered ? 0 : 1}
                    tappable={!clustered}
                    tracksViewChanges={listingTracks}
                    image={pinImageSrc(uri)}
                    onPress={() => {
                      if (clustered) return;
                      onGroupPress(group);
                    }}
                    accessibilityLabel={a11y}
                  />
                );
              })
            : null}

          {clusterSlots.map((cluster, slot) => {
            const uri = clusterImages[cluster.pointCount];
            if (!uri) return null;
            const parked = cluster.hidden;
            return (
              <Marker
                key={`cluster-slot-${slot}`}
                identifier={`cluster-slot-${slot}`}
                coordinate={
                  parked
                    ? CLUSTER_PARK
                    : pinCoord(
                        `cluster-slot-${slot}`,
                        cluster.lat,
                        cluster.lng,
                      )
                }
                anchor={CLUSTER_ANCHOR}
                zIndex={120}
                tappable={!parked}
                tracksViewChanges={clusterTracks}
                image={pinImageSrc(uri)}
                onPress={() => {
                  if (parked) return;
                  onClusterPress(cluster);
                }}
                accessibilityLabel={
                  parked
                    ? undefined
                    : `${cluster.pointCount} places — tap to zoom`
                }
              />
            );
          })}

          {universityMode && distMarkerUri && distMarkerCoord ? (
            <Marker
              identifier="campus-distance"
              coordinate={distMarkerCoord}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={200}
              opacity={distReadyUri ? 1 : 0}
              tracksViewChanges={
                !cameraBusy && (distTracks || Boolean(distReadyUri))
              }
              image={pinImageSrc(distMarkerUri)}
              tappable={false}
              accessibilityElementsHidden
            />
          ) : null}
        </MapView>

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

      {pendingVariants.length > 0 ||
      pendingDistLabels.length > 0 ||
      pendingClusterCounts.length > 0 ||
      !pinImages[CLEAR_PIN_KEY] ? (
        <View style={styles.snapshotLayer} pointerEvents="none">
          {!pinImages[CLEAR_PIN_KEY] ? (
            <ClearPinSnapshot onCaptured={onPinCaptured} />
          ) : null}
          {pendingVariants.map(([key, variant]) => (
            <PinSnapshot
              key={key}
              variantKey={key}
              variant={variant}
              onCaptured={onPinCaptured}
            />
          ))}
          {pendingClusterCounts.map((count) => (
            <ClusterSnapshot
              key={`cluster:${count}`}
              count={count}
              onCaptured={onClusterCaptured}
            />
          ))}
          {pendingDistLabels.map((label) => (
            <DistBadgeSnapshot
              key={`dist:${label}`}
              label={label}
              onCaptured={onDistCaptured}
            />
          ))}
        </View>
      ) : null}

      {Object.keys(distImages).length > 0 ? (
        <View style={styles.snapshotLayer} pointerEvents="none">
          {Object.entries(distImages).map(([label, uri]) => (
            <Image
              key={`warm:${label}`}
              source={{ uri }}
              style={styles.distSnapshotBox}
            />
          ))}
        </View>
      ) : null}

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
  snapshotLayer: {
    position: "absolute",
    top: 0,
    left: -MARKER_W * 20,
    width: MARKER_W,
  },
  snapshotBox: {
    width: MARKER_W,
    height: MARKER_H,
  },
  distSnapshotBox: {
    width: DIST_BADGE_W,
    height: DIST_BADGE_H,
    alignItems: "center",
    justifyContent: "center",
  },
  markerInner: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: MARKER_W,
  },
  staticPinSlot: {
    width: 44,
    height: 52,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  staticPinHead: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  staticPinCutout: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  staticPinTip: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
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
  campusNamed: {
    alignItems: "center",
    maxWidth: 120,
  },
  campusNameChip: {
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#C4A574",
    marginBottom: 4,
  },
  campusNameText: {
    color: "#2A1F14",
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    textAlign: "center",
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
