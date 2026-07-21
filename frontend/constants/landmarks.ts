import type { LebanonArea } from "./areas";

export type AreaLandmark = {
  id: string;
  label: string;
  lng: number;
  lat: number;
};

/**
 * Curated neighborhood landmarks with real coords (WGS84).
 * Selecting one sets both the map pin and the landmark label.
 */
export const AREA_LANDMARKS: Partial<Record<LebanonArea, AreaLandmark[]>> = {
  Achrafieh: [
    {
      id: "ach-sassine",
      label: "Near Sassine Square",
      lng: 35.5198,
      lat: 33.8865,
    },
    {
      id: "ach-abcd",
      label: "Near ABC Achrafieh",
      lng: 35.5192,
      lat: 33.8896,
    },
    {
      id: "ach-sofiel",
      label: "Near Sofil Center",
      lng: 35.5221,
      lat: 33.8878,
    },
  ],
  "Mar Mikhael": [
    {
      id: "mm-train",
      label: "Near Mar Mikhael train tracks",
      lng: 35.5284,
      lat: 33.8978,
    },
    {
      id: "mm-armenia",
      label: "Near Armenia Street",
      lng: 35.5265,
      lat: 33.8965,
    },
  ],
  Gemmayzeh: [
    {
      id: "gem-gourd",
      label: "Near Gouraud Street",
      lng: 35.5145,
      lat: 33.8972,
    },
    {
      id: "gem-starco",
      label: "Near Starco Center",
      lng: 35.5088,
      lat: 33.8985,
    },
  ],
  Hamra: [
    {
      id: "ham-bliss",
      label: "Near Bliss Street / AUB",
      lng: 35.4823,
      lat: 33.8998,
    },
    {
      id: "ham-hamra",
      label: "Near Hamra Street",
      lng: 35.4815,
      lat: 33.8968,
    },
    {
      id: "ham-verdun-edge",
      label: "Near Hamra–Verdun edge",
      lng: 35.4842,
      lat: 33.8915,
    },
  ],
  "Ras Beirut": [
    {
      id: "rb-corniche",
      label: "Near Corniche",
      lng: 35.4725,
      lat: 33.9015,
    },
    {
      id: "rb-aub",
      label: "Near AUB Main Gate",
      lng: 35.4798,
      lat: 33.9005,
    },
  ],
  Verdun: [
    {
      id: "ver-abc",
      label: "Near ABC Verdun",
      lng: 35.4838,
      lat: 33.8842,
    },
    {
      id: "ver-dunes",
      label: "Near Verdun Street",
      lng: 35.4825,
      lat: 33.886,
    },
  ],
  Jnah: [
    {
      id: "jnah-airport",
      label: "Near Airport Road",
      lng: 35.4885,
      lat: 33.862,
    },
    {
      id: "jnah-city",
      label: "Near City Mall",
      lng: 35.492,
      lat: 33.8655,
    },
  ],
  Jounieh: [
    {
      id: "jou-old",
      label: "Near Old Souk",
      lng: 35.6485,
      lat: 33.9805,
    },
    {
      id: "jou-kaslik",
      label: "Near Kaslik",
      lng: 35.635,
      lat: 33.975,
    },
  ],
  Byblos: [
    {
      id: "byb-port",
      label: "Near Old Port",
      lng: 35.6475,
      lat: 34.1208,
    },
    {
      id: "byb-useb",
      label: "Near USEK campus",
      lng: 35.6481,
      lat: 34.1217,
    },
  ],
  Tripoli: [
    {
      id: "tri-mina",
      label: "Near Mina",
      lng: 35.834,
      lat: 34.451,
    },
    {
      id: "tri-azmi",
      label: "Near Azmi Street",
      lng: 35.838,
      lat: 34.433,
    },
  ],
  Saida: [
    {
      id: "sai-castle",
      label: "Near Sea Castle",
      lng: 35.3715,
      lat: 33.5638,
    },
    {
      id: "sai-old",
      label: "Near Old Souk",
      lng: 35.3735,
      lat: 33.5615,
    },
  ],
  Zahle: [
    {
      id: "zah-bardouni",
      label: "Near Bardouni",
      lng: 35.9015,
      lat: 33.8475,
    },
  ],
  Broummana: [
    {
      id: "bro-main",
      label: "Near Main Street",
      lng: 35.6215,
      lat: 33.884,
    },
  ],
  Dbayeh: [
    {
      id: "dba-waterfront",
      label: "Near Waterfront City",
      lng: 35.595,
      lat: 33.938,
    },
    {
      id: "dba-le-mall",
      label: "Near Le Mall",
      lng: 35.5995,
      lat: 33.9345,
    },
  ],
  Antelias: [
    {
      id: "ant-round",
      label: "Near Antelias Roundabout",
      lng: 35.5985,
      lat: 33.9165,
    },
  ],
};

export function landmarksForArea(area: LebanonArea): AreaLandmark[] {
  return AREA_LANDMARKS[area] ?? [];
}
