import type { Camera, MapState } from "@rnmapbox/maps";
import { zoomFromLongitudeDelta } from "@/lib/mapClusters";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function mapStateToRegion(state: MapState): MapRegion | null {
  const center = state.properties.center;
  const bounds = state.properties.bounds;
  if (!center || center.length < 2 || !bounds?.ne || !bounds?.sw) return null;
  const lng = center[0];
  const lat = center[1];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  const ne = bounds.ne;
  const sw = bounds.sw;
  if (ne.length < 2 || sw.length < 2) return null;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: Math.abs(Number(ne[1]) - Number(sw[1])),
    longitudeDelta: Math.abs(Number(ne[0]) - Number(sw[0])),
  };
}

export function fitCoords(
  camera: Camera | null,
  coords: { latitude: number; longitude: number }[],
  padding: { top: number; right: number; bottom: number; left: number },
  durationMs: number,
): void {
  if (!camera || coords.length === 0) return;
  let minLat = coords[0].latitude;
  let maxLat = minLat;
  let minLng = coords[0].longitude;
  let maxLng = minLng;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  }
  camera.fitBounds(
    [maxLng, maxLat],
    [minLng, minLat],
    [padding.top, padding.right, padding.bottom, padding.left],
    durationMs,
  );
}

export function animateRegion(
  camera: Camera | null,
  region: MapRegion,
  viewportWidthPx: number,
  durationMs: number,
): void {
  if (!camera) return;
  camera.setCamera({
    centerCoordinate: [region.longitude, region.latitude],
    zoomLevel: zoomFromLongitudeDelta(region.longitudeDelta, viewportWidthPx),
    animationDuration: durationMs,
    animationMode: durationMs <= 0 ? "none" : "easeTo",
  });
}
