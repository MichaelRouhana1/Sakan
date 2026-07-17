/** Lebanese districts / cities for Standard search mode. */
export const LEBANON_AREAS = [
  "Achrafieh",
  "Mar Mikhael",
  "Gemmayzeh",
  "Hamra",
  "Ras Beirut",
  "Verdun",
  "Jnah",
  "Jounieh",
  "Byblos",
  "Tripoli",
  "Saida",
  "Zahle",
  "Broummana",
  "Dbayeh",
  "Antelias",
] as const;

export type LebanonArea = (typeof LEBANON_AREAS)[number];
