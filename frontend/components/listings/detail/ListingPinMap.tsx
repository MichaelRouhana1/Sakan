import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { StudentlyMapPin } from "@/components/listings/StudentlyMapPin";
import { Studently } from "@/constants/theme";
import { regionFromZoom } from "@/lib/nativeMapCamera";
import type { ListingMapCampus } from "@/lib/nearbyCampuses";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Props = {
  lat: number;
  lng: number;
  height?: number;
  /** When false, pan/zoom off so page scroll wins (gallery mode). */
  interactive?: boolean;
  campus?: ListingMapCampus | null;
};

const MAP_PROVIDER =
  Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

const PIN_HEAD_CENTER_Y = 48;
const MARKER_H = 78;

export function ListingPinMap({
  lat,
  lng,
  height = 220,
  interactive = true,
  campus = null,
}: Props) {
  const region = regionFromZoom(lat, lng, 15, 360, height);
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const framedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!mapReady) return;
    const animated = framedRef.current && !reducedMotion;
    if (campus) {
      mapRef.current?.fitToCoordinates([
        { latitude: lat, longitude: lng },
        { latitude: campus.lat, longitude: campus.lng },
      ], { edgePadding: { top: 90, right: 65, bottom: 55, left: 65 }, animated });
    } else {
      mapRef.current?.animateToRegion(regionFromZoom(lat, lng, 15, 360, height), animated ? 400 : 0);
    }
    framedRef.current = true;
  }, [lat, lng, campus?.slug, campus?.lat, campus?.lng, mapReady, height, reducedMotion]);

  return (
    <View
      style={[styles.wrap, { height }]}
      pointerEvents={interactive ? "auto" : "none"}
    >
      <MapView
        ref={mapRef}
        onMapReady={() => setMapReady(true)}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={interactive}
        rotateEnabled={interactive}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          anchor={{ x: 0.5, y: PIN_HEAD_CENTER_Y / MARKER_H }}
          tracksViewChanges={false}
        >
          <StudentlyMapPin variant="listing" dropped={false} />
        </Marker>
        {campus ? (
          <Marker
            key={campus.slug}
            coordinate={{ latitude: campus.lat, longitude: campus.lng }}
            title={campus.displayName ?? campus.name}
            description={`${Math.round(campus.meters).toLocaleString("en-US")} m from this listing`}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <StudentlyMapPin variant="campus" dropped={false} />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: Studently.color.bgWash,
  },
});
