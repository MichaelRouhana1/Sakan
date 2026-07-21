import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  type Region,
} from "react-native-maps";
import { LText } from "@/components/lister/Typography";
import { SkounMapPin } from "@/components/listings/SkounMapPin";
import { AREA_COORDINATES } from "@/constants/areaCoordinates";
import type { LebanonArea } from "@/constants/areas";
import { landmarksForArea } from "@/constants/landmarks";
import { Lister } from "@/constants/listerTheme";
import {
  formatCoordLabel,
  isInLebanon,
  type LatLng,
} from "@/lib/locationWkt";
import { useReducedMotion } from "@/lib/useReducedMotion";

export type ListingPin = {
  lng: number;
  lat: number;
  /** False until user drops pin, picks landmark, or confirms GPS. */
  confirmed: boolean;
  source: "pin" | "landmark" | "gps" | null;
  landmarkId: string | null;
  landmarkLabel: string;
};

type Props = {
  area: LebanonArea;
  value: ListingPin;
  onChange: (next: ListingPin) => void;
};

function regionFrom(coord: LatLng, delta = 0.012): Region {
  return {
    latitude: coord.lat,
    longitude: coord.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function LocationPicker({ area, value, onChange }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [labelOverride, setLabelOverride] = useState(value.landmarkLabel);
  const landmarks = useMemo(() => landmarksForArea(area), [area]);
  const center = AREA_COORDINATES[area];
  const reveal = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      reveal.setValue(1);
      return;
    }
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [area, reduceMotion, reveal]);

  useEffect(() => {
    setLabelOverride(value.landmarkLabel);
  }, [value.landmarkLabel]);

  function setCoord(
    coord: LatLng,
    patch: Partial<ListingPin> & { confirmed: boolean; source: ListingPin["source"] },
  ) {
    if (!isInLebanon(coord)) {
      setGpsError("Pin must be inside Lebanon.");
      return;
    }
    setGpsError(null);
    onChange({
      lng: coord.lng,
      lat: coord.lat,
      landmarkId: patch.landmarkId ?? null,
      landmarkLabel: patch.landmarkLabel ?? labelOverride,
      confirmed: patch.confirmed,
      source: patch.source,
    });
    mapRef.current?.animateToRegion(regionFrom(coord), 280);
  }

  function onSelectLandmark(id: string) {
    const landmark = landmarks.find((l) => l.id === id);
    if (!landmark) return;
    setLabelOverride(landmark.label);
    setCoord(
      { lng: landmark.lng, lat: landmark.lat },
      {
        confirmed: true,
        source: "landmark",
        landmarkId: landmark.id,
        landmarkLabel: landmark.label,
      },
    );
  }

  function confirmCurrentPin() {
    setCoord(
      { lng: value.lng, lat: value.lat },
      {
        confirmed: true,
        source: value.source === "landmark" ? "landmark" : "pin",
        landmarkId: value.landmarkId,
        landmarkLabel: labelOverride.trim() || value.landmarkLabel,
      },
    );
  }

  async function useMyLocation() {
    setGpsBusy(true);
    setGpsError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setGpsError("Location permission denied — drop a pin or pick a landmark.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = {
        lng: pos.coords.longitude,
        lat: pos.coords.latitude,
      };
      if (!isInLebanon(coord)) {
        setGpsError("Your GPS is outside Lebanon — use the map or a landmark.");
        return;
      }
      setCoord(coord, {
        confirmed: true,
        source: "gps",
        landmarkId: null,
        landmarkLabel: labelOverride.trim(),
      });
    } catch {
      setGpsError("Couldn’t read GPS — drop a pin or pick a landmark.");
    } finally {
      setGpsBusy(false);
    }
  }

  return (
    <Animated.View
      style={[
        styles.root,
        {
          opacity: reveal,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: reduceMotion ? [0, 0] : [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.copy}>
        <LText variant="subtitle">Set the exact pin</LText>
        <LText variant="body" tone="muted">
          Pin sets distance to campus — area alone isn’t enough. Drop a pin or
          choose a neighborhood landmark.
        </LText>
      </View>

      <View
        style={styles.mapShell}
        accessibilityLabel="Map to place listing pin"
      >
        {!mapReady ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={Lister.color.primary} />
            <LText variant="caption" tone="muted">
              Loading map…
            </LText>
          </View>
        ) : null}
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={regionFrom(center)}
          onMapReady={() => setMapReady(true)}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setCoord(
              { lat: latitude, lng: longitude },
              {
                confirmed: true,
                source: "pin",
                landmarkId: null,
                landmarkLabel: labelOverride.trim(),
              },
            );
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
          userInterfaceStyle="light"
        >
          <Marker
            coordinate={{ latitude: value.lat, longitude: value.lng }}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setCoord(
                { lat: latitude, lng: longitude },
                {
                  confirmed: true,
                  source: "pin",
                  landmarkId: null,
                  landmarkLabel: labelOverride.trim(),
                },
              );
            }}
            anchor={{ x: 0.5, y: 1 }}
            accessibilityLabel="Draggable listing pin"
          >
            <SkounMapPin dropped={value.confirmed} />
          </Marker>
        </MapView>
        <View style={styles.mapChrome} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
            onPress={() => void useMyLocation()}
            style={styles.gpsBtn}
            disabled={gpsBusy}
          >
            {gpsBusy ? (
              <ActivityIndicator size="small" color={Lister.color.primary} />
            ) : (
              <Ionicons
                name="locate-outline"
                size={18}
                color={Lister.color.primary}
              />
            )}
            <LText variant="caption" tone="primary" style={styles.gpsLabel}>
              My location
            </LText>
          </Pressable>
        </View>
      </View>

      <View style={styles.mapFallbackHint}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={Lister.color.inkMuted}
        />
        <LText variant="caption" tone="muted" style={styles.fallbackText}>
          If the map won’t load, pick a landmark preset — it still sets real
          coordinates for campus distance.
        </LText>
      </View>

      <View
        style={[
          styles.statusRow,
          value.confirmed ? styles.statusOn : styles.statusOff,
        ]}
        accessibilityRole="text"
      >
        <Ionicons
          name={value.confirmed ? "checkmark-circle" : "ellipse-outline"}
          size={18}
          color={
            value.confirmed ? Lister.color.primary : Lister.color.inkFaint
          }
        />
        <View style={styles.statusCopy}>
          <LText
            variant="caption"
            style={{
              fontFamily: Lister.type.bodySemi,
              color: value.confirmed
                ? Lister.color.primaryDeep
                : Lister.color.inkMuted,
            }}
          >
            {value.confirmed ? "Pin set" : "Pin not confirmed yet"}
          </LText>
          <LText variant="caption" tone="muted">
            {formatCoordLabel({ lng: value.lng, lat: value.lat })}
            {value.source === "landmark"
              ? " · landmark"
              : value.source === "gps"
                ? " · GPS"
                : value.confirmed
                  ? " · map pin"
                  : " · area center (default)"}
          </LText>
        </View>
        {!value.confirmed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm pin at current map position"
            onPress={confirmCurrentPin}
            style={styles.confirmChip}
          >
            <LText variant="caption" style={styles.confirmChipText}>
              Confirm
            </LText>
          </Pressable>
        ) : null}
      </View>

      {gpsError ? (
        <LText variant="caption" tone="danger" accessibilityRole="alert">
          {gpsError}
        </LText>
      ) : null}

      <LText variant="label" tone="muted">
        Landmark presets
      </LText>
      {landmarks.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.landmarkRow}
        >
          {landmarks.map((landmark) => {
            const selected = value.landmarkId === landmark.id;
            return (
              <Pressable
                key={landmark.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={landmark.label}
                onPress={() => onSelectLandmark(landmark.id)}
                style={[styles.landmarkChip, selected && styles.landmarkChipOn]}
              >
                <Ionicons
                  name="location"
                  size={14}
                  color={
                    selected ? Lister.color.surface : Lister.color.primary
                  }
                />
                <LText
                  variant="caption"
                  style={{
                    color: selected
                      ? Lister.color.surface
                      : Lister.color.ink,
                    fontFamily: Lister.type.bodySemi,
                  }}
                >
                  {landmark.label}
                </LText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <LText variant="caption" tone="muted">
          No presets for this area — drop a pin on the map.
        </LText>
      )}

      <LText variant="label" tone="muted">
        Label override (optional)
      </LText>
      <TextInput
        style={styles.input}
        placeholder="e.g. Near Sassine Square"
        placeholderTextColor={Lister.color.inkFaint}
        value={labelOverride}
        onChangeText={(text) => {
          setLabelOverride(text);
          onChange({
            ...value,
            landmarkLabel: text,
            // Free-text alone never confirms or moves the pin
          });
        }}
        accessibilityLabel="Landmark label override"
      />
      <LText variant="caption" tone="faint">
        Label text doesn’t move the pin. Use a preset or map drop for
        coordinates.
      </LText>
    </Animated.View>
  );
}

/** Compact read-only map for Review / detail. */
export function StaticPinMap({
  coord,
  height = 140,
}: {
  coord: LatLng;
  height?: number;
}) {
  return (
    <View style={[styles.staticMap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        region={regionFrom(coord, 0.008)}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        pointerEvents="none"
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
      >
        <Marker
          coordinate={{ latitude: coord.lat, longitude: coord.lng }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <SkounMapPin dropped />
        </Marker>
      </MapView>
    </View>
  );
}

export function initialPinForArea(area: LebanonArea): ListingPin {
  const c = AREA_COORDINATES[area];
  return {
    lng: c.lng,
    lat: c.lat,
    confirmed: false,
    source: null,
    landmarkId: null,
    landmarkLabel: "",
  };
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  copy: { gap: 6 },
  mapShell: {
    height: 260,
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.bgWash,
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Lister.color.primaryMist,
  },
  mapChrome: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Lister.radius.pill,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  gpsLabel: { fontFamily: Lister.type.bodySemi },
  mapFallbackHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 2,
  },
  fallbackText: { flex: 1 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
  },
  statusOn: {
    backgroundColor: Lister.color.primaryMist,
    borderColor: Lister.color.primarySoft,
  },
  statusOff: {
    backgroundColor: Lister.color.surfaceMuted,
    borderColor: Lister.color.border,
  },
  statusCopy: { flex: 1, gap: 2 },
  confirmChip: {
    backgroundColor: Lister.color.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Lister.radius.pill,
  },
  confirmChipText: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
  },
  landmarkRow: { gap: 8, paddingVertical: 2 },
  landmarkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Lister.radius.pill,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  landmarkChipOn: {
    backgroundColor: Lister.color.primary,
    borderColor: Lister.color.primary,
  },
  input: {
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: Lister.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: Lister.type.body,
    fontSize: 16,
    color: Lister.color.ink,
  },
  staticMap: {
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.bgWash,
  },
});
