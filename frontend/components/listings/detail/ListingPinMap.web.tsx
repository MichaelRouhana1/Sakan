import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Skoun } from "@/constants/theme";
import {
  createSkounMap,
  listingPinIcon,
  loadLeaflet,
  type LeafletNS,
} from "@/lib/skounLeaflet.web";
import type { Map as LeafletMap } from "leaflet";

type Props = {
  lat: number;
  lng: number;
  height?: number;
  interactive?: boolean;
};

export function ListingPinMap({
  lat,
  lng,
  height = 220,
  interactive = true,
}: Props) {
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
        const map = createSkounMap(L, hostRef.current, [lat, lng], 15);
        if (!interactive) {
          map.dragging.disable();
          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.scrollWheelZoom.disable();
          map.boxZoom.disable();
          map.keyboard.disable();
          map.zoomControl?.remove();
        }
        L.marker([lat, lng], { icon: listingPinIcon(L), interactive: false }).addTo(
          map,
        );
        mapRef.current = map;
        leafletRef.current = L;
        requestAnimationFrame(() => {
          map.invalidateSize();
          map.setView([lat, lng], 15, { animate: false });
        });
      } catch {
        // Wash background remains if Leaflet fails.
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [lat, lng, interactive]);

  return (
    <View style={[styles.wrap, { height }]}>
      <div
        ref={hostRef}
        className="skoun-leaflet-map"
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: interactive ? "auto" : "none",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: Skoun.color.bgWash,
  },
});
