import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
} from "react-native-maps";
import { LText } from "@/components/lister/Typography";
import { PasteLocationLinkField } from "@/components/listings/PasteLocationLinkField";
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
import {
  animateRegion,
  regionFromZoom,
} from "@/lib/nativeMapCamera";
import { useReducedMotion } from "@/lib/useReducedMotion";

export type ListingPin = {
  lng: number;
  lat: number;
  /** False until user drops pin, picks landmark, confirms GPS, or confirms a pasted link. */
  confirmed: boolean;
  source: "pin" | "landmark" | "gps" | "link" | null;
  landmarkId: string | null;
  landmarkLabel: string;
};

type Props = {
  area: LebanonArea;
  value: ListingPin;
  onChange: (next: ListingPin) => void;
  invalid?: boolean;
};

const MAP_PROVIDER =
  Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;

function flyTo(
  map: MapView | null,
  coord: LatLng,
  duration = 280,
) {
  const { width, height } = Dimensions.get("window");
  const region = regionFromZoom(coord.lat, coord.lng, 14, width, 260);
  animateRegion(map, region, duration);
}

export function LocationPicker({ area, value, onChange, invalid }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [labelOverride, setLabelOverride] = useState(value.landmarkLabel);
  const landmarks = useMemo(() => landmarksForArea(area), [area]);
  const center = AREA_COORDINATES[area];
  const reveal = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();
  const initialRegion = regionFromZoom(center.lat, center.lng, 14, 360, 260);

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

  useEffect(() => {
    if (!mapReady) return;
    flyTo(mapRef.current, { lat: center.lat, lng: center.lng }, 0);
  }, [area, center.lat, center.lng, mapReady]);

  function setCoord(
    coord: LatLng,
    patch: Partial<ListingPin> & {
      confirmed: boolean;
      source: ListingPin["source"];
    },
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
    flyTo(mapRef.current, coord);
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
    const keepSource =
      value.source === "landmark" ||
      value.source === "gps" ||
      value.source === "link"
        ? value.source
        : "pin";
    setCoord(
      { lng: value.lng, lat: value.lat },
      {
        confirmed: true,
        source: keepSource,
        landmarkId: value.landmarkId,
        landmarkLabel: labelOverride.trim() || value.landmarkLabel,
      },
    );
  }

  function applyPastedLink(coord: LatLng) {
    setLinkError(null);
    setGpsError(null);
    setCoord(coord, {
      confirmed: false,
      source: "link",
      landmarkId: null,
      landmarkLabel: labelOverride.trim(),
    });
  }

  async function useMyLocation() {
    setGpsBusy(true);
    setGpsError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setGpsError(
          "Location permission denied — drop a pin or pick a landmark.",
        );
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

  function onMapPress(e: MapPressEvent) {
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
  }

  function onDragEnd(e: MarkerDragStartEndEvent) {
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
          Fastest: paste a Maps or WhatsApp place link. Or drop a pin, use GPS,
          or pick a landmark — then Confirm.
        </LText>
      </View>

      <PasteLocationLinkField
        onResolved={applyPastedLink}
        onError={setLinkError}
      />
      {linkError ? (
        <LText variant="caption" tone="danger" accessibilityRole="alert">
          {linkError}
        </LText>
      ) : null}

      <View
        style={[styles.mapShell, invalid && styles.mapShellInvalid]}
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
          provider={MAP_PROVIDER}
          initialRegion={initialRegion}
          pitchEnabled
          rotateEnabled
          onMapReady={() => setMapReady(true)}
          onPress={onMapPress}
        >
          <Marker
            coordinate={{ latitude: value.lat, longitude: value.lng }}
            draggable
            anchor={{ x: 0.5, y: 1 }}
            onDragEnd={onDragEnd}
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
            {value.source === "landmark"
              ? "Landmark preset"
              : value.source === "gps"
                ? "GPS"
                : value.source === "link"
                  ? "From pasted link — nudge if needed, then Confirm"
                  : value.confirmed
                    ? "Map pin"
                    : "Area center (default) — not published yet"}
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
          });
        }}
        accessibilityLabel="Landmark label override"
      />
      <LText variant="caption" tone="faint">
        Label text doesn’t move the pin. Use a link, preset, or map drop for
        coordinates.
      </LText>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: advancedOpen }}
        onPress={() => setAdvancedOpen((v) => !v)}
        style={styles.advancedToggle}
      >
        <LText variant="caption" tone="muted">
          {advancedOpen ? "Hide advanced" : "Advanced — coordinates"}
        </LText>
        <Ionicons
          name={advancedOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={Lister.color.inkMuted}
        />
      </Pressable>
      {advancedOpen ? (
        <View style={styles.advancedBox}>
          <LText variant="caption" tone="muted">
            {formatCoordLabel({ lng: value.lng, lat: value.lat })}
          </LText>
          <LText variant="caption" tone="faint">
            Manual lat/lng entry isn’t the main path — paste a link or use the
            map.
          </LText>
        </View>
      ) : null}
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
  const region = regionFromZoom(coord.lat, coord.lng, 15, 360, height);
  return (
    <View style={[styles.staticMap, { height }]} pointerEvents="none">
      <MapView
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: coord.lat, longitude: coord.lng }}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
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
  mapShellInvalid: {
    borderWidth: 2,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
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
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  advancedBox: {
    gap: 4,
    padding: 12,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  staticMap: {
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.bgWash,
  },
});
