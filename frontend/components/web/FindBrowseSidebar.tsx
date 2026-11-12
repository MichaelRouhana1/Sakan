import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";
import { WEB_SIDEBAR_STICKY_TOP } from "@/constants/webLayout";
import {
  createStudentlyPreviewMap,
  destroyStudentlyMap,
  loadMapbox,
  makeMarker,
  pricePinHtml,
  type MapboxGL,
  type MapboxMap,
  type Marker,
} from "@/lib/studentlyMapbox.web";
import type { Listing } from "@/types/listing";
import { groupListingsByPlace } from "@/lib/mapPinGroups";
import { getWebMapPinRendererSelection, markWebMapPinRenderer } from "@/lib/webMapPinRenderer.web";
import { WebMapLayerRenderer } from "@/lib/webMapLayers.web";
import { webMapDisplayGroups } from "@/lib/webMapDisplayGroups.web";
import { useStableWebMapListings } from "@/lib/webMapData.web";

const BEIRUT = { lat: 33.8938, lng: 35.5018 };
const STUDENTLY_BLUE = Studently.color.primary;
const CARD_BORDER = Studently.color.bgWash;
const ROW_BORDER = "#F1F5F9";

const webTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "transform, background-color",
        transitionDuration: "150ms",
      } as ViewStyle)
    : {};

const USP_ITEMS = [
  {
    id: "direct",
    title: "Talk to posters directly",
    body: "Open WhatsApp from any listing. No booking fees, no middlemen — you negotiate with the person who listed the room.",
    icon: "chatbubbles-outline" as const,
  },
  {
    id: "lebanon",
    title: "Built for Lebanon",
    body: "Areas, universities, and utilities that match how students actually search here — Hamra, Ashrafieh, AUB, LAU, and more.",
    icon: "location-outline" as const,
  },
  {
    id: "fresh",
    title: "Fresh USD pricing",
    body: "Rents shown as monthly USD. Filter by what’s included — electricity, water, Wi‑Fi — so there are fewer surprises later.",
    icon: "cash-outline" as const,
  },
  {
    id: "free",
    title: "Free to browse & list",
    body: "Finding a room doesn’t cost you. Posters can list without paying Studently. Keep the conversation on WhatsApp.",
    icon: "shield-checkmark-outline" as const,
  },
] as const;

type Props = {
  onExploreMap: () => void;
  listings?: Listing[];
};

type PreviewPin = { lat: number; lng: number; label: string };

function shortPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function groupsFromListings(listings: Listing[]) {
  return groupListingsByPlace(listings.filter(
    (item): item is Listing & { lat: number; lng: number } => item.lat != null && item.lng != null,
  )).slice(0, 8);
}

