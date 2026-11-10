import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { GeneralLoadingBlock } from "@/components/common/GeneralLoadingBlock";
import { LText } from "@/components/lister/Typography";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Studently } from "@/constants/theme";
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
  groupListingsByPlace,
  type MapPinGroup,
} from "@/lib/mapPinGroups";
import { useWalkingRoute } from "@/features/listings/useWalkingRoute";
import { MAP_TOKEN_MISSING_COPY } from "@/lib/mapboxEnv";
import { getWebMapPinRendererSelection, markWebMapPinRenderer } from "@/lib/webMapPinRenderer.web";
import { WebMapLayerRenderer } from "@/lib/webMapLayers.web";
import { WebMapCamera, type WebCameraIntent } from "@/lib/webMapCamera.web";
import { highlightedPinPopupOffset } from "@/lib/webMapPinImages.web";
import { useStableWebMapCampuses, useStableWebMapListings, webMapIdentityKey } from "@/lib/webMapData.web";
import {
  amberPopupHtml,
  applyAmberPopupSide,
  bindAmberPopup,
  campusPinHtml,
  clusterBubbleHtml,
  createAmberPopup,
  createStudentlyMap,
  destroyStudentlyMap,
  dismissAmberPopupsOnMap,
  distanceBadgeHtml,
  distanceBadgeOnPath,
  loadMapbox,
  makeMarker,
  pricePinHtml,
  resolveUniPopupSide,
  setCampusRoute,
  setAmberPopupHtml,
  toLngLat,
  type AmberPopupSide,
  type MapboxGL,
  type MapboxMap,
  type Marker,
  type Popup,
} from "@/lib/studentlyMapbox.web";
import { CampusOffscreenArrow } from "@/components/listings/CampusOffscreenArrow";
import { campusPinLabel, CAMPUS_SWITCH_PROMPT } from "@/lib/campusPinLabel";
import {
  OFFSCREEN_BEACON_SIZE,
  offscreenBeaconRect,
  offscreenEdgeBeacon,
  sameOffscreenBeacon,
  type AvoidRect,
  type OffscreenBeacon,
} from "@/lib/offscreenBeacon";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useBreakpoint } from "@/lib/breakpoints";
import { MobileMapSelection } from "@/components/listings/MobileMapSelection.web";
import type { CampusMeta, Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
  campuses: CampusMeta[];
  universityMode?: boolean;
  loading?: boolean;
  /** Geographic search intent only; property filters/results cannot refit. */
  mapLocationKey?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  fillContainer?: boolean;
  onCarouselOpenChange?: (open: boolean) => void;
  onOpenListing?: (listing: Listing) => void;
  hoveredListingId?: string | null;
  /** Sidebar hover that passed the commit ring — drives uni-mode camera. */
  hoverFlyListingId?: string | null;
  onHoverFlyComplete?: () => void;
  /** Picked campus — fly camera here (zoom-out / pan / zoom-in). */
  focusCampusSlug?: string | null;
  /** Area / suggestion center — pan map (browse search). */
  focusPoint?: { lat: number; lng: number } | null;
  /** When pane is shown after keep-alive hide, trigger resize. */
  active?: boolean;
  /** Confirm switch from an unselected campus pin. */
  onSelectCampus?: (campus: CampusMeta) => void;
};

