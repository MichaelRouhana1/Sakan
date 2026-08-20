import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { MAP_TOKEN_MISSING_COPY } from "@/lib/mapboxEnv";
import {
  createSkounMap,
  destroySkounMap,
  listingPinHtml,
  loadMapbox,
  makeMarker,
  setMapInteractive,
  toLngLat,
  type MapboxMap,
  type Marker,
} from "@/lib/skounMapbox.web";

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
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = await loadMapbox();
        if (cancelled || !hostRef.current) return;
        const map = createSkounMap(
          mapboxgl,
          hostRef.current,
          { lat, lng },
          15,
        );
        if (!map) {
          if (!cancelled) setTokenMissing(true);
          return;
        }
        setMapInteractive(map, interactive);
        const marker = makeMarker(
          mapboxgl,
          listingPinHtml(true),
          { lat, lng },
          { inert: true },
        );
        marker.addTo(map);
        mapRef.current = map;
        markerRef.current = marker;
      } catch {
        // Wash background remains if Mapbox fails.
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      destroySkounMap(mapRef.current);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLngLat(toLngLat({ lat, lng }));
    map.jumpTo({ center: toLngLat({ lat, lng }), zoom: map.getZoom() });
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setMapInteractive(map, interactive);
  }, [interactive]);

  return (
    <View
      style={[styles.wrap, { height }]}
      pointerEvents={interactive ? "auto" : "none"}
    >
      {tokenMissing ? (
        <View style={styles.missing}>
          <LText variant="caption" tone="muted">
            {MAP_TOKEN_MISSING_COPY}
          </LText>
        </View>
      ) : null}
      <div
        ref={hostRef}
        className="skoun-mapbox-map"
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
    position: "relative",
  },
  missing: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: Skoun.color.bgWash,
  },
});
