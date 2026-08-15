import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  PROVIDER_DEFAULT,
  type LatLng as MapLatLng,
  type MapPressEvent,
  type MarkerPressEvent,
  type Region,
} from "react-native-maps";
import { captureRef } from "react-native-view-shot";
import { LText } from "@/components/lister/Typography";
import { ListingMapCarousel, mapCarouselOverlayHeight } from "@/components/listings/ListingMapCarousel";
import { SkounMapPin, SKOUN_CAMPUS_PIN } from "@/components/listings/SkounMapPin";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import {
  buildPinClusterIndex,
  clusterBubbleSize,
  padBBox,
  queryVisibleFeatures,
  idsInCluster,
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
import { rentPriceTypeCompact } from "@/lib/rentPriceType";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CampusMeta, Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
  campuses: CampusMeta[];
  /** University Hub: show distance on preview + selected polyline. */
  universityMode?: boolean;
  loading?: boolean;
  /** Immersive map-focus layout (filters collapsed by parent). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Fill parent height (search map mode). */
  fillContainer?: boolean;
  /** Fires when the listing carousel opens or closes. */
  onCarouselOpenChange?: (open: boolean) => void;
  /** Open listing detail. Defaults to expo-router push. */
  onOpenListing?: (listing: Listing) => void;
  /** Web map split: card hover focus (web-only). */
  hoveredListingId?: string | null;
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

/** Fixed marker chrome size — color may change; bounds/anchor must not. */
const MARKER_W = 88;
const MARKER_H = 78;
/**
 * Pin head center, from the top of the marker image (pill ≈26 + gap, head 30).
 * Pins anchor here so the campus dashed line ends in the middle of the head.
 */
const PIN_HEAD_CENTER_Y = 48;
/** Campus brass badge slot — from SKOUN_CAMPUS_PIN. */
const CAMPUS_PIN_H = SKOUN_CAMPUS_PIN.height;
const CAMPUS_HEAD_CENTER_Y = SKOUN_CAMPUS_PIN.headCenterY;
/** Midline distance pill (matches web `skoun-dist-badge`). */
const DIST_BADGE_W = 72;
const DIST_BADGE_H = 26;
/** Selected pin + campus line (SkounMapPin danger accent). */
const SELECTED_LINE = "#C23B2E";
/** Amber-style cluster bubble fill (matches web / selected pin). */
const CLUSTER_FILL = "#C23B2E";

function shortPriceLabel(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

/** Count bubble for zoom-clustered pin groups. */
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
      collapsable={false}
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

/** Price callout + teardrop. Color-only; size/anchor fixed. */
function PriceMarker({
  amount,
  count,
  selected = false,
  animateDrop = true,
}: {
  amount: number;
  count: number;
  selected?: boolean;
  /** false for offscreen snapshot renders — capture the settled pin, not mid-drop. */
  animateDrop?: boolean;
}) {
  const label =
    count > 1
      ? `${shortPriceLabel(amount)} · ${count}`
      : shortPriceLabel(amount);

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
        <SkounMapPin
          variant="listing"
          dropped={animateDrop}
          selected={false}
          accent={selected ? "danger" : "default"}
        />
      </View>
    </View>
  );
}

type PinVariant = {
  amount: number;
  count: number;
  selected: boolean;
};

function pinVariantKey(amount: number, count: number, selected: boolean) {
  return `${amount}|${count}|${selected ? 1 : 0}`;
}

const CLEAR_PIN_KEY = "__clear__";

/** Same `{ uri }` object for a given file — MapKit treats a new object as a reload. */
const PIN_IMAGE_SRC = new Map<string, { uri: string }>();
function pinImageSrc(uri: string | undefined): { uri: string } | undefined {
  if (!uri) return undefined;
  const hit = PIN_IMAGE_SRC.get(uri);
  if (hit) return hit;
  const src = { uri };
  PIN_IMAGE_SRC.set(uri, src);
  return src;
}

const PIN_COORD = new Map<string, MapLatLng>();
function pinCoord(id: string, lat: number, lng: number): MapLatLng {
  const prev = PIN_COORD.get(id);
  if (prev && prev.latitude === lat && prev.longitude === lng) return prev;
  const next = { latitude: lat, longitude: lng };
  PIN_COORD.set(id, next);
  return next;
}

function midpoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): MapLatLng {
  return {
    latitude: (a.lat + b.lat) / 2,
    longitude: (a.lng + b.lng) / 2,
  };
}

