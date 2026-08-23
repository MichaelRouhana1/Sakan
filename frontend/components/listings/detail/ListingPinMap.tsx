import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SkounMapPin } from "@/components/listings/SkounMapPin";
import { Skoun } from "@/constants/theme";
import { regionFromZoom } from "@/lib/nativeMapCamera";

type Props = {
  lat: number;
  lng: number;
  height?: number;
  /** When false, pan/zoom off so page scroll wins (gallery mode). */
  interactive?: boolean;
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
}: Props) {
  const region = regionFromZoom(lat, lng, 15, 360, height);

  return (
    <View
      style={[styles.wrap, { height }]}
      pointerEvents={interactive ? "auto" : "none"}
    >
      <MapView
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
          <SkounMapPin variant="listing" dropped={false} />
        </Marker>
      </MapView>
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