type MarkerRec = {
  marker: Marker;
  key?: string;
  html?: string;
  cluster?: Extract<VisibleMapFeature, { kind: "cluster" }>;
  group?: MapPinGroup;
  popup?: Popup;
  popupOnOpen?: (popup: Popup) => void;
  popupOnClose?: () => void;
  campusBound?: boolean;
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
const HOVER_CAM_LOCK_MS = 600;
const HOVER_ZOOM_OUT_DELTA = 1.25;
const HOVER_ZOOM_OUT_MS = 650;
const HOVER_ZOOM_IN_MS = 700;
const HOVER_ZOOM_OUT_MIN = 8;

function pinSelectZoomForCampusDistance(meters: number): number {
  if (meters >= CAMPUS_ZOOM_BOOST_START_M) return PIN_SELECT_MIN_ZOOM;
  if (meters <= CAMPUS_ZOOM_BOOST_FULL_M) return PIN_SELECT_NEAR_ZOOM;
  const t =
    (CAMPUS_ZOOM_BOOST_START_M - meters) /
    (CAMPUS_ZOOM_BOOST_START_M - CAMPUS_ZOOM_BOOST_FULL_M);
  return PIN_SELECT_MIN_ZOOM + t * (PIN_SELECT_NEAR_ZOOM - PIN_SELECT_MIN_ZOOM);
}

/** Zoom out enough that current view + dest pin both fit; nearby pins still get a small pullback. */
function mapHasSize(map: MapboxMap): boolean {
  const el = map.getContainer?.();
  return Boolean(el && el.clientWidth > 8 && el.clientHeight > 8);
}

function hoverOutZoom(
  map: MapboxMap,
  gl: MapboxGL,
  dest: [number, number],
): number {
  const current = map.getZoom();
  const minPullback = current - HOVER_ZOOM_OUT_DELTA;
  if (
    !Number.isFinite(dest[0]) ||
    !Number.isFinite(dest[1]) ||
    !mapHasSize(map)
  ) {
    return Math.max(HOVER_ZOOM_OUT_MIN, minPullback);
  }
  try {
    const view = map.getBounds();
    let fitZoom = current;
    if (view) {
      const span = new gl.LngLatBounds(view.getSouthWest(), view.getNorthEast());
      span.extend(dest);
      const el = map.getContainer();
      const pad = Math.min(
        72,
        Math.max(8, Math.floor(Math.min(el.clientWidth, el.clientHeight) / 6)),
      );
      const fitted = map.cameraForBounds(span, {
        padding: pad,
        maxZoom: current,
      });
      if (typeof fitted?.zoom === "number") fitZoom = fitted.zoom;
    }
    return Math.max(HOVER_ZOOM_OUT_MIN, Math.min(minPullback, fitZoom));
  } catch {
    return Math.max(HOVER_ZOOM_OUT_MIN, minPullback);
  }
}

function flyZoomOutPanIn(
  map: MapboxMap,
  gl: MapboxGL | null,
  dest: [number, number],
  targetZoom: number,
  reduceMotion: boolean,
  intent: WebCameraIntent,
): void {
  if (!Number.isFinite(dest[0]) || !Number.isFinite(dest[1])) return;
  if (reduceMotion || !mapHasSize(map)) {
    try {
      intent.run([(eventData) => map.easeTo({
        center: dest,
        zoom: targetZoom,
        duration: reduceMotion ? 0 : 420,
      }, eventData)]);
    } catch {
      /* map not ready */
    }
    return;
  }
  const outZoom = gl
    ? hoverOutZoom(map, gl, dest)
    : Math.max(HOVER_ZOOM_OUT_MIN, map.getZoom() - HOVER_ZOOM_OUT_DELTA);
  intent.run([
    (data) => map.easeTo({ zoom: outZoom, duration: HOVER_ZOOM_OUT_MS }, data),
    (data) => map.easeTo({ center: dest, duration: PIN_SELECT_PAN_MS }, data),
    (data) => map.easeTo({ center: dest, zoom: targetZoom, duration: HOVER_ZOOM_IN_MS }, data),
  ]);
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
  listings: incomingListings,
  campuses: incomingCampuses,
  universityMode = false,
  loading,
  mapLocationKey = "initial",
  expanded = false,
  onExpandedChange,
  fillContainer = false,
  onCarouselOpenChange,
  hoveredListingId = null,
  hoverFlyListingId = null,
  onHoverFlyComplete,
  focusCampusSlug = null,
  focusPoint = null,
  active = true,
  onSelectCampus,
}: Props) {
  const listings = useStableWebMapListings(incomingListings);
  const campuses = useStableWebMapCampuses(incomingCampuses);
  const layerMode = useMemo(() => getWebMapPinRendererSelection().renderer === "layers", []);
  const layerRendererRef = useRef<WebMapLayerRenderer | null>(null);
  const layerActivateGroupRef = useRef<((id: string) => void) | null>(null);
  const layerPopupRef = useRef<{ popup: Popup; groupId: string; html: string; side: AmberPopupSide } | null>(null);
  const mobileWeb = useBreakpoint() !== "desktop";
  const mobileWebRef = useRef(mobileWeb);
  mobileWebRef.current = mobileWeb;
  const changingPopupPresentation = useRef(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const cameraRef = useRef<WebMapCamera | null>(null);
  const focusIntentRef = useRef<{ key: string; intent: WebCameraIntent; started: boolean } | null>(null);
  const fitIntentKeyRef = useRef<string | null>(null);
  const mapboxRef = useRef<MapboxGL | null>(null);
  const clusterIndexRef = useRef<PinClusterIndex | null>(null);
  const listingMarkersRef = useRef<Map<string, MarkerRec>>(new Map());
  const clusterMarkersRef = useRef<Map<number, MarkerRec>>(new Map());
  const overlayBadgeRef = useRef<Marker | null>(null);
  const ignoreNextMapClickUntil = useRef(0);
  const stickyPreviewListingIdRef = useRef<string | null>(null);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const universityModeRef = useRef(universityMode);
  universityModeRef.current = universityMode;
  const campusesRef = useRef(campuses);
  campusesRef.current = campuses;
  const walkingPathRef = useRef<{
    listingId: string;
    coords: { lat: number; lng: number }[];
  } | null>(null);
  const uniCameraRanForListingRef = useRef<string | null>(null);
  const pathSideAppliedForRef = useRef<string | null>(null);
  const hoverCamLockUntilRef = useRef(0);
  const onHoverFlyCompleteRef = useRef(onHoverFlyComplete);
  onHoverFlyCompleteRef.current = onHoverFlyComplete;
  const onSelectCampusRef = useRef(onSelectCampus);
  onSelectCampusRef.current = onSelectCampus;
  const focusCampusSlugRef = useRef(focusCampusSlug);
  focusCampusSlugRef.current = focusCampusSlug;
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const heightAnim = useRef(new Animated.Value(MAP_HEIGHT_COLLAPSED)).current;

  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [mobileCardInset, setMobileCardInset] = useState(0);
  const [pendingCampusSlug, setPendingCampusSlug] = useState<string | null>(
    null,
  );
  /** Survives brief sheet flicker during zoom/popup replace — drives walking route. */
  const [routeListingId, setRouteListingId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<VisibleMapFeature[]>(
    [],
  );
  const [campusBeacon, setCampusBeacon] = useState<OffscreenBeacon | null>(
    null,
  );
  const [listingBeacon, setListingBeacon] = useState<OffscreenBeacon | null>(
    null,
  );
  const sheetKindRef = useRef(sheet.kind);
  sheetKindRef.current = sheet.kind;
  const fillContainerRef = useRef(fillContainer);
  fillContainerRef.current = fillContainer;

  function dismissPreview(cancelCamera = true) {
    if (cancelCamera) cameraRef.current?.cancel();
    const map = mapRef.current;
    layerPopupRef.current = null;
    if (map) dismissAmberPopupsOnMap(map);
    stickyPreviewListingIdRef.current = null;
    uniCameraRanForListingRef.current = null;
    pathSideAppliedForRef.current = null;
    setRouteListingId(null);
    setSheet({ kind: "none" });
    setPendingCampusSlug(null);
  }

  useEffect(() => {
    window._studentlyDismissPreview = dismissPreview;
    return () => {
      window._studentlyDismissPreview = null;
    };
  }, []);

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
    if (!active || !mapReady) return;
    // Let the kept-alive pane's visible layout commit before measuring Mapbox.
    const frame = requestAnimationFrame(() => mapRef.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [active, mapReady]);

  useEffect(() => {
    if (!active && mobileWeb) dismissPreview();
    // Desktop keeps its existing preview behavior while parked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mobileWeb]);

  useEffect(() => {
    if (!active) cameraRef.current?.cancel();
  }, [active]);

  useEffect(() => {
    if (!mobileWeb || !active || sheet.kind !== "preview") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissPreview();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileWeb, active, sheet.kind]);

  const mappable = useMemo(() => listings.filter(hasCoords), [listings]);
  const mappableRef = useRef(mappable);
  mappableRef.current = mappable;
  const hoveredIdRef = useRef(hoveredListingId);
  hoveredIdRef.current = hoveredListingId;
  const hoverFlyIdRef = useRef(hoverFlyListingId);
  hoverFlyIdRef.current = hoverFlyListingId;

  const groups = useMemo(
    () => groupListingsByPlace(mappable),
    [mappable],
  );
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

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
    const id =
      sheet.kind === "preview" ? sheet.listingId : routeListingId;
    if (!id) return null;
    return mappable.find((l) => l.id === id) ?? null;
  }, [sheet, mappable, routeListingId]);
  const selectedListingRef = useRef(selectedListing);
  selectedListingRef.current = selectedListing;

  const walkingCampus = useMemo(
    () => resolveNearestCampus(selectedListing, campuses),
    [selectedListing, campuses],
  );

  const walkingRoute = useWalkingRoute({
    enabled: Boolean(universityMode && routeListingId),
    listingId: routeListingId,
    campusSlug: walkingCampus?.slug ?? null,
    from: walkingCampus
      ? { lng: walkingCampus.lng, lat: walkingCampus.lat }
      : null,
    to:
      selectedListing?.lng != null && selectedListing.lat != null
        ? { lng: selectedListing.lng, lat: selectedListing.lat }
        : null,
  });

  const activeGroupId = useMemo(() => {
    const listingId =
      routeListingId ??
      (sheet.kind === "preview" ? sheet.listingId : null) ??
      hoveredListingId;
    if (!listingId) return null;
    for (const g of groups) {
      if (g.listings.some((l) => l.id === listingId)) return g.id;
    }
    return null;
  }, [sheet, groups, hoveredListingId, routeListingId]);

  const listingIdsKey = useMemo(
    () => webMapIdentityKey(mappable.map((l) => l.id)),
    [mappable],
  );

  const campusesKey = useMemo(
    () => webMapIdentityKey(campuses.map((c) => c.slug)),
    [campuses],
  );

  useEffect(() => {
    cameraRef.current?.cancelKinds("hover", "selection", "cluster");
    dismissPreview(false);
    walkingPathRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- membership reset only
  }, [listingIdsKey, campusesKey, universityMode]);

  const sheetOpen = sheet.kind !== "none";
  const mobileGroup = mobileWeb && sheet.kind === "preview"
    ? groups.find((group) => group.listings.some((listing) => listing.id === sheet.listingId)) ?? null
    : null;

  useEffect(() => {
    onCarouselOpenChange?.(sheetOpen);
  }, [sheetOpen, onCarouselOpenChange]);

  useEffect(() => {
    const camera = cameraRef.current;
    const map = mapRef.current;
    if (!mapReady || !active || !camera || !map) return;
    const id = universityMode ? hoverFlyListingId : hoveredListingId;
    // A new card must finish its own commit ring before starting a uni flight.
    if (!id || (universityMode && id !== hoveredListingId)) return;
    if (!universityMode && sheetKindRef.current === "preview") return;
    const intent = camera.begin("hover", () => {
      if (universityMode && hoveredIdRef.current === id && hoverFlyIdRef.current === id) onHoverFlyCompleteRef.current?.();
    });
    const run = () => {
      const listing = mappableRef.current.find((item) => item.id === id);
      if (!listing) { intent.cancel(); return; }
      if (universityMode) {
        dismissPreview(false);
        const campus = resolveNearestCampus(listing, campusesRef.current);
        const target = campus ? pinSelectZoomForCampusDistance(listing.distanceMeters ?? calculateDistanceMeters(campus.lat, campus.lng, listing.lat, listing.lng)) : PIN_SELECT_MIN_ZOOM;
        flyZoomOutPanIn(map, mapboxRef.current, toLngLat(listing), target, reduceMotionRef.current, intent);
        return;
      }
      if (sheetKindRef.current === "preview") { intent.cancel(); return; }
      const wait = hoverCamLockUntilRef.current - Date.now();
      if (wait > 0) { intent.after(wait, run); return; }
      if (map.getBounds()?.contains(toLngLat(listing))) { intent.run([]); return; }
      intent.run([(data) => map.easeTo({ center: toLngLat(listing), duration: reduceMotionRef.current ? 0 : 400 }, data)]);
    };
    if (universityMode) run();
    else intent.after(80, run);
    return () => intent.cancel();
    // Camera requests follow hover identity, not refreshed listing objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredListingId, hoverFlyListingId, mapReady, universityMode, active]);

  const focusCampus = useMemo(
    () => campuses.find((c) => c.slug === focusCampusSlug) ?? null,
    [campuses, focusCampusSlug],
  );
  const beaconCampus = universityMode ? (focusCampus ?? campuses[0] ?? null) : null;
  const focusKey = universityMode && focusCampusSlug ? JSON.stringify([mapLocationKey, "campus", focusCampusSlug])
    : !focusCampusSlug && focusPoint ? JSON.stringify([mapLocationKey, "point", focusPoint.lng, focusPoint.lat]) : null;

  useEffect(() => {
    if (!focusKey) { focusIntentRef.current?.intent.cancel(); focusIntentRef.current = null; return; }
    const map = mapRef.current;
    const camera = cameraRef.current;
    if (!mapReady || !active || !map || !camera) return;
    let request = focusIntentRef.current;
    if (!request || request.key !== focusKey) {
      request = { key: focusKey, intent: camera.begin("focus"), started: false };
      focusIntentRef.current = request;
    }
    if (request.started || !request.intent.isCurrent()) return;
    const dest: [number, number] | null = universityMode && focusCampus ? toLngLat(focusCampus)
      : focusPoint ? [focusPoint.lng, focusPoint.lat] : null;
    if (!dest || !dest.every(Number.isFinite)) return;
    request.started = true;
    flyZoomOutPanIn(map, mapboxRef.current, dest, universityMode ? PIN_SELECT_MIN_ZOOM : 13.5, reduceMotionRef.current, request.intent);
    // A campus metadata/coordinate refresh is not another campus-pick intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, active, focusKey, Boolean(focusCampus)]);

  useEffect(() => {
    setPendingCampusSlug(null);
  }, [focusCampusSlug, universityMode]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    markWebMapPinRenderer(el);

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

        const map = createStudentlyMap(mapboxgl, hostRef.current, center, 12);
        if (!map) {
          if (!cancelled) setTokenMissing(true);
          return;
        }
        mapRef.current = map;
        cameraRef.current = new WebMapCamera(map);
        focusIntentRef.current = null;
        fitIntentKeyRef.current = null;
        mapboxRef.current = mapboxgl;

        map.on("click", (e) => {
          const target = e.originalEvent?.target;
          if (
            target instanceof Element &&
            target.closest(
              ".studently-marker-el, .mapboxgl-ctrl, .studently-amber-popup-card, .studently-popup-close-btn",
            )
          ) {
            return;
          }
          const layerHit = layerRendererRef.current?.pick(e.point, mobileWebRef.current ? 8 : 0);
          if (layerHit) {
            ignoreNextMapClickUntil.current = Date.now() + 250;
            if (layerHit.kind === "cluster") {
              const intent = cameraRef.current?.begin("cluster");
              layerRendererRef.current?.expandCluster(layerHit, reduceMotionRef.current, (center, zoom) => {
                intent?.run([(data) => map.easeTo({ center, zoom, duration: reduceMotionRef.current ? 0 : 450 }, data)]);
              });
            }
            else layerActivateGroupRef.current?.(layerHit.groupId);
            return;
          }
          if (Date.now() < ignoreNextMapClickUntil.current) {
            return;
          }
          window._studentlyDismissPreview?.();
        });

        const onViewport = () => {
          if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
          moveTimerRef.current = setTimeout(() => {
            const m = mapRef.current;
            const index = clusterIndexRef.current;
            const path = walkingPathRef.current;
            const badge = overlayBadgeRef.current;
            if (m && path && path.coords.length >= 2 && badge) {
              const recomputed = distanceBadgeOnPath(m, path.coords, badge.getElement().textContent ?? "");
              if (recomputed) {
                badge.setLngLat([recomputed.lng, recomputed.lat]);
              }
            }
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
      cameraRef.current?.destroy();
      cameraRef.current = null;
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      for (const rec of listingMarkersRef.current.values()) rec.marker.remove();
      for (const rec of clusterMarkersRef.current.values()) rec.marker.remove();
      listingMarkersRef.current.clear();
      clusterMarkersRef.current.clear();
      layerActivateGroupRef.current = null;
      layerPopupRef.current = null;
      layerRendererRef.current?.destroy();
      layerRendererRef.current = null;
      overlayBadgeRef.current?.remove();
      overlayBadgeRef.current = null;
      destroyStudentlyMap(mapRef.current);
      mapRef.current = null;
      mapboxRef.current = null;
      setMapReady(false);
      setVisibleFeatures([]);
      setCampusBeacon(null);
      setListingBeacon(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- client init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!layerMode || !mapReady || !map) return;
    const renderer = new WebMapLayerRenderer(map);
    layerRendererRef.current = renderer;
    const onMove = (event: { point: { x: number; y: number } }) => {
      map.getCanvas().style.cursor = renderer.pick(event.point) ? "pointer" : "";
    };
    const onLeave = () => { map.getCanvas().style.cursor = ""; };
    map.on("mousemove", onMove);
    map.on("mouseout", onLeave);
    return () => {
      map.off("mousemove", onMove);
      map.off("mouseout", onLeave);
      renderer.destroy();
      layerRendererRef.current = null;
    };
  }, [layerMode, mapReady]);

  useEffect(() => {
    layerRendererRef.current?.updateGroups(groups);
  }, [groups, layerMode, mapReady]);

  useEffect(() => {
    // Highlight and ordinary suppression change state, never either source's data.
    layerRendererRef.current?.setActiveGroup(activeGroupId);
  }, [activeGroupId, layerMode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      setCampusBeacon(null);
      setListingBeacon(null);
      return;
    }

    let raf = 0;
    const sync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const live = mapRef.current;
        if (!live) {
          setCampusBeacon((prev) => (prev ? null : prev));
          setListingBeacon((prev) => (prev ? null : prev));
          return;
        }
        const el = live.getContainer();
        const w = el.clientWidth;
        // Pins behind the bottom card need an arrow above the card, too.
        const h = mobileWeb && mobileCardInset > 0
          ? Math.max(60, el.clientHeight - mobileCardInset - 12)
          : el.clientHeight;
        const fill = fillContainerRef.current;
        const chromeAvoid: AvoidRect[] = fill
          ? [
              { left: w - 160, top: 0, right: w, bottom: 64 },
              { left: w - 72, top: 48, right: w, bottom: 236 },
            ]
          : [{ left: w - 62, top: 0, right: w, bottom: 58 }];
        const beaconOpts = {
          size: OFFSCREEN_BEACON_SIZE,
          hideInset: 12,
          pad: { top: 16, left: 14, bottom: 26, right: 14 },
        };

        let campusNext: OffscreenBeacon | null = null;
        if (!universityModeRef.current) {
          setCampusBeacon((prev) => (prev ? null : prev));
        } else {
          const list = campusesRef.current;
          const slug = focusCampusSlugRef.current;
          const campus =
            (slug ? list.find((c) => c.slug === slug) : null) ??
            list[0] ??
            null;
          if (!campus) {
            setCampusBeacon((prev) => (prev ? null : prev));
          } else {
            const pt = live.project(toLngLat(campus));
            campusNext = offscreenEdgeBeacon(
              { x: pt.x, y: pt.y },
              { width: w, height: h },
              { ...beaconOpts, avoid: chromeAvoid },
            );
            setCampusBeacon((prev) =>
              sameOffscreenBeacon(prev, campusNext) ? prev : campusNext,
            );
          }
        }

        const listing = selectedListingRef.current;
        if (listing?.lat == null || listing.lng == null) {
          setListingBeacon((prev) => (prev ? null : prev));
          return;
        }
        const listingPt = live.project(toLngLat(listing));
        const listingNext = offscreenEdgeBeacon(
          { x: listingPt.x, y: listingPt.y },
          { width: w, height: h },
          {
            ...beaconOpts,
            avoid: campusNext
              ? [...chromeAvoid, offscreenBeaconRect(campusNext)]
              : chromeAvoid,
          },
        );
        setListingBeacon((prev) =>
          sameOffscreenBeacon(prev, listingNext) ? prev : listingNext,
        );
      });
    };

    map.on("move", sync);
    map.on("resize", sync);
    sync();
    return () => {
      map.off("move", sync);
      map.off("resize", sync);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [
    mapReady,
    universityMode,
    focusCampusSlug,
    campusesKey,
    selectedListing?.id,
    selectedListing?.lat,
    selectedListing?.lng,
    mobileWeb,
    mobileCardInset,
  ]);

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
      ignoreNextMapClickUntil.current = Date.now() + 80;
      const listing = group.listings[0];
      if (!listing) return;
      stickyPreviewListingIdRef.current = listing.id;
      setRouteListingId(listing.id);
      setSheet((prev) =>
        prev.kind === "preview" && prev.listingId === listing.id
          ? prev
          : { kind: "preview", listingId: listing.id },
      );
    }

    function expandCluster(
      feature: Extract<VisibleMapFeature, { kind: "cluster" }>,
    ) {
      ignoreNextMapClickUntil.current = Date.now() + 80;
      const live = mapRef.current;
      if (!live) return;
      cameraRef.current?.begin("cluster").run([(data) => live.easeTo({
        center: [feature.lng, feature.lat],
        zoom: feature.expansionZoom,
        duration: reduceMotion ? 0 : 450,
      }, data)]);
    }

    if (universityMode) {
      const canSwitchCampuses =
        campuses.length > 1 && Boolean(onSelectCampusRef.current);

      function bindCampusMarker(marker: Marker, slug: string) {
        const onCampusActivate = (e: Event) => {
          e.stopPropagation();
          ignoreNextMapClickUntil.current = Date.now() + 250;
          const action = (e.target as Element | null)
            ?.closest("[data-campus-switch]")
            ?.getAttribute("data-campus-switch");
          const campus = campusesRef.current.find((c) => c.slug === slug);
          const canSwitch =
            campusesRef.current.length > 1 &&
            Boolean(onSelectCampusRef.current);
          if (action === "cancel") {
            setPendingCampusSlug(null);
            return;
          }
          if (action === "confirm") {
            if (campus) onSelectCampusRef.current?.(campus);
            setPendingCampusSlug(null);
            return;
          }
          if (!canSwitch || slug === focusCampusSlugRef.current) {
            return;
          }
          setPendingCampusSlug(slug);
        };
        const el = marker.getElement();
        el.addEventListener("click", onCampusActivate);
        el.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          if ((e.target as Element).closest("[data-campus-switch]")) return;
          e.preventDefault();
          onCampusActivate(e);
        });
      }

      for (const campus of campuses) {
        if (!Number.isFinite(campus.lat) || !Number.isFinite(campus.lng)) {
          continue;
        }
        const key = `campus:${campus.slug}`;
        seenListings.add(key);
        const selected = campus.slug === focusCampusSlug;
        const clickable = canSwitchCampuses && !selected;
        const pending = pendingCampusSlug === campus.slug && clickable;
        const html = campusPinHtml(campusPinLabel(campus), selected, {
          pending,
          clickable,
        });
        const existing = listingMarkers.get(key);
        if (existing) {
          existing.marker.setLngLat(toLngLat(campus));
          if (existing.html !== html) {
            existing.marker.getElement().innerHTML = html;
            existing.html = html;
          }
          const el = existing.marker.getElement();
          el.classList.toggle("inert", !clickable);
          el.style.zIndex = selected || pending ? "900" : "2";
          if (clickable && !pending) {
            el.setAttribute("role", "button");
            el.setAttribute(
              "aria-label",
              `Switch campus to ${campusPinLabel(campus)}`,
            );
            el.tabIndex = 0;
          } else if (clickable && pending) {
            el.removeAttribute("role");
            el.setAttribute("aria-label", CAMPUS_SWITCH_PROMPT);
            el.tabIndex = -1;
          } else {
            el.removeAttribute("role");
            el.removeAttribute("aria-label");
            el.tabIndex = -1;
          }
          if (!existing.campusBound) {
            bindCampusMarker(existing.marker, campus.slug);
            existing.campusBound = true;
          }
          continue;
        }
        const campusMarker = makeMarker(gl, html, campus, {
          inert: !clickable,
          zIndex: selected || pending ? 900 : 2,
        });
        const el = campusMarker.getElement();
        if (clickable && !pending) {
          el.setAttribute("role", "button");
          el.setAttribute(
            "aria-label",
            `Switch campus to ${campusPinLabel(campus)}`,
          );
          el.tabIndex = 0;
        }
        bindCampusMarker(campusMarker, campus.slug);
        campusMarker.addTo(hostMap);
        listingMarkers.set(key, {
          marker: campusMarker,
          key,
          html,
          campusBound: true,
        });
      }
    }

    layerActivateGroupRef.current = layerMode ? (id) => {
      cameraRef.current?.cancel();
      const group = groupsById.get(id);
      if (!group) return;
      openGroup(group);
      const listing = group.listings[0];
      if (!listing) return;
      const campus = universityModeRef.current ? resolveNearestCampus(listing, campusesRef.current) : null;
      // Preserve the existing click camera rules. Popup/data effects never fly.
      if (!mobileWebRef.current && (!campus || uniCameraRanForListingRef.current === listing.id)) return;
      const currentZoom = hostMap.getZoom();
      const targetZoom = campus ? pinSelectZoomForCampusDistance(listing.distanceMeters ?? calculateDistanceMeters(campus.lat, campus.lng, group.lat, group.lng)) : currentZoom;
      const nextZoom = Math.max(currentZoom, targetZoom);
      uniCameraRanForListingRef.current = listing.id;
      hoverCamLockUntilRef.current = Date.now() + HOVER_CAM_LOCK_MS;
      cameraRef.current?.begin("selection").run([(data) => hostMap.easeTo({
        center: toLngLat(group), zoom: nextZoom,
        ...(mobileWebRef.current ? { offset: [0, -hostMap.getContainer().clientHeight * 0.18] as [number, number] } : {}),
        duration: reduceMotionRef.current ? 0 : mobileWebRef.current ? PIN_SELECT_PAN_MS : nextZoom > currentZoom ? PIN_SELECT_ZOOM_IN_MS : PIN_SELECT_PAN_MS,
      }, data)]);
    } : null;

    for (const feature of layerMode ? [] : visibleFeatures) {
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

    if (!layerMode && activeGroupId) {
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
          if (existing.popup) setAmberPopupHtml(existing.popup, html);
          existing.html = html;
        }
        return;
      }
      const marker = makeMarker(gl, pricePinHtml(label, selected), group, {
        zIndex: selected ? 1000 : 1,
      });
      const html = amberPopupHtml(group);
      const rec: MarkerRec = { marker, key: iconKey, html, group };
      rec.popupOnClose = () => {
        if (changingPopupPresentation.current) return;
        uniCameraRanForListingRef.current = null;
        pathSideAppliedForRef.current = null;
        // Do NOT clear sticky here — false closes during popup replace/zoom
        // were wiping the walking line. Sticky clears only via dismiss.
        setSheet({ kind: "none" });
      };
      rec.popupOnOpen = (popup) => {
        const next = rec.group;
        if (next) openGroup(next);
        const listing = next?.listings[0];
        const liveMap = mapRef.current;
        const liveGl = mapboxRef.current;
        const liveHtml = rec.html ?? html;
        if (!liveMap || !liveGl) return;
        const ctx = {
          mapboxgl: liveGl,
          map: liveMap,
          marker: rec.marker,
          html: liveHtml,
          onOpen: rec.popupOnOpen,
          onClose: rec.popupOnClose,
        };
        if (
          universityModeRef.current &&
          listing &&
          listing.lat != null &&
          listing.lng != null
        ) {
          const campus = resolveNearestCampus(listing, campusesRef.current);
          if (campus) {
            const path =
              walkingPathRef.current?.listingId === listing.id
                ? walkingPathRef.current.coords
                : null;
            if (pathSideAppliedForRef.current === listing.id) {
              // Path-side effect already applied — skip replace during easeTo.
            } else {
              const nextPopup = applyAmberPopupSide(
                ctx,
                popup,
                resolveUniPopupSide(liveMap, listing, campus, path),
              );
              rec.popup = nextPopup;
              if (path && path.length >= 2) {
                pathSideAppliedForRef.current = listing.id;
              }
              if (nextPopup !== popup) return;
            }
            if (uniCameraRanForListingRef.current === listing.id) return;
            uniCameraRanForListingRef.current = listing.id;
            hoverCamLockUntilRef.current = Date.now() + HOVER_CAM_LOCK_MS;
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
            cameraRef.current?.begin("selection").run([(data) => liveMap.easeTo({
              center: toLngLat(listing),
              zoom: nextZoom,
              duration,
            }, data)]);
            return;
          }
        }
        rec.popup = applyAmberPopupSide(ctx, popup, "n");
      };
      let bindSide: AmberPopupSide = "n";
      const bindListing = group.listings[0];
      const bindMap = mapRef.current;
      if (
        universityModeRef.current &&
        bindMap &&
        bindListing &&
        bindListing.lat != null &&
        bindListing.lng != null
      ) {
        const campus = resolveNearestCampus(bindListing, campusesRef.current);
        if (campus) {
          const path =
            walkingPathRef.current?.listingId === bindListing.id
              ? walkingPathRef.current.coords
              : null;
          if (path && path.length >= 2) {
            pathSideAppliedForRef.current = bindListing.id;
          }
          bindSide = resolveUniPopupSide(bindMap, bindListing, campus, path);
        }
      }
      if (!mobileWebRef.current) {
        rec.popup = bindAmberPopup(
          gl,
          marker,
          html,
          rec.popupOnOpen,
          rec.popupOnClose,
          bindSide,
        );
      }
      marker.getElement().addEventListener("keydown", (event) => {
        if (!mobileWebRef.current || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        marker.getElement().click();
      });
      marker.getElement().addEventListener("click", (e) => {
        e.stopPropagation();
        cameraRef.current?.cancel();
        ignoreNextMapClickUntil.current = Date.now() + 250;
        const next = rec.group;
        if (!next) return;
        openGroup(next);
        if (mobileWebRef.current) {
          const listing = next.listings[0];
          const map = mapRef.current;
          if (!listing || !map) return;
          const campus = universityModeRef.current
            ? resolveNearestCampus(listing, campusesRef.current)
            : null;
          const targetZoom = campus
            ? pinSelectZoomForCampusDistance(listing.distanceMeters ?? calculateDistanceMeters(campus.lat, campus.lng, next.lat, next.lng))
            : map.getZoom();
          uniCameraRanForListingRef.current = listing.id;
          cameraRef.current?.begin("selection").run([(data) => map.easeTo({
            center: toLngLat(next),
            zoom: Math.max(map.getZoom(), targetZoom),
            offset: [0, -map.getContainer().clientHeight * 0.18],
            duration: reduceMotionRef.current ? 0 : PIN_SELECT_PAN_MS,
          }, data)]);
          return;
        }
        // Prefer marker's live popup — side-replace can stale `rec.popup`.
        const popup =
          (rec.marker.getPopup?.() as Popup | null | undefined) ?? rec.popup;
        if (popup) {
          popup.addTo(hostMap);
          rec.popup = popup;
        }
      });
      marker.addTo(hostMap);
      listingMarkers.set(group.id, rec);
    }

    for (const [id, rec] of listingMarkers) {
      if (seenListings.has(id)) continue;
      // Never drop the open preview pin — prevents popup close wiping sheet/route mid-zoom.
      if (activeGroupId && id === activeGroupId) continue;
      rec.marker.remove();
      listingMarkers.delete(id);
    }
    for (const [id, rec] of clusterMarkers) {
      if (seenClusters.has(id)) continue;
      rec.marker.remove();
      clusterMarkers.delete(id);
    }

  }, [
    mapReady,
    visibleFeatures,
    groupsById,
    campuses,
    universityMode,
    focusCampusSlug,
    pendingCampusSlug,
    activeGroupId,
    reduceMotion,
    layerMode,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const gl = mapboxRef.current;
    if (layerMode || !map || !gl || !mapReady) return;
    for (const rec of listingMarkersRef.current.values()) {
      if (!rec.group || !rec.html) continue;
      const element = rec.marker.getElement();
      if (mobileWeb) {
        // A breakpoint change changes presentation, never the selection.
        changingPopupPresentation.current = true;
        try {
          rec.marker.setPopup(null);
          rec.popup = undefined;
        } finally {
          changingPopupPresentation.current = false;
        }
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", `Show ${rec.group.count} matching unit${rec.group.count === 1 ? "" : "s"} from ${shortPriceLabel(rec.group.displayPriceUsd)}`);
        element.tabIndex = 0;
      } else if (!rec.popup) {
        const listing = rec.group.listings[0];
        const campus = universityMode ? resolveNearestCampus(listing, campuses) : null;
        const side = listing && campus
          ? resolveUniPopupSide(map, listing, campus, walkingPathRef.current?.coords ?? null)
          : "n";
        rec.popup = bindAmberPopup(gl, rec.marker, rec.html, rec.popupOnOpen, rec.popupOnClose, side);
        if (sheet.kind === "preview" && rec.group.listings.some((item) => item.id === sheet.listingId)) {
          rec.popup.addTo(map);
        }
      }
    }
  }, [mobileWeb, mapReady, visibleFeatures, groupsById, sheet, campuses, universityMode, layerMode]);


  useEffect(() => {
    const hostMap = mapRef.current;
    const gl = mapboxRef.current;
    if (!hostMap || !gl || !mapReady) return;

    const clearRouteUi = () => {
      overlayBadgeRef.current?.remove();
      overlayBadgeRef.current = null;
      walkingPathRef.current = null;
      setCampusRoute(hostMap, null);
    };

    // Sticky listing keeps route through brief sheet/popup churn during zoom.
    if (!universityMode) {
      stickyPreviewListingIdRef.current = null;
      clearRouteUi();
      return;
    }
    if (!stickyPreviewListingIdRef.current) {
      clearRouteUi();
      return;
    }

    const stickyId = stickyPreviewListingIdRef.current;
    const listingForRoute =
      selectedListing ??
      (stickyId ? mappable.find((l) => l.id === stickyId) ?? null : null);

    if (
      !walkingCampus ||
      !listingForRoute ||
      listingForRoute.lat == null ||
      listingForRoute.lng == null
    ) {
      // Keep painted route while sheet flickers.
      if (
        stickyId &&
        walkingPathRef.current?.listingId === stickyId
      ) {
        setCampusRoute(hostMap, walkingPathRef.current.coords);
      }
      return;
    }

    const path =
      walkingRoute?.status === "ok" && walkingRoute.coords.length >= 2
        ? walkingRoute.coords
        : null;

    if (!path || walkingRoute?.status !== "ok") {
      if (walkingPathRef.current?.listingId === listingForRoute.id) {
        // Re-assert line if a prior clear wiped the layer while preview stayed open.
        setCampusRoute(hostMap, walkingPathRef.current.coords);
        return;
      }
      clearRouteUi();
      return;
    }

    walkingPathRef.current = {
      listingId: listingForRoute.id,
      coords: path,
    };
    setCampusRoute(hostMap, path);

    const distLabel = formatDistanceShort(walkingRoute.distanceM);
    if (!distLabel) return;
    const badgePos = distanceBadgeOnPath(hostMap, path, distLabel);
    if (!badgePos) {
      overlayBadgeRef.current?.remove();
      overlayBadgeRef.current = null;
      return;
    }
    if (overlayBadgeRef.current) {
      overlayBadgeRef.current.setLngLat([badgePos.lng, badgePos.lat]);
      const html = distanceBadgeHtml(distLabel);
      if (overlayBadgeRef.current.getElement().innerHTML !== html) overlayBadgeRef.current.getElement().innerHTML = html;
    } else {
      const badge = makeMarker(gl, distanceBadgeHtml(distLabel), badgePos, {
        anchor: "center",
        inert: true,
        zIndex: 300,
      });
      badge.addTo(hostMap);
      overlayBadgeRef.current = badge;
    }
  }, [
    mapReady,
    universityMode,
    sheet.kind,
    walkingCampus,
    selectedListing,
    walkingRoute,
    mobileCardInset,
  ]);


  useEffect(() => {
    const map = mapRef.current;
    const gl = mapboxRef.current;
    if (!layerMode || !mapReady || !map || !gl) return;
    if (!active) return; // Keep the parked desktop popup; resolve its side after showing.
    const group = sheet.kind === "preview"
      ? groups.find((item) => item.listings.some((listing) => listing.id === sheet.listingId)) : null;
    const previous = layerPopupRef.current;
    if (mobileWeb || !group) {
      // A presentation handoff must not clear selection or its walking route.
      changingPopupPresentation.current = true;
      layerPopupRef.current = null;
      try { previous?.popup.remove(); } finally { changingPopupPresentation.current = false; }
      return;
    }
    const listing = group.listings[0];
    const campus = universityMode ? resolveNearestCampus(listing, campuses) : null;
    const path = walkingPathRef.current?.listingId === listing?.id ? walkingPathRef.current.coords : null;
    const side = listing && campus ? resolveUniPopupSide(map, listing, campus, path) : "n";
    const label = `${shortPriceLabel(group.displayPriceUsd)}${group.count > 1 ? ` · ${group.count}` : ""}`;
    const offset = highlightedPinPopupOffset(label, side);
    const html = amberPopupHtml(group);
    if (previous?.groupId === group.id && previous.side === side) {
      previous.popup.setLngLat(toLngLat(group)).setOffset(offset);
      if (previous.html !== html) { setAmberPopupHtml(previous.popup, html); previous.html = html; }
      return;
    }
    const popup = createAmberPopup(gl, html, undefined, () => {
      if (changingPopupPresentation.current || layerPopupRef.current?.popup !== popup) return;
      layerPopupRef.current = null;
      dismissPreview();
    }, side).setLngLat(toLngLat(group)).setOffset(offset).addClassName("studently-layer-popup");
    // Publish before addTo: its open handler replaces the old popup under the
    // same permanent replacement/duplicate-close guards as marker mode.
    layerPopupRef.current = { popup, groupId: group.id, html, side };
    popup.addTo(map);
  }, [layerMode, mapReady, mobileWeb, sheet, groups, campuses, universityMode, walkingRoute, active]);

  useEffect(() => {
    if (layerMode || mobileWeb || sheet.kind !== "preview" || !universityMode) return;
    if (walkingRoute?.status !== "ok" || walkingRoute.coords.length < 2) return;
    const listing = selectedListing;
    if (!listing || listing.lat == null || listing.lng == null) return;
    if (pathSideAppliedForRef.current === listing.id) return;
    const campus = walkingCampus;
    const map = mapRef.current;
    const gl = mapboxRef.current;
    if (!campus || !map || !gl) return;

    let rec: MarkerRec | undefined;
    for (const r of listingMarkersRef.current.values()) {
      if (r.group?.listings.some((l) => l.id === listing.id)) {
        rec = r;
        break;
      }
    }
    if (!rec?.popup || !rec.popupOnOpen || !rec.html) return;

    pathSideAppliedForRef.current = listing.id;
    rec.popup = applyAmberPopupSide(
      {
        mapboxgl: gl,
        map,
        marker: rec.marker,
        html: rec.html,
        onOpen: rec.popupOnOpen,
        onClose: rec.popupOnClose,
      },
      rec.popup,
      resolveUniPopupSide(map, listing, campus, walkingRoute.coords),
    );
  }, [
    mapReady,
    universityMode,
    walkingRoute,
    walkingCampus,
    selectedListing,
    sheet.kind,
    mobileWeb,
    layerMode,
  ]);

  const fitKey = mapLocationKey;
  useEffect(() => {
    if (focusCampusSlug || focusPoint) { fitIntentKeyRef.current = null; return; }
    const map = mapRef.current;
    const camera = cameraRef.current;
    if (!mapReady || !active || loading || !map || !camera || fitIntentKeyRef.current === fitKey) return;
    fitIntentKeyRef.current = fitKey;
    // Consume an empty geographic result too: a later property filter must not
    // unexpectedly fit after the user has panned an empty map.
    if (!groupsRef.current.length && !(universityMode && campusesRef.current.length)) return;
    const intent = camera.begin("fit");
    intent.after(expanded ? 320 : 80, () => {
      map.resize();
      if (!mapHasSize(map)) { intent.cancel(); return; }
      const points: [number, number][] = groupsRef.current.map((group) => toLngLat(group));
      if (universityMode) for (const campus of campusesRef.current) {
        if (Number.isFinite(campus.lat) && Number.isFinite(campus.lng)) points.push(toLngLat(campus));
      }
      if (!points.length) { intent.cancel(); return; }
      let [west, south] = points[0];
      let [east, north] = points[0];
      for (const [lng, lat] of points) {
        west = Math.min(west, lng); east = Math.max(east, lng);
        south = Math.min(south, lat); north = Math.max(north, lat);
      }
      intent.run([(data) => {
        if (west === east || south === north) map.easeTo({ center: [west, south], zoom: 15, duration: reduceMotionRef.current ? 0 : 600 }, data);
        else map.fitBounds([[west, south], [east, north]], { padding: 48, maxZoom: 15, duration: reduceMotionRef.current ? 0 : 600 }, data);
      }]);
    });
    return () => intent.cancel();
    // Initial/geographic search intent only. Wait for its complete result snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, active, loading, fitKey, focusCampusSlug, focusPoint?.lat, focusPoint?.lng]);

  const canToggleExpand = Boolean(onExpandedChange) && !fillContainer;
  const showLoading = !mapReady && !tokenMissing;

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
          <GeneralLoadingBlock
            layout="stack"
            size={64}
            state="searching"
            label="Loading map…"
            style={styles.mapLoading}
          />
        ) : loading && !tokenMissing ? (
          <GeneralLoadingBlock
            layout="inline"
            size={20}
            state="searching"
            label="Updating map…"
            style={styles.mapUpdating}
          />
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
          className={
            fillContainer
              ? "studently-mapbox-map studently-mapbox-map--chrome-offset"
              : "studently-mapbox-map"
          }
          style={{ width: "100%", height: "100%" }}
        />
        {active && mobileGroup ? (
          <MobileMapSelection
            group={mobileGroup}
            onClose={dismissPreview}
            onInsetChange={setMobileCardInset}
          />
        ) : null}
        {layerMode && active && mapReady && groups.length > 0 ? (
          <label className="studently-map-pin-keyboard">
            <select aria-label="Choose a listing on the map" value="" onChange={(event) => {
              if (event.target.value) layerActivateGroupRef.current?.(event.target.value);
            }}>
              <option value="">Choose a listing on the map</option>
              {groups.map((group) => <option key={group.id} value={group.id}>
                {group.listings[0]?.title ?? "Listing"} — {shortPriceLabel(group.displayPriceUsd)} · {group.count} matching unit{group.count === 1 ? "" : "s"}
              </option>)}
            </select>
          </label>
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
              color={Studently.color.primary}
            />
          </Pressable>
        ) : null}
        {campusBeacon && beaconCampus ? (
          <CampusOffscreenArrow
            x={campusBeacon.x}
            y={campusBeacon.y}
            angleDeg={campusBeacon.angleDeg}
            accessibilityLabel={`Show ${campusPinLabel(beaconCampus)} on the map`}
            onPress={() => {
              const map = mapRef.current;
              const campus = beaconCampus;
              if (!map || !campus) return;
              cameraRef.current?.begin("beacon").run([(data) => map.easeTo({
                center: toLngLat(campus),
                duration: reduceMotionRef.current ? 0 : 550,
              }, data)]);
            }}
          />
        ) : null}
        {listingBeacon && selectedListing ? (
          <CampusOffscreenArrow
            tone="danger"
            x={listingBeacon.x}
            y={listingBeacon.y}
            angleDeg={listingBeacon.angleDeg}
            accessibilityLabel={
              selectedListing.title
                ? `Show ${selectedListing.title} on the map`
                : "Show selected listing on the map"
            }
            onPress={() => {
              const map = mapRef.current;
              const listing = selectedListing;
              if (!map || listing.lat == null || listing.lng == null) return;
              cameraRef.current?.begin("beacon").run([(data) => map.easeTo({
                center: toLngLat(listing),
                duration: reduceMotionRef.current ? 0 : 550,
              }, data)]);
            }}
          />
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
    borderRadius: Studently.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.bgWash,
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
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Studently.color.primaryMist,
  },
  mapUpdating: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 400,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    pointerEvents: "none",
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
    borderColor: Studently.color.border,
    boxShadow: "0 1px 4px rgba(18, 24, 38, 0.12)",
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
    ...StyleSheet.absoluteFill,
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
