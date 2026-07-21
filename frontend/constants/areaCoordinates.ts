import type { LebanonArea } from "./areas";
import { toWkt, type LatLng } from "@/lib/locationWkt";

/** Approximate area centers — map initial center only, not publish coords. */
export const AREA_COORDINATES: Record<LebanonArea, LatLng> = {
  Achrafieh: { lng: 35.519, lat: 33.888 },
  "Mar Mikhael": { lng: 35.527, lat: 33.897 },
  Gemmayzeh: { lng: 35.513, lat: 33.897 },
  Hamra: { lng: 35.482, lat: 33.897 },
  "Ras Beirut": { lng: 35.475, lat: 33.9 },
  Verdun: { lng: 35.483, lat: 33.885 },
  Jnah: { lng: 35.478, lat: 33.868 },
  Jounieh: { lng: 35.648, lat: 33.981 },
  Byblos: { lng: 35.648, lat: 34.123 },
  Tripoli: { lng: 35.844, lat: 34.436 },
  Saida: { lng: 35.372, lat: 33.563 },
  Zahle: { lng: 35.902, lat: 33.846 },
  Broummana: { lng: 35.621, lat: 33.883 },
  Dbayeh: { lng: 35.598, lat: 33.936 },
  Antelias: { lng: 35.598, lat: 33.917 },
};

/** @deprecated Use a confirmed pin/landmark. Centroid is for map centering only. */
export function areaToWkt(area: LebanonArea): string {
  return toWkt(AREA_COORDINATES[area]);
}

export function areaCenter(area: LebanonArea): LatLng {
  return AREA_COORDINATES[area];
}
