import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
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
import { ListingPinMap } from "@/components/listings/detail/ListingPinMap";
import { PasteLocationLinkField } from "@/components/listings/PasteLocationLinkField";
import { AREA_COORDINATES } from "@/constants/areaCoordinates";
import type { LebanonArea } from "@/constants/areas";
import { landmarksForArea } from "@/constants/landmarks";
import { Lister } from "@/constants/listerTheme";
import { MAP_TOKEN_MISSING_COPY } from "@/lib/mapboxEnv";
import {
  formatCoordLabel,
  isInLebanon,
  type LatLng,
} from "@/lib/locationWkt";
import {
  createSkounMap,
  destroySkounMap,
  listingPinHtml,
  loadMapbox,
  makeMarker,
  toLngLat,
  type MapboxMap,
  type Marker,
} from "@/lib/skounMapbox.web";

export type ListingPin = {
  lng: number;
  lat: number;
  confirmed: boolean;
  source: "pin" | "landmark" | "gps" | "link" | null;
  landmarkId: string | null;
  landmarkLabel: string;
};

type Props = {
  area: LebanonArea;
  value: ListingPin;
  onChange: (next: ListingPin) => void;
};

/**
 * Web location picker — Mapbox GL loaded client-side only (Expo SSR safe).
 */
export function LocationPicker({ area, value, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const onChangeRef = useRef(onChange);
  const labelRef = useRef(value.landmarkLabel);
  const setGpsErrorRef = useRef<(msg: string | null) => void>(() => {});

  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  // Init map once. Area / pin updates reuse the same Mapbox instance.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = await loadMapbox();
        if (cancelled || !hostRef.current) return;

        const start = AREA_COORDINATES[area];
        const map = createSkounMap(
          mapboxgl,
          hostRef.current,
          { lat: start.lat, lng: start.lng },
          14,
        );
        if (!map) {
          if (!cancelled) setTokenMissing(true);
          return;
        }
        mapRef.current = map;

        const marker = makeMarker(
          mapboxgl,
          listingPinHtml(false),
          { lat: start.lat, lng: start.lng },
        );
        marker.setDraggable(true);
        marker.addTo(map);
        markerRef.current = marker;

        map.on("click", (e) => {
          const { lat, lng } = e.lngLat;
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
          const ll = marker.getLngLat();
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
      } catch {
        // SSR / missing window
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      destroySkounMap(mapRef.current);
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const start = AREA_COORDINATES[area];
    map.easeTo({
      center: toLngLat({ lat: start.lat, lng: start.lng }),
      zoom: 14,
      duration: 450,
    });
  }, [area, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !mapReady) return;
    marker.setLngLat(toLngLat({ lat: value.lat, lng: value.lng }));
    marker.getElement().innerHTML = listingPinHtml(value.confirmed);
    map.panTo(toLngLat({ lat: value.lat, lng: value.lng }));
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
    const keepSource =
      value.source === "landmark" ||
      value.source === "gps" ||
      value.source === "link"
        ? value.source
        : "pin";
    applyCoord(
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
    applyCoord(coord, {
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

      <View style={styles.mapShell} accessibilityLabel="Map to place listing pin">
        {!mapReady && !tokenMissing ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={Lister.color.primary} />
            <LText variant="caption" tone="muted">
              Loading map…
            </LText>
          </View>
        ) : null}
        {tokenMissing ? (
          <View style={styles.mapLoading}>
            <LText variant="caption" tone="muted">
              {MAP_TOKEN_MISSING_COPY}
            </LText>
          </View>
        ) : null}
        <div
          ref={hostRef}
          className="skoun-mapbox-map"
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
          Web map uses Mapbox. Landmark presets still set real
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
    </View>
  );
}

/** Compact read-only map for Review (client-only). */
export function StaticPinMap({
  coord,
  height = 140,
}: {
  coord: LatLng;
  height?: number;
}) {
  return (
    <ListingPinMap
      lat={coord.lat}
      lng={coord.lng}
      height={height}
      interactive={false}
    />
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
