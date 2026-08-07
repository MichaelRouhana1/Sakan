import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Map as LeafletMap } from "leaflet";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import {
  createSkounMap,
  loadLeaflet,
  type LeafletNS,
} from "@/lib/skounLeaflet.web";

const BEIRUT: [number, number] = [33.8938, 35.5018];

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
        // Remeasure after layout — preview tile is small.
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

export function FindBrowseSidebar({ onExploreMap }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View style={styles.wrap}>
      <View
        style={styles.mapTile}
        accessibilityLabel="Map of Beirut"
      >
        <MapPreviewBackdrop />
        <View style={styles.mapScrim} pointerEvents="none" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore on map"
          onPress={onExploreMap}
          style={({ hovered, pressed }) => [
            styles.mapBtn,
            (hovered || pressed) && styles.mapBtnHover,
          ]}
        >
          <Ionicons name="map-outline" size={18} color={Skoun.color.primary} />
          <LText variant="label" style={styles.mapBtnLabel}>
            Explore on map
          </LText>
        </Pressable>
      </View>

      <View style={styles.uspStack}>
        {USP_ITEMS.map((item) => {
          const open = openId === item.id;
          return (
            <View key={item.id} style={styles.uspItem}>
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
                      size={18}
                      color={Skoun.color.primaryDeep}
                    />
                  </View>
                  <LText variant="label" style={styles.uspTitle}>
                    {item.title}
                  </LText>
                </View>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 300,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "flex-start",
    gap: 16,
  },
  mapTile: {
    height: 168,
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.bgWash,
    position: "relative",
  },
  mapScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 24, 38, 0.16)",
    zIndex: 1,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1.5,
    borderColor: Skoun.color.primary,
    zIndex: 2,
    shadowColor: "#121826",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  mapBtnHover: {
    backgroundColor: Skoun.color.primaryMist,
  },
  mapBtnLabel: {
    color: Skoun.color.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  uspStack: {
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.lg,
    backgroundColor: Skoun.color.surface,
    overflow: "hidden",
  },
  uspItem: {
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  uspHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  uspHeaderHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  uspTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  uspIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  uspTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Skoun.color.ink,
    flex: 1,
  },
  uspBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingLeft: 56,
    color: Skoun.color.inkMuted,
    lineHeight: 20,
    fontSize: 13,
  },
});
