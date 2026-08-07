const fs = require("fs");
const path = require("path");

const files = [
  "_amber-main.css",
  "_amber-home-1343.css",
  "_amber-home-9409.css",
  "_amber-home-3765.css",
  "_amber-home-9163.css",
  "_amber-home-245.css",
  "_amber-home-3803.css",
  "_amber-home-4319.css",
  "_amber-home-8889.css",
  "_amber-home-6196.css",
];

const out = [];
const log = (s) => {
  out.push(s);
  console.log(s);
};

function extractColors(css) {
  const colors = new Set();
  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) colors.add(m[0].toLowerCase());
  for (const m of css.matchAll(/rgba?\([^)]+\)/g)) colors.add(m[0]);
  for (const m of css.matchAll(/hsla?\([^)]+\)/g)) colors.add(m[0]);
  return [...colors];
}

function extractVars(css) {
  const defs = [...css.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;}{]+)/g)].map(
    (m) => `--${m[1]}: ${m[2].trim()}`
  );
  return defs;
}

function extractFonts(css) {
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/gi)].map((m) => m[0]);
  const families = [
    ...css.matchAll(/font-family\s*:\s*([^;}{]+)/gi),
  ].map((m) => m[1].trim());
  return { faces, families: [...new Set(families)] };
}

function extractKeyframes(css) {
  // crude: find @keyframes name { ... } with brace matching
  const results = [];
  const re = /@keyframes\s+([^{]+)\s*\{/gi;
  let m;
  while ((m = re.exec(css))) {
    const name = m[1].trim();
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    results.push({ name, body: css.slice(m.index, i).slice(0, 800) });
  }
  return results;
}

function extractMedia(css) {
  return [...css.matchAll(/@media[^{]+/gi)].map((m) => m[0].trim());
}

function extractRulesFor(css, stems) {
  const hits = [];
  // split roughly by } then filter
  const parts = css.split("}");
  for (const p of parts) {
    if (!stems.some((s) => p.includes(s))) continue;
    const rule = (p + "}").trim();
    if (rule.length < 20) continue;
    hits.push(rule.slice(0, 600));
    if (hits.length > 80) break;
  }
  return hits;
}

for (const f of files) {
  const css = fs.readFileSync(path.join(__dirname, f), "utf8");
  log("\n========== " + f + " len=" + css.length + " ==========");

  const colors = extractColors(css);
  log("\n--- COLORS (" + colors.length + ") ---");
  colors.forEach((c) => log(c));

  const vars = extractVars(css);
  log("\n--- CSS VARS (" + vars.length + ") ---");
  vars.slice(0, 120).forEach((v) => log(v));

  const fonts = extractFonts(css);
  log("\n--- FONT FACES (" + fonts.faces.length + ") ---");
  fonts.faces.forEach((ff) => log(ff.slice(0, 500)));
  log("--- FONT FAMILIES ---");
  fonts.families.forEach((ff) => log(ff));

  const kfs = extractKeyframes(css);
  log("\n--- KEYFRAMES (" + kfs.length + ") ---");
  kfs.forEach((k) => {
    log("NAME: " + k.name);
    log(k.body);
    log("---");
  });

  const media = extractMedia(css);
  log("\n--- MEDIA QUERIES (" + media.length + ") unique ---");
  [...new Set(media)].forEach((mq) => log(mq));

  // radius / shadow / transition samples
  const radii = [...css.matchAll(/border-radius\s*:\s*([^;}{]+)/gi)].map((m) =>
    m[1].trim()
  );
  log("\n--- BORDER RADIUS UNIQUE ---");
  [...new Set(radii)].slice(0, 40).forEach((r) => log(r));

  const shadows = [...css.matchAll(/box-shadow\s*:\s*([^;}{]+)/gi)].map((m) =>
    m[1].trim()
  );
  log("\n--- BOX SHADOWS UNIQUE ---");
  [...new Set(shadows)].slice(0, 40).forEach((r) => log(r));

  const transitions = [
    ...css.matchAll(/transition\s*:\s*([^;}{]+)/gi),
  ].map((m) => m[1].trim());
  log("\n--- TRANSITIONS UNIQUE ---");
  [...new Set(transitions)].slice(0, 50).forEach((r) => log(r));

  const gradients = [
    ...css.matchAll(
      /(?:linear|radial|conic)-gradient\([^;)]*(?:\([^)]*\)[^;)]*)*\)/gi
    ),
  ].map((m) => m[0]);
  log("\n--- GRADIENTS ---");
  [...new Set(gradients)].slice(0, 40).forEach((r) => log(r));
}

// Cross-file: rules for homepage modules
log("\n\n========== HOMEPAGE MODULE RULES ==========");
const allCss = files
  .map((f) => fs.readFileSync(path.join(__dirname, f), "utf8"))
  .join("\n");

const stems = [
  "HeroSectionDesktopStyles",
  "SearchInputDesktop",
  "searchModalDesktop",
  "popularCitites",
  "insights",
  "ThousandProperties",
  "ThreeSteps",
  "TrustPilot",
  "AppDownload",
  "FooterDesktop",
  "bookYourPerfect",
  "ReferralProgram",
  "featuredIn",
  "bestPartners",
  "GetHelpDesktop",
  "ListWithUs",
  "HundredsOfCities",
  "HorizontalScroll",
  "carousel-module",
  "CarouselIndicator",
  "CompactInventoryCard",
  "Image-module",
  "Ripple",
  "ticker",
  "animateWords",
  "withPinkGradient",
  "SmallFeatures",
  "StepCard",
  "subsection",
];

stems.forEach((stem) => {
  log("\n#### STEM: " + stem);
  extractRulesFor(allCss, [stem]).slice(0, 12).forEach((r) => log(r + "\n"));
});

// Also dump beginning of each css for token inspection
log("\n\n========== CSS HEAD PREVIEWS ==========");
for (const f of files) {
  const css = fs.readFileSync(path.join(__dirname, f), "utf8");
  log("\n--- " + f + " first 2500 chars ---");
  log(css.slice(0, 2500));
}

fs.writeFileSync(path.join(__dirname, "_amber-css-extract.txt"), out.join("\n"));
console.log("Wrote css extract, lines=" + out.length);