/** Compact distance chip centered on the campus dashed line. */
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
 * Offscreen render of one pin variant, captured to a PNG file. Markers then
 * use the image natively (Marker `image` prop) — MapKit never has to sync
 * live React views, which caused teleport / blank / z-order bugs.
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
    // Give fonts/layout one frame to settle before capture.
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
        animateDrop={false}
      />
    </View>
  );
}

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
 * Browse map: coincident pin groups + Supercluster zoom clusters.
 * Distance / polylines always use the selected listing’s real coords.
 */
const MAP_HEIGHT_COLLAPSED = 320;

function expandedMapHeight(): number {
  const h = Dimensions.get("window").height;
  // Leave room for tabs + preview strip under the map.
  return Math.max(360, h - appleTabScrollInset - 148);
}

/**
 * In-tree overlay. JS tabs can hide for real; no Modal/FullWindowOverlay.
 */
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
  const mapRef = useRef<MapView | null>(null);
  const ignoreNextMapPress = useRef(false);
  const flyStepRef = useRef<"idle" | "out" | "pan" | "in">("idle");
  const flyPanRef = useRef<Region | null>(null);
  const flyInRef = useRef<Region | null>(null);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const heightAnim = useRef(new Animated.Value(MAP_HEIGHT_COLLAPSED)).current;
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [mapReady, setMapReady] = useState(false);
  // Campus marker only (children-based); listing pins are static images now.
  const [tracksViewChanges, setTracksViewChanges] = useState(false);

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

  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const mapWidthPx = Dimensions.get("window").width;

  const visibleFeatures = useMemo((): VisibleMapFeature[] => {
    if (!clusterIndex || !mapRegion) {
      // Before first region event, show all as leaves so pins appear immediately.
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

  /** Clustered listing markers stay mounted (MapKit crashes if they unmount mid-zoom). */
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

  /**
   * Cluster bubble Markers never unmount. Zoom-in used to drop them (3→0) in
   * the same commit as pin image swaps — MapKit native crash. Hidden slots
   * park off-map and stay mounted.
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

  /** Listing used for campus polyline + selected pin. */
  const focusListing = selectedListing;

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

  // Snapshot once when listings load — never thaw on select (that blanked pins).
  useEffect(() => {
    if (!mapReady) return;
    setTracksViewChanges(true);
    const t = setTimeout(() => {
      setTracksViewChanges(false);
    }, 600);
    return () => clearTimeout(t);
  }, [mapReady, listingIdsKey]);

  const sheetOpen = sheet.kind !== "none";

  useEffect(() => {
    onCarouselOpenChange?.(sheetOpen);
  }, [sheetOpen, onCarouselOpenChange]);

  const focusCampus = useMemo(
    () => resolveNearestCampus(focusListing, campuses),
    [focusListing, campuses],
  );

  const polylineCoords = useMemo((): MapLatLng[] | null => {
    if (!universityMode || !focusCampus || !focusListing) return null;
    return [
      { latitude: focusCampus.lat, longitude: focusCampus.lng },
      { latitude: focusListing.lat, longitude: focusListing.lng },
    ];
  }, [universityMode, focusCampus, focusListing]);

  // Crash fix (proven in H-Y experiment): never unmount the Polyline while
  // the map lives — MapKit can still be rendering the overlay when its native
  // view deallocates. Keep one polyline mounted for the whole university
  // session; with nothing selected it collapses to a zero-length line at the
  // first campus (invisible, and overlays render below the campus pin anyway).
  const anchorCampus = campuses[0] ?? null;
  const stablePolylineCoords = useMemo((): MapLatLng[] | null => {
    if (!universityMode || !anchorCampus) return null;
    if (polylineCoords) return polylineCoords;
    return [
      { latitude: anchorCampus.lat, longitude: anchorCampus.lng },
      { latitude: anchorCampus.lat, longitude: anchorCampus.lng },
    ];
  }, [universityMode, anchorCampus, polylineCoords]);

  const midpointCoord = useMemo((): MapLatLng | null => {
    if (!universityMode || !focusCampus || !focusListing) return null;
    return midpoint(
      { lat: focusCampus.lat, lng: focusCampus.lng },
      { lat: focusListing.lat, lng: focusListing.lng },
    );
  }, [universityMode, focusCampus, focusListing]);

  const midpointLabel = useMemo(() => {
    if (!focusListing) return null;
    let dist = focusListing.distanceMeters;
    if (
      dist == null &&
      focusCampus &&
      focusListing.lat != null &&
      focusListing.lng != null &&
      focusCampus.lat != null &&
      focusCampus.lng != null
    ) {
      dist = calculateDistanceMeters(
        focusCampus.lat,
        focusCampus.lng,
        focusListing.lat,
        focusListing.lng,
      );
    }
    return formatDistanceShort(dist);
  }, [focusListing, focusCampus]);

  const [distImages, setDistImages] = useState<Record<string, string>>({});

  // Pre-capture every unique distance label when listings load so the first
  // select already has a ready badge image (no first-tap lag).
  const distLabels = useMemo(() => {
    if (!universityMode) return [] as string[];
    const labels = new Set<string>();
    for (const listing of mappable) {
      let dist = listing.distanceMeters;
      if (dist == null || Number.isNaN(dist)) {
        const campus = resolveNearestCampus(listing, campuses);
        if (
          campus &&
          listing.lat != null &&
          listing.lng != null
        ) {
          dist = calculateDistanceMeters(
            campus.lat,
            campus.lng,
            listing.lat,
            listing.lng,
          );
        }
      }
      const label = formatDistanceShort(dist);
      if (label) labels.add(label);
    }
    return [...labels];
  }, [universityMode, mappable, campuses]);

  const pendingDistLabels = useMemo(() => {
    const need = distLabels.filter((label) => !distImages[label]);
    if (midpointLabel && !distImages[midpointLabel] && !need.includes(midpointLabel)) {
      need.push(midpointLabel);
    }
    return need;
  }, [distLabels, distImages, midpointLabel]);

  const onDistCaptured = useCallback((label: string, uri: string) => {
    const normalized = uri.startsWith("file://") ? uri : `file://${uri}`;
    setDistImages((prev) =>
      prev[label] ? prev : { ...prev, [label]: normalized },
    );
  }, []);

  // Crash-safe distance badge: same rule as the polyline — never unmount the
  // Marker while the map lives. Once any badge image exists we keep one marker
  // mounted, collapsing it to the campus with opacity 0 when unselected and
  // holding the last image so the `image` prop is always defined.
  const distReadyUri =
    midpointLabel && midpointCoord ? distImages[midpointLabel] : undefined;
  const lastDistUri = useRef<string | undefined>(undefined);
  if (distReadyUri) lastDistUri.current = distReadyUri;
  // Mount the badge marker as soon as ANY badge image exists (fallback to the
  // first cached one), so it mounts during initial load like the price pins.
  // A marker that first mounts on select doesn't paint its image on Apple Maps
  // that first frame — keeping it mounted from load avoids the first-tap blank.
  const anyDistUri = Object.values(distImages)[0];
  const distMarkerUri = distReadyUri ?? lastDistUri.current ?? anyDistUri;
  const distMarkerCoord =
    distReadyUri && midpointCoord
      ? midpointCoord
      : anchorCampus
        ? { latitude: anchorCampus.lat, longitude: anchorCampus.lng }
        : null;

  // Single badge marker: thaw whenever it becomes visible so MapKit paints the
  // first opacity 0→1 + campus→midpoint jump (image markers skip that frame).
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

  // Static pin images (Option 2): every price/count/color variant is rendered
  // once offscreen, snapshotted to a PNG, and markers use the native `image`
  // prop. No live React views inside annotations → nothing for MapKit to
  // re-sync (the source of the blank / teleport / z-order bugs).
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

  /** Show pins once every unselected (green) image for visible leaves exists. */
  const pinsReady = useMemo(
    () =>
      groups.every(
        (g) => pinImages[pinVariantKey(g.displayPriceUsd, g.count, false)],
      ),
    [groups, pinImages],
  );

  // Thaw cluster bubbles only when the cluster SET changes — not every pan.
  const clusterIdsKey = visibleClusters.map((c) => c.clusterId).join(",");
  const [clusterTracks, setClusterTracks] = useState(false);
  useEffect(() => {
    if (!mapReady || visibleClusters.length === 0) return;
    setClusterTracks(true);
    const t = setTimeout(() => setClusterTracks(false), 450);
    return () => clearTimeout(t);
  }, [mapReady, clusterIdsKey, visibleClusters.length]);

  // Thaw listing pin images only when the listing SET changes — not on zoom.
  // Thawing on every Supercluster leaf change blanks already-painted pins.
  const [leafTracks, setLeafTracks] = useState(true);
  useEffect(() => {
    if (!mapReady || groups.length === 0) return;
    setLeafTracks(true);
    const t = setTimeout(() => setLeafTracks(false), 750);
    return () => clearTimeout(t);
  }, [mapReady, listingIdsKey, groups.length]);

  const lastSelectedRef = useRef<string | null>(null);
  const prevClusteredRef = useRef<Set<string>>(new Set());
  const [paintIds, setPaintIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const ids = new Set<string>();
    if (selectedGroupId) ids.add(selectedGroupId);
    if (lastSelectedRef.current) ids.add(lastSelectedRef.current);
    const selectedChanged = lastSelectedRef.current !== selectedGroupId;
    const selectedLeftCluster = Boolean(
      selectedGroupId &&
        prevClusteredRef.current.has(selectedGroupId) &&
        !clusteredIds.has(selectedGroupId),
    );
    lastSelectedRef.current = selectedGroupId;
    prevClusteredRef.current = clusteredIds;
    if (!selectedChanged && !selectedLeftCluster) return;
    setPaintIds(ids);
    const t = setTimeout(() => setPaintIds(new Set()), 500);
    return () => clearTimeout(t);
  }, [selectedGroupId, clusteredIds]);

  const onPinCaptured = useCallback((key: string, uri: string) => {
    const normalized = uri.startsWith("file://") ? uri : `file://${uri}`;
    setPinImages((prev) =>
      prev[key] ? prev : { ...prev, [key]: normalized },
    );
  }, []);

  // Fit once when map is ready, listing set, or expand morph completes layout.
  useEffect(() => {
    if (!mapReady || groups.length === 0) return;
    const coords: MapLatLng[] = groups.map((g) => ({
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
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 48, right: 36, bottom: 56, left: 36 },
        animated: !expanded,
      });
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
    const target = regionForListingFocus(
      listing.lat,
      listing.lng,
      mapWidthPx,
      win.height,
      overlayH,
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
      mapRef.current?.animateToRegion(target, reduceMotion ? 0 : 420);
      return;
    }
    const zoomedOut: Region = {
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
    mapRef.current?.animateToRegion(zoomedOut, 320);
  }

  function openCarousel(listingId: string, fly = true) {
    setSheet({ kind: "carousel", listingId });
    if (!fly) return;
    const listing = mappable.find((l) => l.id === listingId);
    if (listing) focusListingOnMap(listing);
  }

  function onGroupPress(group: MapPinGroup, e?: MarkerPressEvent) {
    e?.stopPropagation();
    markMarkerPress();
    const listing = group.listings[0];
    if (!listing) return;
    openCarousel(listing.id, false);
  }

  function onClusterPress(
    feature: Extract<VisibleMapFeature, { kind: "cluster" }>,
    e?: MarkerPressEvent,
  ) {
    e?.stopPropagation();
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
    mapRef.current?.animateToRegion(next, reduceMotion ? 0 : 400);
  }

  function onRegionChangeComplete(region: Region) {
    const step = flyStepRef.current;
    setMapRegion(region);
    if (step === "out" && flyPanRef.current) {
      flyStepRef.current = "pan";
      mapRef.current?.animateToRegion(flyPanRef.current, 450);
      return;
    }
    if (step === "pan" && flyInRef.current) {
      flyStepRef.current = "in";
      mapRef.current?.animateToRegion(flyInRef.current, 380);
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

  function onMapPress(e: MapPressEvent) {
    const action = (e.nativeEvent as { action?: string }).action;
    const ignored = action === "marker-press" || ignoreNextMapPress.current;
    if (ignored) {
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

  return (
    <View
      style={[
        styles.root,
        fillContainer ? styles.rootFill : expanded && styles.rootExpanded,
      ]}
    >
      {universityMode && campuses.length === 0 ? (
        <LText variant="caption" tone="muted" style={styles.caption}>
          Campus pin unavailable — showing listings only.
        </LText>
      ) : null}

      {/* Map shell — height morphs for immersive expand; preview stays below */}
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
          provider={PROVIDER_DEFAULT}
          onMapReady={() => setMapReady(true)}
          onPress={onMapPress}
          onPanDrag={() => {
            if (flyStepRef.current !== "idle") cancelFly();
          }}
          onRegionChangeComplete={onRegionChangeComplete}
          mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
          toolbarEnabled={false}
          showsUserLocation={false}
          showsCompass={false}
          rotateEnabled={false}
          pitchEnabled={false}
          moveOnMarkerPress={false}
        >
          {universityMode
            ? campuses.map((campus) => (
                <Marker
                  key={`campus-${campus.slug}`}
                  coordinate={{
                    latitude: campus.lat,
                    longitude: campus.lng,
                  }}
                  anchor={{ x: 0.5, y: CAMPUS_HEAD_CENTER_Y / CAMPUS_PIN_H }}
                  centerOffset={{
                    x: 0,
                    y: CAMPUS_PIN_H / 2 - CAMPUS_HEAD_CENTER_Y,
                  }}
                  tracksViewChanges={tracksViewChanges}
                  tappable={false}
                  accessibilityLabel={`${campus.name} campus`}
                >
                  <SkounMapPin variant="campus" dropped />
                </Marker>
              ))
            : null}

          {clusterSlots.map((cluster, slot) => (
            <Marker
              key={`cluster-slot-${slot}`}
              identifier={`cluster-slot-${slot}`}
              coordinate={
                cluster.hidden
                  ? pinCoord("__cluster_park__", -85, 0)
                  : pinCoord(
                      `cluster-slot-${slot}`,
                      cluster.lat,
                      cluster.lng,
                    )
              }
              anchor={{ x: 0.5, y: 0.5 }}
              centerOffset={{ x: 0, y: 0 }}
              zIndex={300 + cluster.pointCount}
              tracksViewChanges={clusterTracks && !cluster.hidden}
              tappable={!cluster.hidden}
              onPress={(e) => {
                if (cluster.hidden) return;
                onClusterPress(cluster, e);
              }}
              accessibilityLabel={
                cluster.hidden
                  ? undefined
                  : `${cluster.pointCount} places — tap to zoom`
              }
              accessibilityElementsHidden={cluster.hidden}
            >
              <ClusterBubble count={cluster.pointCount} />
            </Marker>
          ))}

          {pinsReady
            ? groups.map((group) => {
                const selected = selectedGroupId === group.id;
                const clustered = clusteredIds.has(group.id);
                const uri = clustered
                  ? pinImages[CLEAR_PIN_KEY]
                  : pinImages[
                      pinVariantKey(
                        group.displayPriceUsd,
                        group.count,
                        selected,
                      )
                    ] ??
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
                    anchor={{ x: 0.5, y: PIN_HEAD_CENTER_Y / MARKER_H }}
                    centerOffset={{ x: 0, y: MARKER_H / 2 - PIN_HEAD_CENTER_Y }}
                    zIndex={1}
                    opacity={1}
                    tappable={!clustered}
                    tracksViewChanges={leafTracks || paintIds.has(group.id)}
                    image={pinImageSrc(uri)}
                    onPress={(e) => onGroupPress(group, e)}
                    accessibilityLabel={a11y}
                  />
                );
              })
            : null}

          {stablePolylineCoords ? (
            <Polyline
              coordinates={stablePolylineCoords}
              strokeColor={SELECTED_LINE}
              strokeWidth={2.5}
              lineDashPattern={[10, 8]}
              tappable={false}
            />
          ) : null}

          {universityMode && distMarkerUri && distMarkerCoord ? (
            <Marker
              identifier="campus-distance"
              coordinate={distMarkerCoord}
              anchor={{ x: 0.5, y: 0.5 }}
              centerOffset={{ x: 0, y: 0 }}
              zIndex={50}
              opacity={distReadyUri ? 1 : 0}
              tracksViewChanges={distTracks || Boolean(distReadyUri)}
              image={pinImageSrc(distMarkerUri)}
              pointerEvents="none"
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

      {/* Offscreen pin / distance-badge renders awaiting snapshot */}
      {pendingVariants.length > 0 ||
      pendingDistLabels.length > 0 ||
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
          {pendingDistLabels.map((label) => (
            <DistBadgeSnapshot
              key={`dist:${label}`}
              label={label}
              onCaptured={onDistCaptured}
            />
          ))}
        </View>
      ) : null}

      {/* Pre-warm the native image cache: the badge marker mounts on first
          select, so without this its image would load from disk lazily and
          the first tap would show no badge. Rendering each captured image
          offscreen forces the loader to cache it ahead of time. */}
      {Object.keys(distImages).length > 0 ? (
        <View style={styles.snapshotLayer} pointerEvents="none">
          {Object.entries(distImages).map(([label, uri]) => (
            <Image
              key={`warm:${label}`}
              source={{ uri }}
              style={styles.distSnapshotBox}
              fadeDuration={0}
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
  caption: { marginBottom: 2 },
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
  backToGroup: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  backText: {
    fontFamily: Skoun.type.bodySemi,
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
  /* Offscreen but fully rendered — opacity 0 could blank the capture. */
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
  emptyBox: {
    height: MAP_HEIGHT_COLLAPSED,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderRadius: Skoun.radius.lg,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
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
