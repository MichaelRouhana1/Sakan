import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { Map as LeafletMap } from "leaflet";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { WEB_SIDEBAR_STICKY_TOP } from "@/constants/webLayout";
import {
  createSkounMap,
  loadLeaflet,
  type LeafletNS,
} from "@/lib/skounLeaflet.web";

const BEIRUT: [number, number] = [33.8938, 35.5018];
const SKOUN_BLUE = "#2F6FED";
const CARD_BORDER = "#E2E8F0";
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
    body: "Finding a room doesn’t cost you. Posters can list without paying Skoun. Keep the conversation on WhatsApp.",
    icon: "shield-checkmark-outline" as const,
  },
] as const;

type Props = {
  onExploreMap: () => void;
};

/** Decorative Beirut map tile — same OSM tiles as browse map; not interactive. */
function MapPreviewBackdrop() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !hostRef.current) return;

        const map = createSkounMap(L, hostRef.current, BEIRUT, 13);
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.zoomControl?.remove();
        map.attributionControl?.remove();

        mapRef.current = map;
        leafletRef.current = L;
        requestAnimationFrame(() => {
          map.invalidateSize();
          map.setView(BEIRUT, 13, { animate: false });
        });
      } catch {
        // Leave wash background if Leaflet fails to load.
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="skoun-leaflet-map"
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/**
 * Amber-style sticky sidebar: one card with edge-to-edge map header
 * + trust accordion flush underneath.
 */
export function FindBrowseSidebar({ onExploreMap }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View style={styles.sticky}>
      <View style={styles.card}>
        {/* Edge-to-edge map header */}
        <View style={styles.mapHeader} accessibilityLabel="Map of Beirut">
          <MapPreviewBackdrop />
          <View style={styles.mapScrim} pointerEvents="none" />
          <View style={styles.mapCtaWrap} pointerEvents="box-none">
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
              <Ionicons name="map-outline" size={15} color={SKOUN_BLUE} />
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
                        color={Skoun.color.primaryDeep}
                      />
                    </View>
                    <LText variant="label" style={styles.uspTitle}>
                      {item.title}
                    </LText>
                  </View>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-forward"}
                    size={14}
                    color={Skoun.color.inkFaint}
                  />
                </Pressable>
                {open ? (
                  <LText variant="caption" style={styles.uspBody}>
                    {item.body}
                  </LText>
                ) : null}
              </View>
            );
          })}
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
    overflow: "auto",
    overflowY: "auto",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#121826",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mapHeader: {
    width: "100%",
    height: 126,
    position: "relative",
    overflow: "hidden",
    backgroundColor: Skoun.color.bgWash,
  },
  mapScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 24, 38, 0.12)",
    zIndex: 1,
  },
  mapCtaWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: SKOUN_BLUE,
    shadowColor: "#121826",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    ...webTransition,
  },
  mapBtnHover: {
    backgroundColor: Skoun.color.primaryMist,
    transform: [{ scale: 1.03 }],
  },
  mapBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  mapBtnLabel: {
    color: SKOUN_BLUE,
    fontWeight: "600",
    fontSize: 12,
  },
  uspStack: {
    backgroundColor: "#FFFFFF",
  },
  uspItem: {},
  uspItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: ROW_BORDER,
  },
  uspHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  uspHeaderHover: {
    backgroundColor: "#F8FAFC",
  },
  uspTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  uspIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  uspTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  uspBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingLeft: 52,
    color: Skoun.color.inkMuted,
    lineHeight: 18,
    fontSize: 12,
  },
});
