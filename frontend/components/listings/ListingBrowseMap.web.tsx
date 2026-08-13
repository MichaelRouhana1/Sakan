import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  LayerGroup,
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
} from "leaflet";
import { LText } from "@/components/lister/Typography";
import {
  ListingMapCarousel,
  mapCarouselOverlayHeight,
} from "@/components/listings/ListingMapCarousel";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import { agentDebugLog } from "@/lib/agentDebugLog";
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
import {
  campusPinIcon,
  clusterBubbleIcon,
  createSkounMap,
  distanceBadgeIcon,
  loadLeaflet,
  pricePinIcon,
  type LeafletNS,
} from "@/lib/skounLeaflet.web";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { CampusMeta, Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
  campuses: CampusMeta[];
  universityMode?: boolean;
  loading?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Fill parent height (Amber map split) — skips collapsed/expanded fixed heights. */
  fillContainer?: boolean;
  onCarouselOpenChange?: (open: boolean) => void;
  onOpenListing?: (listing: Listing) => void;
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

function shortPriceLabel(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function hasCoords(
  listing: Listing,
): listing is Listing & { lng: number; lat: number } {
  return listing.lng != null && listing.lat != null;
}

const MAP_HEIGHT_COLLAPSED = 320;

function expandedMapHeight(): number {
  const h = Dimensions.get("window").height;
  return Math.max(360, h - appleTabScrollInset - 148);
}

/**
 * Web browse map — Leaflet + OSM loaded client-side only (Expo SSR safe).
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
  onOpenListing,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);
  const clusterIndexRef = useRef<PinClusterIndex | null>(null);
  const ignoreNextMapClick = useRef(false);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const heightAnim = useRef(new Animated.Value(MAP_HEIGHT_COLLAPSED)).current;

  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [mapReady, setMapReady] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<VisibleMapFeature[]>(
    [],
  );

  useEffect(() => {
    if (fillContainer || mapReady) {
      const t1 = requestAnimationFrame(() => mapRef.current?.invalidateSize());
      const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 60);
      const t3 = setTimeout(() => mapRef.current?.invalidateSize(), 200);
      return () => {
        cancelAnimationFrame(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    const to = expanded ? expandedMapHeight() : MAP_HEIGHT_COLLAPSED;
    Animated.timing(heightAnim, {
      toValue: to,
      duration: reduceMotion ? 0 : 300,
      useNativeDriver: false,
    }).start(() => {
      mapRef.current?.invalidateSize();
    });
  }, [expanded, fillContainer, mapReady, reduceMotion, heightAnim]);

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
    const b = map.getBounds();
    const bbox = padBBox([
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ] as MapBBox);
    setVisibleFeatures(queryVisibleFeatures(index, bbox, map.getZoom()));
  }

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

  const activeGroupId = useMemo(() => {
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

  // Init Leaflet on the client only (after mount — window exists).
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !hostRef.current) return;

        const firstCampus = campuses[0];
        const center: [number, number] = firstCampus
          ? [firstCampus.lat, firstCampus.lng]
          : groups[0]
            ? [groups[0].lat, groups[0].lng]
            : [33.8938, 35.5018];

        const map = createSkounMap(L, hostRef.current, center, 12);
        mapRef.current = map;
        leafletRef.current = L;
        layerRef.current = L.layerGroup().addTo(map);

        map.on("click", () => {
          if (ignoreNextMapClick.current) {
            ignoreNextMapClick.current = false;
            return;
          }
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
            const b = m.getBounds();
            const bbox = padBBox([
              b.getWest(),
              b.getSouth(),
              b.getEast(),
              b.getNorth(),
            ] as MapBBox);
            setVisibleFeatures(
              queryVisibleFeatures(index, bbox, m.getZoom()),
            );
          }, 80);
        };
        map.on("moveend", onViewport);
        map.on("zoomend", onViewport);

        if (!cancelled) setMapReady(true);
      } catch {
        // SSR / missing window — leave empty shell.
      }
    })();

    const onResize = () => mapRef.current?.invalidateSize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
      setVisibleFeatures([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- client init once
  }, []);

  // Re-query clusters when the pin set / index changes.
  useEffect(() => {
    if (!mapReady || !clusterIndex) {
      setVisibleFeatures([]);
      return;
    }
    refreshVisibleFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bound to index rebuild
  }, [mapReady, clusterIndex]);

  // Sync markers / line when viewport clusters or selection changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    const L = leafletRef.current;
    if (!map || !layer || !L || !mapReady) return;

    layer.clearLayers();

    function openGroup(group: MapPinGroup) {
      ignoreNextMapClick.current = true;
      setTimeout(() => {
        ignoreNextMapClick.current = false;
      }, 80);
      const listing = group.listings[0];
      if (!listing) return;
      setSheet({ kind: "carousel", listingId: listing.id });
    }

    function expandCluster(feature: Extract<VisibleMapFeature, { kind: "cluster" }>) {
      ignoreNextMapClick.current = true;
      setTimeout(() => {
        ignoreNextMapClick.current = false;
      }, 80);
      mapRef.current?.flyTo([feature.lat, feature.lng], feature.expansionZoom, {
        duration: reduceMotion ? 0 : 0.45,
      });
    }

    if (universityMode) {
      for (const campus of campuses) {
        L.marker([campus.lat, campus.lng], {
          icon: campusPinIcon(L),
          interactive: false,
          keyboard: false,
        }).addTo(layer);
      }
    }

    for (const feature of visibleFeatures) {
      if (feature.kind === "cluster") {
        const size = clusterBubbleSize(feature.pointCount);
        const marker: LeafletMarker = L.marker([feature.lat, feature.lng], {
          icon: clusterBubbleIcon(L, feature.pointCount, size),
          riseOnHover: true,
          zIndexOffset: 200,
        });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          expandCluster(feature);
        });
        marker.addTo(layer);
        continue;
      }

      const group = groupsById.get(feature.groupId);
      if (!group) continue;
      const selected = activeGroupId === group.id;
      const label =
        group.count > 1
          ? `${shortPriceLabel(group.displayPriceUsd)} · ${group.count}`
          : shortPriceLabel(group.displayPriceUsd);
      const marker: LeafletMarker = L.marker([group.lat, group.lng], {
        icon: pricePinIcon(L, label, selected),
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        openGroup(group);
      });
      marker.addTo(layer);
    }

    const lineCampus = resolveNearestCampus(selectedListing, campuses);
    if (universityMode && lineCampus && selectedListing) {
      const line: LeafletPolyline = L.polyline(
        [
          [lineCampus.lat, lineCampus.lng],
          [selectedListing.lat, selectedListing.lng],
        ],
        {
          color: "#C23B2E",
          weight: 2.5,
          dashArray: "10 8",
          interactive: false,
        },
      );
      line.addTo(layer);

      const midLat = (lineCampus.lat + selectedListing.lat) / 2;
      const midLng = (lineCampus.lng + selectedListing.lng) / 2;
      let distMeters = selectedListing.distanceMeters;
      if (
        distMeters == null &&
        lineCampus.lat != null &&
        lineCampus.lng != null &&
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
        L.marker([midLat, midLng], {
          icon: distanceBadgeIcon(L, distLabel),
          interactive: false,
          keyboard: false,
        }).addTo(layer);
      }
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

  // Fit bounds when listing set / campus changes — not on sheet alone.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !mapReady || groups.length === 0) return;

    const latLngs: [number, number][] = groups.map((g) => [g.lat, g.lng]);
    if (universityMode) {
      for (const campus of campuses) {
        latLngs.push([campus.lat, campus.lng]);
      }
    }
    if (latLngs.length === 0) return;

    const delay = expanded ? 320 : 80;
    const t = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [48, 48],
        maxZoom: 15,
      });
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, listingIdsKey, campusesKey, universityMode, expanded]);

  function focusListingOnMap(listing: Listing) {
    const map = mapRef.current;
    if (!map || listing.lat == null || listing.lng == null) return;
    const size = map.getSize();
    const overlayH =
      mapCarouselOverlayHeight(size.x) + Math.max(insets.bottom, 12) + 20;
    const zoom = Math.min(16, Math.max(map.getZoom(), 14));
    const target = map.project([listing.lat, listing.lng], zoom);
    target.y += overlayH / 2;
    const latlng = map.unproject(target, zoom);
    map.flyTo(latlng, zoom, { duration: reduceMotion ? 0 : 0.75 });
  }

  function openCarousel(listingId: string, fly = true) {
    // #region agent log
    agentDebugLog("H1", "ListingBrowseMap.web.tsx:openCarousel", "open carousel", { listingId, fly, sheetKind: sheet.kind });
    // #endregion
    setSheet({ kind: "carousel", listingId });
    if (!fly) return;
    const listing = mappable.find((l) => l.id === listingId);
    if (listing) focusListingOnMap(listing);
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

  const canToggleExpand = Boolean(onExpandedChange) && !fillContainer;

  return (
    <View
      style={[
        styles.root,
        expanded && styles.rootExpanded,
        fillContainer && styles.rootFill,
      ]}
    >
      {universityMode && campuses.length === 0 ? (
        <LText variant="caption" tone="muted" style={styles.caption}>
          Campus pin unavailable — showing listings only.
        </LText>
      ) : null}

      <Animated.View
        style={[
          styles.mapShell,
          fillContainer ? styles.mapShellFill : { height: heightAnim },
        ]}
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
        <div
          ref={hostRef}
          className="skoun-leaflet-map"
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

      {sheet.kind === "carousel" && selectedListing ? (
        <View
          style={[styles.sheetBelow, fillContainer && styles.sheetOverlay]}
          pointerEvents="box-none"
        >
          <ListingMapCarousel
            listings={carouselListings}
            selectedId={selectedListing.id}
            onIndexChange={(listingId) => openCarousel(listingId, true)}
            onDismiss={() => setSheet({ kind: "none" })}
            onPressCard={openListingDetail}
            bottomInset={fillContainer ? Math.max(insets.bottom, 12) + 20 : 8}
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
  sheetBelow: {
    gap: 6,
  },
  sheetOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 450,
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
    bottom: 8,
    alignItems: "center",
    zIndex: 400,
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
