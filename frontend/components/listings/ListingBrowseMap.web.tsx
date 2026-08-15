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
import type {
  LayerGroup,
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
} from "leaflet";
import { LText } from "@/components/lister/Typography";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import {
  buildPinClusterIndex,
  clusterBubbleSize,
  padBBox,
  queryVisibleFeatures,
  regionForListingFocus,
  zoomFromLongitudeDelta,
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
  distanceBadgeLatLng,
  loadLeaflet,
  pricePinIcon,
  amberPopupHtml,
  applyAmberPopupSide,
  bindAmberPopup,
  resolveUniPopupSide,
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
  hoveredListingId?: string | null;
};

type FlyStep = "idle" | "out" | "pan" | "in";

type FlyTarget = {
  lat: number;
  lng: number;
  zoom: number;
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
/** Pin click: zoom in to this if farther out. Never zoom out if already closer. */
const PIN_SELECT_MIN_ZOOM = 16;
const PIN_SELECT_ZOOM_IN_S = 0.55;
const PIN_SELECT_PAN_S = 0.35;
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
  hoveredListingId = null,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);
  const clusterIndexRef = useRef<PinClusterIndex | null>(null);
  const listingMarkersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const clusterMarkersRef = useRef<Map<number, LeafletMarker>>(new Map());
  const ignoreNextMapClick = useRef(false);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyStepRef = useRef<FlyStep>("idle");
  const flyPanRef = useRef<FlyTarget | null>(null);
  const flyInRef = useRef<FlyTarget | null>(null);
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

  const cancelFly = useCallback(() => {
    flyStepRef.current = "idle";
    flyPanRef.current = null;
    flyInRef.current = null;
  }, []);

  const getMapViewportSize = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      const size = map.getSize();
      return { width: size.x, height: size.y };
    }
    const el = hostRef.current;
    return {
      width: el?.clientWidth ?? 400,
      height: el?.clientHeight ?? 400,
    };
  }, []);

  const focusListingOnMap = useCallback(
    (listing: Listing & { lat: number; lng: number }) => {
      const map = mapRef.current;
      if (!map) return;

      cancelFly();

      const { width, height } = getMapViewportSize();
      const target = regionForListingFocus(
        listing.lat,
        listing.lng,
        width,
        height,
        0,
      );
      const targetZoom = zoomFromLongitudeDelta(target.longitudeDelta, width);
      const targetCenter: [number, number] = [
        target.latitude,
        target.longitude,
      ];

      const bounds = map.getBounds();
      const currentLngDelta = bounds.getEast() - bounds.getWest();
      const currentLatDelta = bounds.getNorth() - bounds.getSouth();
      const outLng =
        Math.max(currentLngDelta, target.longitudeDelta) * 2.2;
      const outLat =
        Math.max(currentLatDelta, target.latitudeDelta) * 2.2;
      const outZoom = zoomFromLongitudeDelta(outLng, width);

      const currentCenter = map.getCenter();

      if (reduceMotion) {
        cancelFly();
        map.flyTo(targetCenter, targetZoom, { duration: 0 });
        return;
      }

      flyPanRef.current = {
        lat: listing.lat,
        lng: listing.lng,
        zoom: outZoom,
      };
      flyInRef.current = {
        lat: targetCenter[0],
        lng: targetCenter[1],
        zoom: targetZoom,
      };
      flyStepRef.current = "out";
      map.flyTo([currentCenter.lat, currentCenter.lng], outZoom, {
        duration: 0.32,
      });
    },
    [cancelFly, getMapViewportSize, reduceMotion],
  );

  useEffect(() => {
    if (!mapReady || !hoveredListingId) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      if (sheet.kind === "preview") {
        map.closePopup();
        setSheet({ kind: "none" });
      }
      const listing = mappable.find((l) => l.id === hoveredListingId);
      if (listing) focusListingOnMap(listing);
    }, 80);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [hoveredListingId, mapReady, mappable, focusListingOnMap, sheet.kind]);

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
        overlayRef.current = L.layerGroup().addTo(map);

        map.on("click", () => {
          if (ignoreNextMapClick.current) {
            ignoreNextMapClick.current = false;
            return;
          }
          cancelFly();
          map.closePopup();
          setSheet({ kind: "none" });
        });

        map.on("dragstart", () => {
          cancelFly();
        });

        const onFlyMoveEnd = () => {
          const step = flyStepRef.current;
          const m = mapRef.current;
          if (!m || step === "idle") return;

          if (step === "out" && flyPanRef.current) {
            flyStepRef.current = "pan";
            const pan = flyPanRef.current;
            m.flyTo([pan.lat, pan.lng], pan.zoom, { duration: 0.45 });
            return;
          }
          if (step === "pan" && flyInRef.current) {
            flyStepRef.current = "in";
            const fin = flyInRef.current;
            m.flyTo([fin.lat, fin.lng], fin.zoom, { duration: 0.38 });
            return;
          }
          if (step === "in") {
            flyStepRef.current = "idle";
            flyPanRef.current = null;
            flyInRef.current = null;
          }
        };
        map.on("moveend", onFlyMoveEnd);

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
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      flyStepRef.current = "idle";
      flyPanRef.current = null;
      flyInRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      overlayRef.current = null;
      listingMarkersRef.current.clear();
      clusterMarkersRef.current.clear();
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

  // Reuse Leaflet markers. Rebuilding layers closed the listing popup.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    const overlay = overlayRef.current;
    const L = leafletRef.current;
    if (!map || !layer || !L || !mapReady) return;

    type SkounMarker = LeafletMarker & {
      _skounKey?: string;
      _skounHtml?: string;
      _skounCluster?: Extract<VisibleMapFeature, { kind: "cluster" }>;
      _skounGroup?: MapPinGroup;
    };

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
      mapRef.current?.flyTo([feature.lat, feature.lng], feature.expansionZoom, {
        duration: reduceMotion ? 0 : 0.45,
      });
    }

    if (universityMode) {
      for (const campus of campuses) {
        const key = `campus:${campus.slug}`;
        seenListings.add(key);
        if (listingMarkers.has(key)) continue;
        const campusMarker = L.marker([campus.lat, campus.lng], {
          icon: campusPinIcon(L),
          interactive: false,
          keyboard: false,
        });
        campusMarker.addTo(layer);
        listingMarkers.set(key, campusMarker);
      }
    }

    for (const feature of visibleFeatures) {
      if (feature.kind === "cluster") {
        seenClusters.add(feature.clusterId);
        const size = clusterBubbleSize(feature.pointCount);
        const iconKey = `${feature.pointCount}:${feature.lat.toFixed(5)}:${feature.lng.toFixed(5)}`;
        const existing = clusterMarkers.get(feature.clusterId) as
          | SkounMarker
          | undefined;
        if (existing) {
          existing._skounCluster = feature;
          const ll = existing.getLatLng();
          if (ll.lat !== feature.lat || ll.lng !== feature.lng) {
            existing.setLatLng([feature.lat, feature.lng]);
          }
          if (existing._skounKey !== iconKey) {
            existing.setIcon(clusterBubbleIcon(L, feature.pointCount, size));
            existing._skounKey = iconKey;
          }
          continue;
        }
        const marker = L.marker([feature.lat, feature.lng], {
          icon: clusterBubbleIcon(L, feature.pointCount, size),
          riseOnHover: true,
          zIndexOffset: 200,
        }) as SkounMarker;
        marker._skounKey = iconKey;
        marker._skounCluster = feature;
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          const next = marker._skounCluster;
          if (next) expandCluster(next);
        });
        marker.addTo(layer);
        clusterMarkers.set(feature.clusterId, marker);
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
      const existing = listingMarkers.get(group.id) as SkounMarker | undefined;
      if (existing) {
        existing._skounGroup = group;
        if (existing._skounKey !== iconKey) {
          existing.setIcon(pricePinIcon(L, label, selected));
          existing.setZIndexOffset(selected ? 1000 : 0);
          existing._skounKey = iconKey;
        }
        const html = amberPopupHtml(group);
        if (existing._skounHtml !== html) {
          existing.setPopupContent(html);
          existing._skounHtml = html;
        }
        return;
      }
      const marker = L.marker([group.lat, group.lng], {
        icon: pricePinIcon(L, label, selected),
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0,
      }) as SkounMarker;
      const html = amberPopupHtml(group);
      marker._skounKey = iconKey;
      marker._skounHtml = html;
      marker._skounGroup = group;
      bindAmberPopup(
        marker,
        html,
        () => {
          const next = marker._skounGroup;
          if (next) openGroup(next);
          const popup = marker.getPopup();
          if (!popup) return;
          const listing = next?.listings[0];
          const map = mapRef.current;
          if (
            universityModeRef.current &&
            map &&
            listing &&
            listing.lat != null &&
            listing.lng != null
          ) {
            const campus = resolveNearestCampus(listing, campusesRef.current);
            if (campus) {
              applyAmberPopupSide(
                popup,
                resolveUniPopupSide(map, listing, campus),
              );
              flyStepRef.current = "idle";
              flyPanRef.current = null;
              flyInRef.current = null;
              const currentZoom = map.getZoom();
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
              const animate = !reduceMotionRef.current;
              if (nextZoom > currentZoom) {
                map.flyTo([listing.lat, listing.lng], nextZoom, {
                  animate,
                  duration: PIN_SELECT_ZOOM_IN_S,
                });
              } else {
                map.panTo([listing.lat, listing.lng], {
                  animate,
                  duration: PIN_SELECT_PAN_S,
                });
              }
              return;
            }
          }
          applyAmberPopupSide(popup, "n");
        },
        () => {
          setSheet({ kind: "none" });
        },
      );
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
      });
      marker.addTo(layer);
      listingMarkers.set(group.id, marker);
    }

    for (const [id, marker] of listingMarkers) {
      if (seenListings.has(id)) continue;
      marker.remove();
      listingMarkers.delete(id);
    }
    for (const [id, marker] of clusterMarkers) {
      if (seenClusters.has(id)) continue;
      marker.remove();
      clusterMarkers.delete(id);
    }

    overlay?.clearLayers();
    const lineCampus = resolveNearestCampus(selectedListing, campuses);
    if (universityMode && overlay && lineCampus && selectedListing) {
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
      line.addTo(overlay);

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
        const badgePos = distanceBadgeLatLng(
          map,
          lineCampus,
          selectedListing,
          distLabel,
        );
        L.marker([badgePos.lat, badgePos.lng], {
          icon: distanceBadgeIcon(L, distLabel),
          interactive: false,
          keyboard: false,
        }).addTo(overlay);
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
