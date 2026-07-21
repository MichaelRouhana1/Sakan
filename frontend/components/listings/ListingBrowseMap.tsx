import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type MapMarker,
  type MapPressEvent,
  type MarkerPressEvent,
} from "react-native-maps";
import { captureRef } from "react-native-view-shot";
import { LText } from "@/components/lister/Typography";
import { ListingMapPicker } from "@/components/listings/ListingMapPicker";
import { ListingMapPreview } from "@/components/listings/ListingMapPreview";
import { SkounMapPin, SKOUN_CAMPUS_PIN } from "@/components/listings/SkounMapPin";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import { formatDistanceShort } from "@/lib/formatDistance";
import {
  groupListingsByProximity,
  type MapPinGroup,
} from "@/lib/mapPinGroups";
import { rentPriceTypeCompact } from "@/lib/rentPriceType";
import { useReducedMotion } from "@/lib/useReducedMotion";
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
};

function resolveNearestCampus(
  listing: Listing | null | undefined,
  campuses: CampusMeta[],
): CampusMeta | null {
  if (!listing || campuses.length === 0) return null;
  if (listing.nearestCampusSlug) {
    const hit = campuses.find((c) => c.slug === listing.nearestCampusSlug);
    if (hit) return hit;
  }
  return campuses[0] ?? null;
}

type SheetState =
  | { kind: "none" }
  | { kind: "picker"; groupId: string }
  | { kind: "preview"; listingId: string; groupId: string };

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

