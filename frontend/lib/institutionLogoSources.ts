import type { ImageSourcePropType } from "react-native";

/** Seals that already fill a square — draw edge-to-edge in the avatar. */
const CIRCULAR_SEAL_SLUGS = new Set([
  "aku",
  "aub",
  "auce",
  "aul",
  "aust",
  "aut",
  "azm",
  "bau",
  "city-university",
  "global",
  "haigazian",
  "iub",
  "iul",
  "jinan",
  "lau",
  "lgu",
  "liu",
  "maaref",
  "makassed",
  "ndu",
  "phoenicia",
  "ua",
  "uls",
  "usal",
  "usek",
  "usj",
  "uob",
  "ut",
]);

/** Wordmarks still waiting on a true circular seal. */
export const NON_CIRCULAR_LOGO_SLUGS = [
  "aou",
  "biu",
  "hfu",
  "lcu",
  "meu",
  "mubs",
  "rhu",
  "ulf",
] as const;

export function isCircularInstitutionSeal(slug?: string | null): boolean {
  return Boolean(slug && CIRCULAR_SEAL_SLUGS.has(slug));
}

/** Local marks keyed by institution slug. */
export const INSTITUTION_LOGO_SOURCES: Record<string, ImageSourcePropType> = {
  aku: require("@/assets/institutions/aku.png"),
  aou: require("@/assets/institutions/aou.png"),
  aub: require("@/assets/institutions/aub.png"),
  auce: require("@/assets/institutions/auce.png"),
  aul: require("@/assets/institutions/aul.jpg"),
  aust: require("@/assets/institutions/aust.jpg"),
  aut: require("@/assets/institutions/aut.png"),
  azm: require("@/assets/institutions/azm.webp"),
  bau: require("@/assets/institutions/bau.png"),
  biu: require("@/assets/institutions/biu.jpg"),
  "city-university": require("@/assets/institutions/city-university.png"),
  global: require("@/assets/institutions/global.jpg"),
  haigazian: require("@/assets/institutions/haigazian.png"),
  hfu: require("@/assets/institutions/hfu.jpg"),
  iub: require("@/assets/institutions/iub.png"),
  iul: require("@/assets/institutions/iul.png"),
  jinan: require("@/assets/institutions/jinan.jpg"),
  lau: require("@/assets/institutions/lau.png"),
  lcu: require("@/assets/institutions/lcu.jpg"),
  lgu: require("@/assets/institutions/lgu.png"),
  liu: require("@/assets/institutions/liu.jpg"),
  maaref: require("@/assets/institutions/maaref.jpg"),
  makassed: require("@/assets/institutions/makassed.jpg"),
  meu: require("@/assets/institutions/meu.png"),
  mubs: require("@/assets/institutions/mubs.png"),
  ndu: require("@/assets/institutions/ndu.png"),
  phoenicia: require("@/assets/institutions/phoenicia.png"),
  rhu: require("@/assets/institutions/rhu.jpg"),
  ua: require("@/assets/institutions/ua.png"),
  ulf: require("@/assets/institutions/ulf.png"),
  uls: require("@/assets/institutions/uls.png"),
  uob: require("@/assets/institutions/uob.png"),
  usal: require("@/assets/institutions/usal.jpg"),
  usek: require("@/assets/institutions/usek.png"),
  usj: require("@/assets/institutions/usj.jpg"),
  ut: require("@/assets/institutions/ut.jpg"),
};

export function institutionLogoSource(
  slug?: string | null,
): ImageSourcePropType | undefined {
  if (!slug) return undefined;
  return INSTITUTION_LOGO_SOURCES[slug];
}
