import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { SkounMapPin } from "@/components/listings/SkounMapPin";
import { Skoun } from "@/constants/theme";
import { getMapboxStyle, hasMapboxToken, MAP_TOKEN_MISSING_COPY } from "@/lib/mapboxEnv";
import Mapbox, { hasMapboxNative, MAP_NATIVE_MISSING_COPY } from "@/lib/rnmapbox";

type Props = {
  lat: number;
  lng: number;
  height?: number;
  /** When false, pan/zoom off so page scroll wins (gallery mode). */
  interactive?: boolean;
};

export function ListingPinMap({
  lat,
  lng,
  height = 220,
  interactive = true,
}: Props) {
  if (!hasMapboxToken() || !hasMapboxNative()) {
    return (
      <View style={[styles.wrap, { height }]}>
        <LText variant="caption" tone="muted" style={styles.missing}>
          {!hasMapboxNative() ? MAP_NATIVE_MISSING_COPY : MAP_TOKEN_MISSING_COPY}
        </LText>
      </View>
    );
  }

  return (
    <View
      style={[styles.wrap, { height }]}
      pointerEvents={interactive ? "auto" : "none"}
    >
      <Mapbox.MapView
        style={StyleSheet.absoluteFill}
        styleURL={getMapboxStyle()}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={interactive}
        rotateEnabled={interactive}
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: [lng, lat],
            zoomLevel: 15,
            pitch: 0,
          }}
          centerCoordinate={[lng, lat]}
          zoomLevel={15}
          animationMode="none"
        />
        <Mapbox.MarkerView coordinate={[lng, lat]} anchor={{ x: 0.5, y: 1 }}>
          <SkounMapPin variant="listing" dropped={false} />
        </Mapbox.MarkerView>
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: Skoun.color.bgWash,
  },
  missing: {
    padding: 16,
    textAlign: "center",
  },
});
