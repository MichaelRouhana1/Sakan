import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Studently } from "@/constants/theme";
import { MAP_TOKEN_MISSING_COPY } from "@/lib/mapboxEnv";
import type { ListingMapCampus } from "@/lib/nearbyCampuses";
import { campusPinLabel } from "@/lib/campusPinLabel";
import {
  campusPinHtml,
  createStudentlyMap,
  destroyStudentlyMap,
  listingPinHtml,
  loadMapbox,
  makeMarker,
  setMapInteractive,
  toLngLat,
  type MapboxMap,
  type Marker,
} from "@/lib/studentlyMapbox.web";

type Props = {
  lat: number;
  lng: number;
  height?: number;
  interactive?: boolean;
  campus?: ListingMapCampus | null;
};

export function ListingPinMap({
  lat,
  lng,
  height = 220,
  interactive = true,
  campus = null,
}: Props) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const campusMarkerRef = useRef<Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const framedRef = useRef(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = await loadMapbox();
        if (cancelled || !hostRef.current) return;
        const map = createStudentlyMap(
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
        marker.getElement().setAttribute("data-testid", "detail-listing-pin");
        marker.getElement().setAttribute("aria-label", "This listing");
        mapRef.current = map;
        markerRef.current = marker;
        setMapReady(true);
      } catch {
        // Wash background remains if Mapbox fails.
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      campusMarkerRef.current?.remove();
      campusMarkerRef.current = null;
      destroyStudentlyMap(mapRef.current);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    let cancelled = false;
    void (async () => {
      const mapboxgl = await loadMapbox();
      if (cancelled) return;
      marker.setLngLat(toLngLat({ lat, lng }));
      if (campus) {
        // Keep the label on the side of the university away from the listing.
        const labelBelow = campus.lat < lat;
        const html = campusPinHtml(campusPinLabel(campus), true, { wrapLabel: true, labelBelow });
        let campusMarker = campusMarkerRef.current;
        if (!campusMarker) {
          campusMarker = makeMarker(mapboxgl, html, campus, { inert: true, zIndex: 3 });
          campusMarker.addTo(map);
          campusMarkerRef.current = campusMarker;
        } else {
          campusMarker.setLngLat(toLngLat(campus));
          campusMarker.getElement().innerHTML = html;
        }
        campusMarker.getElement().setAttribute("data-testid", "detail-university-pin");
        campusMarker.getElement().setAttribute("data-campus-slug", campus.slug);
        campusMarker.getElement().setAttribute("aria-label", campus.displayName ?? campus.name);
        campusMarker.getElement().title = campus.displayName ?? campus.name;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const width = map.getContainer().clientWidth;
        const labelHeight = campusMarker.getElement().querySelector(".studently-campus-label")?.getBoundingClientRect().height ?? 40;
        const pinHeight = campusMarker.getElement().getBoundingClientRect().height;
        map.fitBounds([
          [Math.min(lng, campus.lng), Math.min(lat, campus.lat)],
          [Math.max(lng, campus.lng), Math.max(lat, campus.lat)],
        ], {
          padding: {
            top: labelBelow ? 70 : labelHeight + pinHeight + 65,
            bottom: labelBelow ? labelHeight + 28 : 45,
            left: Math.min(125, width * 0.35),
            right: Math.min(165, width * 0.46),
          },
          maxZoom: 15,
          bearing: 0,
          pitch: 0,
          duration: !framedRef.current || reduced ? 0 : 500,
        });
      } else {
        campusMarkerRef.current?.remove();
        campusMarkerRef.current = null;
        map.jumpTo({ center: toLngLat({ lat, lng }), zoom: 15 });
      }
      framedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [lat, lng, campus?.slug, campus?.lat, campus?.lng, campus?.name, campus?.mapLabel, campus?.displayName, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setMapInteractive(map, interactive);
  }, [interactive, mapReady]);

  return (
    <View
      style={[
        styles.wrap,
        { height, pointerEvents: interactive ? "auto" : "none" },
      ]}
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
        className="studently-mapbox-map"
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: interactive ? "auto" : "none",
        }}
      />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: Studently.color.bgWash,
    position: "relative",
  },
  missing: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: Studently.color.bgWash,
  },
});
