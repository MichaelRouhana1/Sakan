import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
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
  createSkounMap,
  listingPinIcon,
  loadLeaflet,
  type LeafletNS,
} from "@/lib/skounLeaflet.web";

export type ListingPin = {
  lng: number;
  lat: number;
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

/**
 * Web location picker — Leaflet loaded client-side only (Expo SSR safe).
 */
export function LocationPicker({ area, value, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<LeafletNS | null>(null);
  const onChangeRef = useRef(onChange);
  const labelRef = useRef(value.landmarkLabel);
  const setGpsErrorRef = useRef<(msg: string | null) => void>(() => {});

  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [labelOverride, setLabelOverride] = useState(value.landmarkLabel);
  const [mapReady, setMapReady] = useState(false);

  const landmarks = useMemo(() => landmarksForArea(area), [area]);
  const center = AREA_COORDINATES[area];

  onChangeRef.current = onChange;
  labelRef.current = labelOverride;
  setGpsErrorRef.current = setGpsError;

  useEffect(() => {
    setLabelOverride(value.landmarkLabel);
  }, [value.landmarkLabel]);

  function applyCoord(
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
    onChangeRef.current({
      lng: coord.lng,
      lat: coord.lat,
      landmarkId: patch.landmarkId ?? null,
      landmarkLabel: patch.landmarkLabel ?? labelRef.current,
      confirmed: patch.confirmed,
      source: patch.source,
    });
  }

  // Init map on client when area changes.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !hostRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        }

        const start = AREA_COORDINATES[area];
        const map = createSkounMap(L, hostRef.current, [start.lat, start.lng], 14);
        mapRef.current = map;
        leafletRef.current = L;

        const marker = L.marker([start.lat, start.lng], {
          icon: listingPinIcon(L, false),
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          if (!isInLebanon({ lat, lng })) {
            setGpsErrorRef.current("Pin must be inside Lebanon.");
            return;
          }
          setGpsErrorRef.current(null);
          onChangeRef.current({
            lng,
            lat,
            landmarkId: null,
            landmarkLabel: labelRef.current.trim(),
            confirmed: true,
            source: "pin",
          });
        });

        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          if (!isInLebanon({ lat: ll.lat, lng: ll.lng })) {
            setGpsErrorRef.current("Pin must be inside Lebanon.");
            return;
          }
          setGpsErrorRef.current(null);
          onChangeRef.current({
            lng: ll.lng,
            lat: ll.lat,
            landmarkId: null,
            landmarkLabel: labelRef.current.trim(),
            confirmed: true,
            source: "pin",
          });
        });

        if (!cancelled) setMapReady(true);
        requestAnimationFrame(() => map.invalidateSize());
      } catch {
        // SSR / missing window
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, [area]);

  // Sync marker when value changes externally.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const L = leafletRef.current;
    if (!map || !marker || !L || !mapReady) return;
    marker.setLatLng([value.lat, value.lng]);
    marker.setIcon(listingPinIcon(L, value.confirmed));
    map.panTo([value.lat, value.lng], { animate: true });
  }, [value.lat, value.lng, value.confirmed, mapReady]);

  function onSelectLandmark(id: string) {
    const landmark = landmarks.find((l) => l.id === id);
    if (!landmark) return;
    setLabelOverride(landmark.label);
    applyCoord(
      { lng: landmark.lng, lat: landmark.lat },
      {
        confirmed: true,
        source: "landmark",
        landmarkId: landmark.id,
        landmarkLabel: landmark.label,
      },
    );
  }

  function confirmAreaCentroid() {
    applyCoord(
      { lng: center.lng, lat: center.lat },
      {
        confirmed: true,
        source: "pin",
        landmarkId: null,
        landmarkLabel: labelOverride.trim() || `${area} center`,
      },
    );
  }

  function confirmCurrentPin() {
    applyCoord(
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
      applyCoord(coord, {
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
    <View style={styles.root}>
      <View style={styles.copy}>
        <LText variant="subtitle">Set the exact pin</LText>
        <LText variant="body" tone="muted">
          Pin sets distance to campus — area alone isn’t enough. Drop a pin on
          the map or choose a neighborhood landmark.
        </LText>
      </View>

      <View style={styles.mapShell} accessibilityLabel="Map to place listing pin">
        {!mapReady ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={Lister.color.primary} />
            <LText variant="caption" tone="muted">
              Loading map…
            </LText>
          </View>
        ) : null}
        <div
          ref={hostRef}
          className="skoun-leaflet-map"
          style={{ width: "100%", height: "100%" }}
        />
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
          Web map uses OpenStreetMap. Landmark presets still set real
          coordinates for campus distance.
        </LText>
      </View>

      <View
        style={[
          styles.statusRow,
          value.confirmed ? styles.statusOn : styles.statusOff,
        ]}
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
            style={{ fontFamily: Lister.type.bodySemi }}
          >
            {value.confirmed ? "Location confirmed" : "Confirm a location"}
          </LText>
          <LText variant="caption" tone="muted">
            {formatCoordLabel({ lng: value.lng, lat: value.lat })}
          </LText>
        </View>
        {!value.confirmed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm pin"
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
        <LText variant="caption" tone="danger">
          {gpsError}
        </LText>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use area center as pin"
          onPress={confirmAreaCentroid}
          style={styles.actionBtn}
        >
          <Ionicons
            name="navigate-circle-outline"
            size={18}
            color={Lister.color.primary}
          />
          <LText variant="caption" tone="primary" style={styles.actionLabel}>
            Use {area} center
          </LText>
        </Pressable>
      </View>

      {landmarks.length > 0 ? (
        <View style={styles.landmarkBlock}>
          <LText variant="caption" tone="muted">
            Neighborhood landmarks
          </LText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.landmarkRow}
          >
            {landmarks.map((l) => {
              const on = value.landmarkId === l.id;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => onSelectLandmark(l.id)}
                  style={[styles.landmarkChip, on && styles.landmarkChipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={l.label}
                >
                  <Ionicons
                    name="location"
                    size={14}
                    color={on ? Lister.color.surface : Lister.color.primary}
                  />
                  <LText
                    variant="caption"
                    style={on ? styles.chipLabelOn : styles.chipLabel}
                  >
                    {l.label}
                  </LText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        value={labelOverride}
        placeholder="Landmark label (optional)"
        placeholderTextColor={Lister.color.inkFaint}
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
        Label text doesn’t move the pin. Use a preset or map drop for
        coordinates.
      </LText>
    </View>
  );
}

/** Compact read-only Leaflet map for Review (client-only). */
export function StaticPinMap({
  coord,
  height = 140,
}: {
  coord: LatLng;
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;
    let map: LeafletMap | null = null;

    void (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !hostRef.current) return;
        map = createSkounMap(L, hostRef.current, [coord.lat, coord.lng], 15);
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        L.marker([coord.lat, coord.lng], {
          icon: listingPinIcon(L, true),
          interactive: false,
        }).addTo(map);
        requestAnimationFrame(() => map?.invalidateSize());
      } catch {
        // ignore SSR
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [coord.lat, coord.lng]);

  return (
    <View style={[styles.staticMap, { height }]}>
      <div
        ref={hostRef}
        className="skoun-leaflet-map"
        style={{ width: "100%", height: "100%" }}
      />
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
    position: "relative",
  },
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
    zIndex: 500,
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
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Lister.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Lister.radius.pill,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  actionLabel: { fontFamily: Lister.type.bodySemi },
  landmarkBlock: { gap: 8 },
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
  chipLabel: {
    color: Lister.color.ink,
    fontFamily: Lister.type.bodyMedium,
  },
  chipLabelOn: {
    color: Lister.color.surface,
    fontFamily: Lister.type.bodySemi,
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