function shortPriceLabel(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
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

/**
 * Browse map: grouped coincident pins; picker for 2+ at one spot.
 * Distance / polylines always use the selected listing’s real coords.
 */
const MAP_HEIGHT_COLLAPSED = 320;

function expandedMapHeight(): number {
  const h = Dimensions.get("window").height;
  // Leave room for tabs + preview strip under the map.
  return Math.max(360, h - appleTabScrollInset - 148);
}

export function ListingBrowseMap({
  listings,
  campuses,
  universityMode = false,
  loading,
  expanded = false,
  onExpandedChange,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const ignoreNextMapPress = useRef(false);
  const reduceMotion = useReducedMotion();
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

  const selectedListing = useMemo(() => {
    if (sheet.kind !== "preview") return null;
    return mappable.find((l) => l.id === sheet.listingId) ?? null;
  }, [sheet, mappable]);

  const pickerGroup = useMemo(() => {
    if (sheet.kind !== "picker") return null;
    return groupsById.get(sheet.groupId) ?? null;
  }, [sheet, groupsById]);

  const activeGroupId =
    sheet.kind === "picker" || sheet.kind === "preview"
      ? sheet.groupId
      : null;

  /** Listing used for campus polyline: preview pick, or cheapest in picker group. */
  const focusListing = useMemo(() => {
    if (sheet.kind === "preview") {
      return mappable.find((l) => l.id === sheet.listingId) ?? null;
    }
    if (sheet.kind === "picker") {
      return groupsById.get(sheet.groupId)?.listings[0] ?? null;
    }
    return null;
  }, [sheet, mappable, groupsById]);

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

  const midpointLabel = useMemo(
    () => formatDistanceShort(focusListing?.distanceMeters),
    [focusListing?.distanceMeters],
  );

  const [distImages, setDistImages] = useState<Record<string, string>>({});

  // Pre-capture every unique distance label when listings load so the first
  // select already has a ready badge image (no first-tap lag).
  const distLabels = useMemo(() => {
    if (!universityMode) return [] as string[];
    const labels = new Set<string>();
    for (const listing of mappable) {
      const label = formatDistanceShort(listing.distanceMeters);
      if (label) labels.add(label);
    }
    return [...labels];
  }, [universityMode, mappable]);

  const pendingDistLabels = useMemo(
    () => distLabels.filter((label) => !distImages[label]),
    [distLabels, distImages],
  );

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

  /** Show pins once every unselected (green) image exists; red may lag one frame. */
  const pinsReady = useMemo(
    () =>
      groups.every(
        (g) => pinImages[pinVariantKey(g.displayPriceUsd, g.count, false)],
      ),
    [groups, pinImages],
  );

  // MapKit only reliably raises the NATIVELY SELECTED annotation (zPriority,
  // iOS 14+); the lib's zPosition/zIndex hack is ignored between annotation
  // views. So on selection we natively select the dedicated red marker.
  // Unlike before, this can't ping-pong: the tap selects the GREEN marker,
  // and we select the separate red one — different annotations, one cycle.
  const redMarkerRefs = useRef(new Map<string, MapMarker | null>());
  const prevActiveGroupId = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevActiveGroupId.current;
    if (prev === activeGroupId) return;
    prevActiveGroupId.current = activeGroupId;

    if (prev) {
      redMarkerRefs.current.get(prev)?.hideCallout();
    }
    const nextRef = activeGroupId
      ? redMarkerRefs.current.get(activeGroupId)
      : null;
    if (activeGroupId) {
      nextRef?.showCallout();
    }
  }, [activeGroupId]);

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
    }, 50);
  }

  function onGroupPress(group: MapPinGroup, e?: MarkerPressEvent) {
    e?.stopPropagation();
    markMarkerPress();
    if (group.count === 1) {
      const only = group.listings[0];
      if (!only) return;
      setSheet({
        kind: "preview",
        listingId: only.id,
        groupId: group.id,
      });
      return;
    }
    setSheet({ kind: "picker", groupId: group.id });
  }

  function onMapPress(e: MapPressEvent) {
    const action = (e.nativeEvent as { action?: string }).action;
    if (action === "marker-press" || ignoreNextMapPress.current) {
      ignoreNextMapPress.current = false;
      return;
    }
    setSheet({ kind: "none" });
  }

  function openListingDetail(listing: Listing) {
    router.push({
      pathname: "/(renter)/listing/[id]",
      params: { id: listing.id },
    });
  }

  if (loading) {
    return (
      <View style={styles.emptyBox}>
        <ActivityIndicator color={Skoun.color.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <LText variant="subtitle">No pins on the map</LText>
        <LText variant="body" tone="muted" style={styles.emptyBody}>
          {listings.length > 0
            ? "These listings don’t have a location pin yet. Switch to List to browse them."
            : "Nothing matches these filters. Try another city or campus."}
        </LText>
      </View>
    );
  }

  const canToggleExpand = Boolean(onExpandedChange);

  return (
    <View style={[styles.root, expanded && styles.rootExpanded]}>
      {universityMode && campuses.length === 0 ? (
        <LText variant="caption" tone="muted" style={styles.caption}>
          Campus pin unavailable — showing listings only.
        </LText>
      ) : null}

      {/* Map shell — height morphs for immersive expand; preview stays below */}
      <Animated.View
        style={[styles.mapShell, { height: heightAnim }]}
        collapsable={false}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          onMapReady={() => setMapReady(true)}
          onPress={onMapPress}
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

          {pinsReady
            ? groups.flatMap((group) => {
                const selected = activeGroupId === group.id;
                const greenUri =
                  pinImages[
                    pinVariantKey(group.displayPriceUsd, group.count, false)
                  ];
                const redUri =
                  pinImages[
                    pinVariantKey(group.displayPriceUsd, group.count, true)
                  ];
                const a11y =
                  group.count > 1
                    ? `${group.count} listings from ${shortPriceLabel(group.displayPriceUsd)}`
                    : `${group.listings[0]?.area ?? "Listing"}, ${shortPriceLabel(group.displayPriceUsd)}`;
                // Two fully static markers per pin — image and zIndex never
                // change after mount. Selection only flips opacity (native
                // setAlpha: instant, no image reload, no layout). Transparent
                // views are skipped by hit-testing, so taps always land on
                // the visible one.
                const nodes = [
                  <Marker
                    key={`${group.id}:green`}
                    identifier={`${group.id}:green`}
                    coordinate={{
                      latitude: group.lat,
                      longitude: group.lng,
                    }}
                    anchor={{ x: 0.5, y: PIN_HEAD_CENTER_Y / MARKER_H }}
                    centerOffset={{ x: 0, y: MARKER_H / 2 - PIN_HEAD_CENTER_Y }}
                    zIndex={1}
                    opacity={selected && redUri ? 0 : 1}
                    image={{ uri: greenUri }}
                    onPress={(e) => onGroupPress(group, e)}
                    accessibilityLabel={a11y}
                  />,
                ];
                if (redUri) {
                  nodes.push(
                    <Marker
                      key={`${group.id}:red`}
                      ref={(r) => {
                        redMarkerRefs.current.set(group.id, r);
                      }}
                      identifier={`${group.id}:red`}
                      coordinate={{
                        latitude: group.lat,
                        longitude: group.lng,
                      }}
                      anchor={{ x: 0.5, y: PIN_HEAD_CENTER_Y / MARKER_H }}
                      centerOffset={{ x: 0, y: MARKER_H / 2 - PIN_HEAD_CENTER_Y }}
                      zIndex={1000}
                      opacity={selected ? 1 : 0}
                      image={{ uri: redUri }}
                      // Raised on top when selected — must not swallow taps
                      // meant for neighboring pins (88x78 mostly-transparent
                      // rect). userInteractionEnabled=NO lets touches fall
                      // through to the green pins; all selection input comes
                      // from those.
                      pointerEvents="none"
                      accessibilityLabel={a11y}
                    />,
                  );
                }
                return nodes;
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
              image={{ uri: distMarkerUri }}
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
      {pendingVariants.length > 0 || pendingDistLabels.length > 0 ? (
        <View style={styles.snapshotLayer} pointerEvents="none">
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
        <View style={styles.hintBar} accessibilityRole="text">
          <LText variant="caption" tone="muted">
            Tap a price pin for details
          </LText>
        </View>
      ) : null}

      {sheet.kind === "picker" && pickerGroup ? (
        <View style={styles.sheetBelow}>
          <ListingMapPicker
            listings={pickerGroup.listings}
            showDistance={universityMode}
            onDismiss={() => setSheet({ kind: "none" })}
            onSelect={(listing) =>
              setSheet({
                kind: "preview",
                listingId: listing.id,
                groupId: pickerGroup.id,
              })
            }
          />
        </View>
      ) : null}

      {sheet.kind === "preview" && selectedListing ? (
        <View style={styles.sheetBelow}>
          {(groupsById.get(sheet.groupId)?.count ?? 1) > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to places at this pin"
              onPress={() =>
                setSheet({ kind: "picker", groupId: sheet.groupId })
              }
              style={styles.backToGroup}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={Skoun.color.primary}
              />
              <LText variant="caption" tone="primary" style={styles.backText}>
                {(groupsById.get(sheet.groupId)?.count ?? 0)} places here
              </LText>
            </Pressable>
          ) : null}
          <ListingMapPreview
            listing={selectedListing}
            showDistance={universityMode}
            onDismiss={() => setSheet({ kind: "none" })}
            onPress={() => openListingDetail(selectedListing)}
          />
        </View>
      ) : null}
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
  caption: { marginBottom: 2 },
  mapShell: {
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.bgWash,
    position: "relative",
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
    shadowColor: "#14241E",
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
    shadowColor: "#14241E",
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
  emptyBody: { textAlign: "center" },
});
