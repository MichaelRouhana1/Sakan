import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import {
  buildPinClusterIndex,
  clusterBubbleSize,
  padBBox,
  queryVisibleFeatures,
  type MapBBox,
  type PinClusterIndex,
  type VisibleMapFeature,
} from "@/lib/mapClusters";
import { formatDistanceShort } from "@/lib/formatDistance";
import {
  groupListingsByProximity,
  type MapPinGroup,
} from "@/lib/mapPinGroups";
import { MAP_TOKEN_MISSING_COPY } from "@/lib/mapboxEnv";
import {
  amberPopupHtml,
  applyAmberPopupSide,
  bindAmberPopup,
  campusPinHtml,
  clusterBubbleHtml,
  createSkounMap,
  destroySkounMap,
  distanceBadgeHtml,
  distanceBadgeLngLat,
  loadMapbox,
  makeMarker,
  pricePinHtml,
  resolveUniPopupSide,
  setCampusLine,
  toLngLat,
  type MapboxGL,
  type MapboxMap,
  type Marker,
  type Popup,
} from "@/lib/skounMapbox.web";
import { useReducedMotion } from "@/lib/useReducedMotion";
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
  /** When pane is shown after keep-alive hide, trigger resize. */
  active?: boolean;
};

type MarkerRec = {
  marker: Marker;
  key?: string;
  html?: string;
  cluster?: Extract<VisibleMapFeature, { kind: "cluster" }>;
  group?: MapPinGroup;
  popup?: Popup;
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
  | { kind: "preview"; listingId: string };

function shortPriceLabel(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function hasCoords(
  listing: Listing,
): listing is Listing & { lng: number; lat: number } {
  return listing.lng != null && listing.lat != null;
}

const MAP_HEIGHT_COLLAPSED = 320;
const PIN_SELECT_MIN_ZOOM = 16;
const PIN_SELECT_ZOOM_IN_MS = 550;
const PIN_SELECT_PAN_MS = 350;
const CAMPUS_ZOOM_BOOST_START_M = 400;
const CAMPUS_ZOOM_BOOST_FULL_M = 100;
const PIN_SELECT_NEAR_ZOOM = 18;

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

function mapBBox(map: MapboxMap): MapBBox | null {
  const b = map.getBounds();
  if (!b) return null;
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

/**
 * Web browse map — Mapbox GL loaded client-side only (Expo SSR safe).
 */
export function ListingBrowseMap({
  listings,
  campuses,
  universityMode = false,
  loading,
  expanded = false,
  onExpandedChange,
  fillContainer = false,
  onCarouselOpenChange,
  hoveredListingId = null,
  active = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<MapboxGL | null>(null);
  const clusterIndexRef = useRef<PinClusterIndex | null>(null);
  const listingMarkersRef = useRef<Map<string, MarkerRec>>(new Map());
  const clusterMarkersRef = useRef<Map<number, MarkerRec>>(new Map());
  const overlayBadgeRef = useRef<Marker | null>(null);
  const ignoreNextMapClick = useRef(false);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const universityModeRef = useRef(universityMode);
  universityModeRef.current = universityMode;
  const campusesRef = useRef(campuses);
  campusesRef.current = campuses;
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const heightAnim = useRef(new Animated.Value(MAP_HEIGHT_COLLAPSED)).current;

  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [mapReady, setMapReady] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<VisibleMapFeature[]>(
    [],
  );

  useEffect(() => {
    if (fillContainer || mapReady) {
      mapRef.current?.resize();
      return;
    }
    const to = expanded ? expandedMapHeight() : MAP_HEIGHT_COLLAPSED;
    Animated.timing(heightAnim, {
      toValue: to,
      duration: reduceMotion ? 0 : 300,
      useNativeDriver: false,
    }).start(() => {
      mapRef.current?.resize();
    });
  }, [expanded, fillContainer, mapReady, reduceMotion, heightAnim]);

  useEffect(() => {
    if (active) mapRef.current?.resize();
  }, [active]);

  const mappable = useMemo(() => listings.filter(hasCoords), [listings]);

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

  useEffect(() => {
    clusterIndexRef.current = clusterIndex;
  }, [clusterIndex]);

  function refreshVisibleFeatures() {
    const map = mapRef.current;
    const index = clusterIndexRef.current;
    if (!map || !index) {
      setVisibleFeatures([]);
      return;
    }
    const bbox = mapBBox(map);
    if (!bbox) {
      setVisibleFeatures([]);
      return;
    }
    setVisibleFeatures(
      queryVisibleFeatures(index, padBBox(bbox), map.getZoom()),
    );
  }

  const selectedListing = useMemo(() => {
    if (sheet.kind !== "preview") return null;
    return mappable.find((l) => l.id === sheet.listingId) ?? null;
  }, [sheet, mappable]);

  const activeGroupId = useMemo(() => {
    const listingId =
      sheet.kind === "preview" ? sheet.listingId : hoveredListingId;
    if (!listingId) return null;
    for (const g of groups) {
      if (g.listings.some((l) => l.id === listingId)) return g.id;
    }
    return null;
  }, [sheet, groups, hoveredListingId]);

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
    onCarouselOpenChange?.(false);
  }, [onCarouselOpenChange]);

  useEffect(() => {
    if (!mapReady || !hoveredListingId) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      if (sheet.kind === "preview") {
        window._skounActivePopup?.remove();
        setSheet({ kind: "none" });
      }
      const listing = mappable.find((l) => l.id === hoveredListingId);
      if (!listing) return;
      const bounds = map.getBounds();
      if (bounds && !bounds.contains(toLngLat(listing))) {
        map.easeTo({
          center: toLngLat(listing),
          duration: reduceMotionRef.current ? 0 : 400,
        });
      }
    }, 80);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [hoveredListingId, mapReady, mappable, sheet.kind]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = await loadMapbox();
        if (cancelled || !hostRef.current) return;

        const firstCampus = campuses[0];
        const center = firstCampus
          ? { lat: firstCampus.lat, lng: firstCampus.lng }
          : groups[0]
            ? { lat: groups[0].lat, lng: groups[0].lng }
            : { lat: 33.8938, lng: 35.5018 };

        const map = createSkounMap(mapboxgl, hostRef.current, center, 12);
        if (!map) {
          if (!cancelled) setTokenMissing(true);
          return;
        }
        mapRef.current = map;
        mapboxRef.current = mapboxgl;

        map.on("click", () => {
          if (ignoreNextMapClick.current) {
            ignoreNextMapClick.current = false;
            return;
          }
          window._skounActivePopup?.remove();
          setSheet({ kind: "none" });
        });

        const onViewport = () => {
          if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
          moveTimerRef.current = setTimeout(() => {
            const m = mapRef.current;
            const index = clusterIndexRef.current;
            if (!m || !index) {
              setVisibleFeatures([]);
              return;
            }
            const bbox = mapBBox(m);
            if (!bbox) {
              setVisibleFeatures([]);
              return;
            }
            setVisibleFeatures(
              queryVisibleFeatures(index, padBBox(bbox), m.getZoom()),
            );
          }, 80);
        };
        map.on("moveend", onViewport);
        map.on("zoomend", onViewport);

        if (!cancelled) setMapReady(true);
      } catch {
        // SSR / missing window / Mapbox init failure
      }
    })();

    return () => {
      cancelled = true;
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      for (const rec of listingMarkersRef.current.values()) rec.marker.remove();
      for (const rec of clusterMarkersRef.current.values()) rec.marker.remove();
      listingMarkersRef.current.clear();
      clusterMarkersRef.current.clear();
      overlayBadgeRef.current?.remove();
      overlayBadgeRef.current = null;
      destroySkounMap(mapRef.current);
      mapRef.current = null;
      mapboxRef.current = null;
      setMapReady(false);
      setVisibleFeatures([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- client init once
  }, []);

  useEffect(() => {
    if (!mapReady || !clusterIndex) {
      setVisibleFeatures([]);
      return;
    }
    refreshVisibleFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, clusterIndex]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !mapReady) return;
    const gl = mapboxgl;
    const hostMap = map;

    const listingMarkers = listingMarkersRef.current;
    const clusterMarkers = clusterMarkersRef.current;
    const seenListings = new Set<string>();
    const seenClusters = new Set<number>();

    function openGroup(group: MapPinGroup) {
      ignoreNextMapClick.current = true;
      setTimeout(() => {
        ignoreNextMapClick.current = false;
      }, 80);
      const listing = group.listings[0];
      if (!listing) return;
      setSheet((prev) =>
        prev.kind === "preview" && prev.listingId === listing.id
          ? prev
          : { kind: "preview", listingId: listing.id },
      );
    }

    function expandCluster(
      feature: Extract<VisibleMapFeature, { kind: "cluster" }>,
    ) {
      ignoreNextMapClick.current = true;
      setTimeout(() => {
        ignoreNextMapClick.current = false;
      }, 80);
      mapRef.current?.easeTo({
        center: [feature.lng, feature.lat],
        zoom: feature.expansionZoom,
        duration: reduceMotion ? 0 : 450,
      });
    }

    if (universityMode) {
      for (const campus of campuses) {
        const key = `campus:${campus.slug}`;
        seenListings.add(key);
        if (listingMarkers.has(key)) continue;
        const campusMarker = makeMarker(
          gl,
          campusPinHtml(),
          campus,
          { inert: true },
        );
        campusMarker.addTo(hostMap);
        listingMarkers.set(key, { marker: campusMarker, key });
      }
    }

    for (const feature of visibleFeatures) {
      if (feature.kind === "cluster") {
        seenClusters.add(feature.clusterId);
        const size = clusterBubbleSize(feature.pointCount);
        const iconKey = `${feature.pointCount}:${feature.lat.toFixed(5)}:${feature.lng.toFixed(5)}`;
        const existing = clusterMarkers.get(feature.clusterId);
        if (existing) {
          existing.cluster = feature;
          existing.marker.setLngLat([feature.lng, feature.lat]);
          if (existing.key !== iconKey) {
            existing.marker.getElement().innerHTML = clusterBubbleHtml(
              feature.pointCount,
              size,
            );
            existing.key = iconKey;
          }
          continue;
        }
        const marker = makeMarker(
          gl,
          clusterBubbleHtml(feature.pointCount, size),
          feature,
          { anchor: "center", zIndex: 200 },
        );
        const rec: MarkerRec = { marker, key: iconKey, cluster: feature };
        marker.getElement().addEventListener("click", (e) => {
          e.stopPropagation();
          const next = rec.cluster;
          if (next) expandCluster(next);
        });
        marker.addTo(hostMap);
        clusterMarkers.set(feature.clusterId, rec);
        continue;
      }

      const group = groupsById.get(feature.groupId);
      if (!group) continue;
      upsertListingMarker(group);
    }

    if (activeGroupId) {
      const selectedGroup = groupsById.get(activeGroupId);
      if (selectedGroup) upsertListingMarker(selectedGroup);
    }

    function upsertListingMarker(group: MapPinGroup) {
      if (seenListings.has(group.id) && listingMarkers.has(group.id)) return;
      seenListings.add(group.id);
      const selected = activeGroupId === group.id;
      const label =
        group.count > 1
          ? `${shortPriceLabel(group.displayPriceUsd)} · ${group.count}`
          : shortPriceLabel(group.displayPriceUsd);
      const iconKey = `${label}|${selected ? "1" : "0"}`;
      const existing = listingMarkers.get(group.id);
      if (existing) {
        existing.group = group;
        if (existing.key !== iconKey) {
          existing.marker.getElement().innerHTML = pricePinHtml(
            label,
            selected,
          );
          existing.marker.getElement().style.zIndex = selected ? "1000" : "1";
          existing.key = iconKey;
        }
        const html = amberPopupHtml(group);
        if (existing.html !== html) {
          existing.popup?.setHTML(html);
          existing.html = html;
        }
        return;
      }
      const marker = makeMarker(gl, pricePinHtml(label, selected), group, {
        zIndex: selected ? 1000 : 1,
      });
      const html = amberPopupHtml(group);
      const rec: MarkerRec = { marker, key: iconKey, html, group };
      rec.popup = bindAmberPopup(
        gl,
        marker,
        html,
        (popup) => {
          const next = rec.group;
          if (next) openGroup(next);
          const listing = next?.listings[0];
          const liveMap = mapRef.current;
          if (
            universityModeRef.current &&
            liveMap &&
            listing &&
            listing.lat != null &&
            listing.lng != null
          ) {
            const campus = resolveNearestCampus(listing, campusesRef.current);
            if (campus) {
              applyAmberPopupSide(
                popup,
                resolveUniPopupSide(liveMap, listing, campus),
              );
              const currentZoom = liveMap.getZoom();
              const distM =
                listing.distanceMeters ??
                calculateDistanceMeters(
                  campus.lat,
                  campus.lng,
                  listing.lat,
                  listing.lng,
                );
              const targetZoom = pinSelectZoomForCampusDistance(distM);
              const nextZoom = Math.max(currentZoom, targetZoom);
              const duration = reduceMotionRef.current
                ? 0
                : nextZoom > currentZoom
                  ? PIN_SELECT_ZOOM_IN_MS
                  : PIN_SELECT_PAN_MS;
              liveMap.easeTo({
                center: toLngLat(listing),
                zoom: nextZoom,
                duration,
              });
              return;
            }
          }
          applyAmberPopupSide(popup, "n");
        },
        () => {
          setSheet({ kind: "none" });
        },
      );
      marker.getElement().addEventListener("click", (e) => {
        e.stopPropagation();
      });
      marker.addTo(hostMap);
      listingMarkers.set(group.id, rec);
    }

    for (const [id, rec] of listingMarkers) {
      if (seenListings.has(id)) continue;
      rec.marker.remove();
      listingMarkers.delete(id);
    }
    for (const [id, rec] of clusterMarkers) {
      if (seenClusters.has(id)) continue;
      rec.marker.remove();
      clusterMarkers.delete(id);
    }

    overlayBadgeRef.current?.remove();
    overlayBadgeRef.current = null;
    const lineCampus = resolveNearestCampus(selectedListing, campuses);
    if (universityMode && lineCampus && selectedListing) {
      setCampusLine(hostMap, lineCampus, selectedListing);
      let distMeters = selectedListing.distanceMeters;
      if (
        distMeters == null &&
        selectedListing.lat != null &&
        selectedListing.lng != null
      ) {
        distMeters = calculateDistanceMeters(
          lineCampus.lat,
          lineCampus.lng,
          selectedListing.lat,
          selectedListing.lng,
        );
      }
      const distLabel = formatDistanceShort(distMeters);
      if (distLabel) {
        const badgePos = distanceBadgeLngLat(
          hostMap,
          lineCampus,
          selectedListing,
          distLabel,
        );
        const badge = makeMarker(
          gl,
          distanceBadgeHtml(distLabel),
          badgePos,
          { anchor: "center", inert: true },
        );
        badge.addTo(hostMap);
        overlayBadgeRef.current = badge;
      }
    } else {
      setCampusLine(hostMap, null, null);
    }
  }, [
    mapReady,
    visibleFeatures,
    groupsById,
    campuses,
    universityMode,
    activeGroupId,
    selectedListing,
    reduceMotion,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || groups.length === 0) return;

    const points: [number, number][] = groups.map((g) => toLngLat(g));
    if (universityMode) {
      for (const campus of campuses) points.push(toLngLat(campus));
    }
    if (points.length === 0) return;

    let west = points[0][0];
    let south = points[0][1];
    let east = points[0][0];
    let north = points[0][1];
    for (const [lng, lat] of points) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }

    const delay = expanded ? 320 : 80;
    const t = setTimeout(() => {
      map.resize();
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 48, maxZoom: 15, duration: reduceMotion ? 0 : 600 },
      );
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, listingIdsKey, campusesKey, universityMode, expanded]);

  const canToggleExpand = Boolean(onExpandedChange) && !fillContainer;
  const showLoading = (!mapReady && !tokenMissing) || loading;

  return (
    <View
      style={[
        styles.root,
        expanded && styles.rootExpanded,
        fillContainer && styles.rootFill,
      ]}
    >
      <Animated.View
        style={[
          styles.mapShell,
          fillContainer ? styles.mapShellFill : { height: heightAnim },
        ]}
      >
        {showLoading ? (
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
        <div
          ref={hostRef}
          className="skoun-mapbox-map"
          style={{ width: "100%", height: "100%" }}
        />
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
        {fillContainer && !sheetOpen ? (
          <View style={styles.hintOverlay} accessibilityRole="text">
            <LText variant="caption" tone="muted">
              Tap a pin or cluster for details
            </LText>
          </View>
        ) : null}
      </Animated.View>

      {!fillContainer && !sheetOpen ? (
        <View style={styles.hintBar} accessibilityRole="text">
          <LText variant="caption" tone="muted">
            Tap a pin or cluster for details
          </LText>
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
  rootFill: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    height: "100%" as unknown as number,
    width: "100%" as unknown as number,
    gap: 0,
    marginBottom: 0,
    position: "relative",
    overflow: "hidden",
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
    minHeight: 0,
    minWidth: 0,
    height: "100%" as unknown as number,
    width: "100%" as unknown as number,
    borderRadius: 0,
    borderWidth: 0,
    position: "relative",
    overflow: "hidden",
    zIndex: 10,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Skoun.color.primaryMist,
  },
  expandBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 500,
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
  hintBar: {
    alignItems: "center",
    paddingVertical: 4,
  },
  hintOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: "center",
    zIndex: 400,
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
