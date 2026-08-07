const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(
  path.join(__dirname, "_amber-homepage-raw.html"),
  "utf8"
);

const out = [];
const log = (s) => {
  out.push(s);
  console.log(s);
};

// Unique CSS module prefixes
const mods = new Set();
for (const m of html.matchAll(/\b([A-Za-z][A-Za-z0-9]*)-module__/g)) {
  mods.add(m[1]);
}
log("=== CSS MODULE PREFIXES ===");
[...mods].sort().forEach((m) => log(m));

// All unique classes per interesting module
const interesting = [
  "Hero",
  "Header",
  "Navbar",
  "Nav",
  "Search",
  "Footer",
  "Home",
  "City",
  "Carousel",
  "Inventory",
  "Card",
  "Trust",
  "AppDownload",
  "Banner",
  "Featured",
  "Popular",
  "Testimonial",
  "Review",
  "Partner",
  "Country",
  "Property",
  "Compact",
  "Desktop",
  "Modal",
  "Dropdown",
  "Tab",
  "Sticky",
  "Button",
  "Input",
  "Image",
  "Video",
  "Marquee",
  "Slider",
  "Swiper",
];

const allClasses = new Set();
for (const m of html.matchAll(/\bclass=["']([^"']+)["']/gi)) {
  m[1].split(/\s+/).forEach((c) => c && allClasses.add(c));
}

log("\n=== CLASSES BY MODULE (filtered) ===");
const byMod = {};
[...allClasses].forEach((c) => {
  const mm = c.match(/^([A-Za-z][A-Za-z0-9]*)-module__(.+)$/);
  if (!mm) return;
  if (!interesting.some((i) => mm[1].includes(i) || c.toLowerCase().includes(i.toLowerCase())))
    return;
  byMod[mm[1]] = byMod[mm[1]] || new Set();
  byMod[mm[1]].add(mm[2]);
});
Object.keys(byMod)
  .sort()
  .forEach((k) => {
    log("\n## " + k);
    [...byMod[k]].sort().forEach((c) => log("  " + c));
  });

// Extract readable text blocks near key landmarks by stripping tags in chunks around ids
function contextAround(id, radius = 2500) {
  const idx = html.indexOf('id="' + id + '"');
  if (idx < 0) return null;
  const start = Math.max(0, idx - 500);
  const slice = html.slice(start, idx + radius);
  return slice
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "[SVG]")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

log("\n=== LANDMARK TEXT CONTEXT ===");
[
  "heroSectionSearchBar",
  "section-featured",
  "trendingProperties",
  "trustpilotReviews",
  "react-view",
].forEach((id) => {
  log("\n--- " + id + " ---");
  log(contextAround(id) || "(not found)");
});

// Find aria-labels and button texts
log("\n=== ARIA LABELS / BUTTON TEXTS ===");
const aria = [...html.matchAll(/aria-label=["']([^"']+)["']/gi)].map((m) => m[1]);
[...new Set(aria)].slice(0, 80).forEach((a) => log(a));

const btns = [...html.matchAll(/<(button|a)[^>]*>([\s\S]*?)<\/\1>/gi)];
const btnTexts = [];
btns.forEach((m) => {
  const t = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (t && t.length < 80 && t.length > 1) btnTexts.push(t);
});
log("\n=== SHORT LINK/BUTTON TEXTS (unique sample) ===");
[...new Set(btnTexts)].slice(0, 120).forEach((t) => log(t));

// data-testid values - great for section map
log("\n=== DATA-TESTID (unique) ===");
const tids = [...html.matchAll(/data-testid=["']([^"']+)["']/gi)].map((m) => m[1]);
[...new Set(tids)].forEach((t) => log(t));

// JSON-LD or __NEXT_DATA__ / window.__ / SSR state
log("\n=== EMBEDDED STATE HINTS ===");
const next = html.match(/__NEXT_DATA__/);
const helmet = html.includes("data-react-helmet");
const loadable = html.includes("data-chunk");
log("react-helmet: " + helmet);
log("data-chunk (loadable/webpack): " + loadable);
log("__NEXT_DATA__: " + !!next);
const windowAssigns = [
  ...html.matchAll(/window\.([A-Za-z0-9_$]+)\s*=/g),
].map((m) => m[1]);
log("window assigns: " + [...new Set(windowAssigns)].join(", "));

// Find application/ld+json
const ld = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
log("ld+json count: " + ld.length);
ld.slice(0, 3).forEach((s, i) => log("ld" + i + ": " + s[1].slice(0, 500)));

// Chunk names from data-chunk
const chunks = [...html.matchAll(/data-chunk=["']([^"']+)["']/gi)].map((m) => m[1]);
log("\n=== CHUNKS ===");
[...new Set(chunks)].forEach((c) => log(c));

// Count CompactInventoryCard etc for inventory density
log("\n=== COMPONENT COUNTS ===");
[
  "CompactInventoryCard",
  "CarouselIndicator",
  "carousel-module",
  "CityCard",
  "PopularCities",
  "Trustpilot",
  "AppDownload",
  "FooterDesktop",
  "HeaderDesktop",
  "Navbar",
  "SearchBar",
  "Hero",
].forEach((stem) => {
  const re = new RegExp(stem, "g");
  const n = (html.match(re) || []).length;
  log(stem + ": " + n);
});

// Extract first 8k of body after react-view for structure peek with class names preserved more smartly
const rv = html.indexOf('id="react-view"');
log("\n=== STRUCTURE SKELETON (class sequence) ===");
if (rv > 0) {
  const body = html.slice(rv, rv + 200000);
  // get sequence of opening tags with classes that are module classes
  const seq = [];
  for (const m of body.matchAll(/<(div|section|header|footer|nav|main|form|ul|li|button|a|h[1-6]|input|img)([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    const cls = (m[2].match(/class=["']([^"']+)["']/) || [])[1] || "";
    const id = (m[2].match(/id=["']([^"']+)["']/) || [])[1] || "";
    const modsOnly = cls
      .split(/\s+/)
      .filter((c) => c.includes("-module__") || c.includes("Carousel") || ["header", "footer", "nav", "section", "main", "form"].includes(tag))
      .slice(0, 3)
      .join(" ");
    if (modsOnly || id) {
      seq.push(tag + (id ? "#" + id : "") + (modsOnly ? "." + modsOnly.split(" ")[0] : ""));
    }
    if (seq.length > 250) break;
  }
  seq.forEach((s) => log(s));
}

fs.writeFileSync(path.join(__dirname, "_amber-structure.txt"), out.join("\n"));
console.log("\nWrote _amber-structure.txt lines=" + out.length);
