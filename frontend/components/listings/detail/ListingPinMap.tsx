import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { SkounMapPin } from "@/components/listings/SkounMapPin";
import { Skoun } from "@/constants/theme";

type Props = {
  lat: number;
  lng: number;
  height?: number;
  /** When false, pan/zoom off so page scroll wins (gallery mode). */
  interactive?: boolean;
};

const DELTA = 0.008;

export function ListingPinMap({
  lat,
  lng,
  height = 220,
  interactive = true,
}: Props) {
  return (
    <View
      style={[styles.wrap, { height }]}
      pointerEvents={interactive ? "auto" : "none"}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: DELTA,
          longitudeDelta: DELTA,
        }}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsUserLocation={false}
        moveOnMarkerPress={false}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
          tappable={false}
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
