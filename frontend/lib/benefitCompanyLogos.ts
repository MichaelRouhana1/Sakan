import type { ImageSourcePropType } from "react-native";

/**
 * Local brand marks for benefit coupons. Keyed by normalized company name
 * (lowercase trim). Companies without an entry keep the category icon.
 */
const BY_NAME: Record<string, ImageSourcePropType> = {
  alfa: require("../assets/benefits/alfa.png"),
  touch: require("../assets/benefits/touch.png"),
  "bank audi neo": require("../assets/benefits/neo.png"),
  "blom bank next": require("../assets/benefits/blom.png"),
  "isic (gts alive middle east)": require("../assets/benefits/isic.png"),
  "allo taxi": require("../assets/benefits/allotaxi.png"),
  noknok: require("../assets/benefits/noknok.png"),
  "github education": require("../assets/benefits/github-education.png"),
  github: require("../assets/benefits/github.png"),
  "github copilot": require("../assets/benefits/github-copilot.png"),
  jetbrains: require("../assets/benefits/jetbrains.png"),
  "microsoft azure": require("../assets/benefits/azure.png"),
  "microsoft 365 education": require("../assets/benefits/microsoft-365.png"),
  notion: require("../assets/benefits/notion.png"),
  figma: require("../assets/benefits/figma.png"),
  adobe: require("../assets/benefits/adobe.png"),
  autodesk: require("../assets/benefits/autodesk.png"),
  unity: require("../assets/benefits/unity.png"),
  heroku: require("../assets/benefits/heroku.png"),
  mongodb: require("../assets/benefits/mongodb.png"),
  namecheap: require("../assets/benefits/namecheap.png"),
  aws: require("../assets/benefits/aws.png"),
  "1password": require("../assets/benefits/1password.png"),
  termius: require("../assets/benefits/termius.png"),
  appwrite: require("../assets/benefits/appwrite.png"),
  youtube: require("../assets/benefits/youtube.png"),
  "apple music": require("../assets/benefits/apple-music.png"),
  spotify: require("../assets/benefits/spotify.png"),
  "falafel abou andre": require("../assets/benefits/falafel-abou-andre.png"),
  "bank of beirut": require("../assets/benefits/bank-of-beirut.png"),
  "aub charles hostler student center": require("../assets/benefits/aub-hostler.png"),
  "usj carte privilège": require("../assets/benefits/usj-carte.png"),
  "f45 training": require("../assets/benefits/f45.png"),
  pizzanini: require("../assets/benefits/pizzanini.png"),
  crepaway: require("../assets/benefits/crepaway.png"),
  "burger king": require("../assets/benefits/burger-king.png"),
  "billy boyz": require("../assets/benefits/billy-boyz.png"),
  istyle: require("../assets/benefits/istyle.png"),
  "usek marketing office": require("../assets/benefits/usek.png"),
  "la crêperie": require("../assets/benefits/la-creperie.png"),
  "poule d'or": require("../assets/benefits/poule-dor.png"),
  "senses health gym": require("../assets/benefits/senses-gym.png"),
  rooster: require("../assets/benefits/rooster.png"),
  "qatar airways": require("../assets/benefits/qatar-airways.png"),
  google: require("../assets/benefits/google.png"),
  perplexity: require("../assets/benefits/perplexity.png"),
  tableau: require("../assets/benefits/tableau.png"),
  mathworks: require("../assets/benefits/matlab.png"),
  datacamp: require("../assets/benefits/datacamp.png"),
  "frontend masters": require("../assets/benefits/frontend-masters.png"),
  educative: require("../assets/benefits/educative.png"),
  gitkraken: require("../assets/benefits/gitkraken.png"),
  "name.com": require("../assets/benefits/name-com.png"),
  datadog: require("../assets/benefits/datadog.png"),
  deepnote: require("../assets/benefits/deepnote.png"),
  sentry: require("../assets/benefits/sentry.png"),
  stripe: require("../assets/benefits/stripe.png"),
  "boot.dev": require("../assets/benefits/boot-dev.png"),
  "codédex": require("../assets/benefits/codedex.png"),
  codedex: require("../assets/benefits/codedex.png"),
  ".tech": require("../assets/benefits/tech-domains.png"),
  "bootstrap studio": require("../assets/benefits/bootstrap-studio.png"),
  "new relic": require("../assets/benefits/new-relic.png"),
  browserstack: require("../assets/benefits/browserstack.png"),
  arduino: require("../assets/benefits/arduino.png"),
  dashlane: require("../assets/benefits/dashlane.png"),
  localstack: require("../assets/benefits/localstack.png"),
  icons8: require("../assets/benefits/icons8.png"),
  overleaf: require("../assets/benefits/overleaf.png"),
  miro: require("../assets/benefits/miro.png"),
  lucidchart: require("../assets/benefits/lucidchart.png"),
  wolfram: require("../assets/benefits/wolfram.png"),
  "fitness zone": require("../assets/benefits/fitness-zone.png"),
  anghami: require("../assets/benefits/anghami.png"),
  "apple tv": require("../assets/benefits/apple-tv.png"),
  macam: require("../assets/benefits/macam.png"),
  "al bustan festival": require("../assets/benefits/al-bustan.png"),
  "lau cinema club": require("../assets/benefits/lau-cinema-club.png"),
  "superheated neurons": require("../assets/benefits/superheated-neurons.png"),
};