/** Live Standard-style preview — same chrome as browse map, no nav. */
function MapPreviewBackdrop({ listings }: { listings: Listing[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const glRef = useRef<MapboxGL | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const layerRef = useRef<WebMapLayerRenderer | null>(null);
  const fittedBoundsRef = useRef<string | null>(null);
  const layerMode = useMemo(() => getWebMapPinRendererSelection().renderer === "layers", []);
  const [ready, setReady] = useState(false);

  const stableListings = useStableWebMapListings(listings);
  const groups = useMemo(() => {
    const places = groupsFromListings(stableListings);
    return layerMode ? webMapDisplayGroups(places) : places;
  }, [stableListings, layerMode]);
  const pins = useMemo<PreviewPin[]>(() => groups.map(group => ({
    lat: group.lat, lng: group.lng,
    label: `${shortPrice(group.displayPriceUsd)} · ${group.count}`,
  })), [groups]);
  const bounds = useMemo<[number, number, number, number] | null>(() => pins.length ? [
    Math.min(...pins.map(pin => pin.lng)), Math.min(...pins.map(pin => pin.lat)),
    Math.max(...pins.map(pin => pin.lng)), Math.max(...pins.map(pin => pin.lat)),
  ] : null, [pins]);
  const boundsKey = JSON.stringify(bounds);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    markWebMapPinRenderer(el);
    let cancelled = false;

    void (async () => {
      try {
        const gl = await loadMapbox();
        if (cancelled || !hostRef.current) return;
        const map = createStudentlyPreviewMap(gl, hostRef.current, BEIRUT, 13.2);
        if (!map) return;
        glRef.current = gl;
        mapRef.current = map;
        fittedBoundsRef.current = null;
        if (layerMode) layerRef.current = new WebMapLayerRenderer(map, { cluster: false, alwaysShowCount: true });
        if (!cancelled) setReady(true);
      } catch {
        // Wash background remains if Mapbox fails.
      }
    })();

    return () => {
      cancelled = true;
      setReady(false);
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      layerRef.current?.destroy();
      layerRef.current = null;
      destroyStudentlyMap(mapRef.current);
      mapRef.current = null;
      glRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const gl = glRef.current;
    if (!ready || !map || !gl) return;

    for (const marker of markersRef.current) marker.remove();
    layerRef.current?.updateGroups(groups);
    markersRef.current = layerMode ? [] : pins.map((pin) =>
      makeMarker(gl, pricePinHtml(pin.label, false), pin, {
        inert: true,
      }).addTo(map),
    );

  }, [pins, groups, ready, layerMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !bounds || fittedBoundsRef.current === boundsKey) return;
    fittedBoundsRef.current = boundsKey;
    const [west, south, east, north] = bounds;
    if (west === east || south === north) {
      map.easeTo({ center: [west, south], zoom: 14.2, duration: 0, pitch: 38, bearing: -18 });
      return;
    }
    map.fitBounds([[west, south], [east, north]], {
      padding: 36,
      maxZoom: 14.2,
      duration: 0,
      pitch: 38,
      bearing: -18,
    });
    // Read-only preview: fit only when its geographic extent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, boundsKey]);

  return (
    <div
      ref={hostRef}
      className="studently-mapbox-map"
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * Amber-style sticky sidebar: one card with edge-to-edge map header
 * + trust accordion flush underneath.
 */
export function FindBrowseSidebar({ onExploreMap, listings = [] }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View style={styles.sticky}>
      <View style={styles.cardShadow}>
        <View style={styles.card}>
          {/* Edge-to-edge map header */}
          <View style={styles.mapHeader} accessibilityLabel="Map of Beirut">
          <MapPreviewBackdrop listings={listings} />
          <View style={[styles.mapScrim, { pointerEvents: "none" }]} />
          <View style={[styles.mapCtaWrap, { pointerEvents: "box-none" }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Explore on map"
              onPress={onExploreMap}
              style={({ hovered, pressed }) => [
                styles.mapBtn,
                (hovered || pressed) && styles.mapBtnHover,
                pressed && styles.mapBtnPressed,
              ]}
            >
              <Ionicons name="map-outline" size={15} color={STUDENTLY_BLUE} />
              <LText variant="label" style={styles.mapBtnLabel}>
                Explore on map
              </LText>
            </Pressable>
          </View>
        </View>

        {/* Trust accordion — same card, no gap */}
        <View style={styles.uspStack}>
          {USP_ITEMS.map((item, index) => {
            const open = openId === item.id;
            const isLast = index === USP_ITEMS.length - 1;
            return (
              <View
                key={item.id}
                style={[styles.uspItem, !isLast && styles.uspItemBorder]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpenId(open ? null : item.id)}
                  style={({ hovered }) => [
                    styles.uspHeader,
                    hovered && styles.uspHeaderHover,
                  ]}
                >
                  <View style={styles.uspTitleRow}>
                    <View style={styles.uspIcon}>
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color={Studently.color.primary}
                      />
                    </View>
                    <LText variant="label" style={styles.uspTitle as StyleProp<TextStyle>}>
                      {item.title}
                    </LText>
                  </View>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-forward"}
                    size={14}
                    color="#9CA3AF"
                  />
                </Pressable>
                {open ? (
                  <LText variant="caption" style={styles.uspBody as StyleProp<TextStyle>}>
                    {item.body}
                  </LText>
                ) : null}
              </View>
            );
          })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: {
    width: 300,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "flex-start",
    position: "sticky" as unknown as "relative",
    top: WEB_SIDEBAR_STICKY_TOP,
    maxHeight: "calc(100vh - 160px)" as unknown as number,
    overflow: "visible",
    paddingBottom: 20,
  },
  cardShadow: {
    borderRadius: 16,
    boxShadow: "0 8px 24px rgba(18, 24, 38, 0.08)",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    overflow: "hidden",
  },
  mapHeader: {
    width: "100%",
    height: 130, // w-full h-[130px]
    position: "relative",
    overflow: "hidden",
    backgroundColor: Studently.color.bgWash,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  mapScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 24, 38, 0.04)",
    zIndex: 1,
  },
  mapCtaWrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6, // gap-1.5
    paddingHorizontal: 16, // px-4
    paddingVertical: 6, // py-1.5
    borderRadius: 999, // rounded-full
    backgroundColor: "#FFFFFF", // bg-white
    borderWidth: 2,
    borderColor: Studently.color.primary,
    boxShadow: "0 3px 8px rgba(18, 24, 38, 0.12)",
    ...webTransition,
  },
  mapBtnHover: {
    backgroundColor: Studently.color.primaryMist,
    transform: [{ scale: 1.02 }],
  },
  mapBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  mapBtnLabel: {
    color: Studently.color.primary,
    fontWeight: "700", // font-bold
    fontSize: 12, // text-xs
  },
  uspStack: {
    backgroundColor: "#FFFFFF",
  },
  uspItem: {},
  uspItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9", // border-b border-slate-100
  },
  uspHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14, // px-3.5 (14px)
    paddingVertical: 10, // py-2.5 (10px)
    backgroundColor: "#FFFFFF", // bg-white
    cursor: "pointer" as unknown as undefined,
  },
  uspHeaderHover: {
    backgroundColor: "rgba(248, 250, 252, 0.8)", // hover:bg-slate-50/80
  },
  uspTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  uspIcon: {
    width: 28, // w-7 (28px)
    height: 28, // h-7 (28px)
    borderRadius: 999, // rounded-full
    backgroundColor: Studently.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10, // mr-2.5 (10px)
    flexShrink: 0, // shrink-0
  },
  uspTitle: {
    fontSize: 12, // text-xs
    fontWeight: "600", // font-semibold
    color: "#1F2A37", // text-[#1F2A37]
    flex: 1, // flex-1
  },
  uspBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingLeft: 52,
    color: Studently.color.inkMuted,
    lineHeight: 18,
    fontSize: 12,
  },
});
