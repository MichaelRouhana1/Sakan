import { useEffect, useRef, useState } from "react";
import { H } from "../h";
import { MAP_TOKEN_MISSING_COPY } from "@/lib/mapboxEnv";
import { formatCoordLabel, isInLebanon } from "@/lib/locationWkt";
import {
  campusPinHtml,
  createSkounMap,
  destroySkounMap,
  loadMapbox,
  makeMarker,
  toLngLat,
  type MapboxMap,
  type Marker,
} from "@/lib/skounMapbox.web";

/** Default drop zone — Hamra / Ras Beirut (matches form placeholders). */
const DEFAULT_CENTER = { lat: 33.897, lng: 35.482 };

type Props = {
  lat: string;
  lng: string;
  label?: string;
  onChange: (next: { lat: string; lng: string }) => void;
};

function parseCoord(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function resolveCenter(lat: string, lng: string): { lat: number; lng: number } {
  const la = parseCoord(lat);
  const ln = parseCoord(lng);
  if (la != null && ln != null && la >= -90 && la <= 90 && ln >= -180 && ln <= 180) {
    return { lat: la, lng: ln };
  }
  return DEFAULT_CENTER;
}

export function CampusPinPicker({ lat, lng, label, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  onChangeRef.current = onChange;

  const center = resolveCenter(lat, lng);
  const hasPin =
    parseCoord(lat) != null &&
    parseCoord(lng) != null &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = await loadMapbox();
        if (cancelled || !hostRef.current) return;

        const start = resolveCenter(lat, lng);
        const map = createSkounMap(mapboxgl, hostRef.current, start, 14);
        if (!map) {
          if (!cancelled) setTokenMissing(true);
          return;
        }
        mapRef.current = map;

        const marker = makeMarker(
          mapboxgl,
          campusPinHtml(label?.trim() || "Campus", true),
          start,
        );
        marker.setDraggable(true);
        marker.addTo(map);
        markerRef.current = marker;

        map.on("click", (e) => {
          const next = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          if (!isInLebanon(next)) {
            setPinError("Pin must be inside Lebanon.");
            return;
          }
          setPinError(null);
          marker.setLngLat(toLngLat(next));
          onChangeRef.current({
            lat: next.lat.toFixed(5),
            lng: next.lng.toFixed(5),
          });
        });

        marker.on("dragend", () => {
          const ll = marker.getLngLat();
          const next = { lat: ll.lat, lng: ll.lng };
          if (!isInLebanon(next)) {
            setPinError("Pin must be inside Lebanon.");
            return;
          }
          setPinError(null);
          onChangeRef.current({
            lat: next.lat.toFixed(5),
            lng: next.lng.toFixed(5),
          });
        });

        if (!cancelled) setMapReady(true);
      } catch {
        if (!cancelled) setTokenMissing(true);
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
    // Init once per dialog open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !mapReady) return;
    if (!hasPin) return;
    const next = { lat: Number(lat), lng: Number(lng) };
    marker.setLngLat(toLngLat(next));
    map.easeTo({ center: toLngLat(next), duration: 280 });
  }, [lat, lng, hasPin, mapReady]);

  return (
    <H>
      <H as="p" className="mb-2 text-sm font-medium text-clay-900">
        Campus pin
      </H>
      <H
        className="relative overflow-hidden rounded-neu-md bg-clay-50 shadow-neu-in"
        style={{ height: 220 }}
      >
        {tokenMissing ? (
          <H className="absolute inset-0 z-[2] flex items-center justify-center px-4 text-center text-xs text-clay-700">
            {MAP_TOKEN_MISSING_COPY}
          </H>
        ) : null}
        <div
          ref={hostRef}
          className="skoun-mapbox-map"
          style={{ width: "100%", height: "100%" }}
        />
      </H>
      <H as="p" className="mt-1.5 text-[11px] text-clay-500">
        Click map or drag pin. Walking-distance sort uses this point.
        {hasPin ? ` · ${formatCoordLabel(center)}` : " · No pin yet"}
      </H>
      {pinError ? (
        <H as="p" className="mt-1 text-[11px] font-medium text-ember">
          {pinError}
        </H>
      ) : null}
    </H>
  );
}
