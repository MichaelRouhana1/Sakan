import type { LebanonArea } from "./lebanonAreas.js";

/** Approximate area centers — map / suggestions only, not publish coords. */
export type LatLng = { lat: number; lng: number };

export const AREA_COORDINATES: Record<LebanonArea, LatLng> = {
  Achrafieh: { lng: 35.519, lat: 33.888 },
  "Mar Mikhael": { lng: 35.527, lat: 33.897 },
  Gemmayzeh: { lng: 35.513, lat: 33.897 },
  Hamra: { lng: 35.482, lat: 33.897 },
  "Ras Beirut": { lng: 35.475, lat: 33.9 },
  Verdun: { lng: 35.483, lat: 33.885 },
  Jnah: { lng: 35.478, lat: 33.868 },
  Badaro: { lng: 35.515, lat: 33.878 },
  "Furn El Chebbak": { lng: 35.522, lat: 33.87 },
  "Tariq El Jdide": { lng: 35.503, lat: 33.87 },
  Broummana: { lng: 35.621, lat: 33.883 },
  Dbayeh: { lng: 35.598, lat: 33.936 },
  Antelias: { lng: 35.598, lat: 33.917 },
  Fanar: { lng: 35.58, lat: 33.879 },
  Dekwaneh: { lng: 35.544, lat: 33.876 },
  Jounieh: { lng: 35.648, lat: 33.981 },
  Kaslik: { lng: 35.618, lat: 33.982 },
  "Zouk Mosbeh": { lng: 35.614, lat: 33.951 },
  Byblos: { lng: 35.648, lat: 34.123 },
  Aley: { lng: 35.6, lat: 33.805 },
  Bhamdoun: { lng: 35.651, lat: 33.808 },
  Tripoli: { lng: 35.844, lat: 34.436 },
  Saida: { lng: 35.372, lat: 33.563 },
  Tyre: { lng: 35.193, lat: 33.27 },
  Nabatieh: { lng: 35.484, lat: 33.377 },
  Zahle: { lng: 35.902, lat: 33.846 },
  Baalbek: { lng: 36.204, lat: 34.006 },
};

export function areaCenter(area: LebanonArea): LatLng {
  return AREA_COORDINATES[area];
}