export function benefitCompanyLogo(
  companyName: string,
): ImageSourcePropType | undefined {
  const key = companyName.trim().toLowerCase();
  if (BY_NAME[key]) return BY_NAME[key];

  if (key.includes("spotify")) return BY_NAME.spotify;
  if (key.startsWith("isic")) return BY_NAME["isic (gts alive middle east)"];
  if (key.includes("audi") && key.includes("neo")) return BY_NAME["bank audi neo"];
  if (key.includes("blom")) return BY_NAME["blom bank next"];
  if (key.includes("allo") && key.includes("taxi")) return BY_NAME["allo taxi"];
  if (key.includes("usj") && key.includes("carte")) return BY_NAME["usj carte privilège"];
  if (key.includes("crêperie") || key.includes("creperie"))
    return BY_NAME["la crêperie"];
  if (key.includes("poule")) return BY_NAME["poule d'or"];
  if (key.includes("hostler") || (key.includes("aub") && key.includes("charles")))
    return BY_NAME["aub charles hostler student center"];
  if (key.includes("senses")) return BY_NAME["senses health gym"];
  if (key.includes("usek")) return BY_NAME["usek marketing office"];
  if (key.includes("falafel")) return BY_NAME["falafel abou andre"];
  if (key.includes("f45")) return BY_NAME["f45 training"];
  if (key.includes("matlab") || key.includes("mathworks")) return BY_NAME.mathworks;
  if (key.includes("cod") && key.includes("dex")) return BY_NAME.codedex;
  if (key === ".tech" || key.includes("get.tech")) return BY_NAME[".tech"];
  if (key.includes("frontend") && key.includes("master"))
    return BY_NAME["frontend masters"];
  if (key.includes("boot.dev") || key.includes("bootdev")) return BY_NAME["boot.dev"];
  if (key.includes("new relic")) return BY_NAME["new relic"];
  if (key.includes("lucid")) return BY_NAME.lucidchart;
  if (key.includes("fitness zone")) return BY_NAME["fitness zone"];
  if (key.includes("anghami")) return BY_NAME.anghami;
  if (key.includes("apple tv")) return BY_NAME["apple tv"];
  if (key.includes("macam")) return BY_NAME.macam;
  if (key.includes("bustan")) return BY_NAME["al bustan festival"];
  if (key.includes("lau") && key.includes("cinema"))
    return BY_NAME["lau cinema club"];
  if (key.includes("superheated") || key.includes("neurons"))
    return BY_NAME["superheated neurons"];

  return undefined;
}
