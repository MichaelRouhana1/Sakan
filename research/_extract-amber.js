const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(
  path.join(__dirname, "_amber-homepage-raw.html"),
  "utf8"
);

const out = [];
function log(s) {
  out.push(s);
  console.log(s);
}

log("HTML length: " + html.length);

// CSS
const cssHrefs = [
  ...html.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi),
].map((m) => m[1]);
log("\n=== CSS HREFS ===");
[...new Set(cssHrefs)].forEach((h) => log(h));

// Scripts
const scripts = [
  ...html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi),
].map((m) => m[1]);
log("\n=== SCRIPT SRCS ===");
[...new Set(scripts)].forEach((h) => log(h));

// Preloads
const preloadHrefs = [
  ...html.matchAll(
    /<link[^>]+rel=["'](modulepreload|preload|prefetch)["'][^>]*>/gi
  ),
].map((m) => m[0]);
log("\n=== PRELOAD TAGS (first 80) ===");
preloadHrefs.slice(0, 80).forEach((p) => log(p.slice(0, 400)));

// Class names frequency
const classes = [];
for (const m of html.matchAll(/\bclass=["']([^"']+)["']/gi)) {
  m[1].split(/\s+/).forEach((c) => {
    if (c) classes.push(c);
  });
}
const freq = {};
classes.forEach((c) => {
  freq[c] = (freq[c] || 0) + 1;
});
const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
log("\n=== TOP 150 CLASS NAMES ===");
sorted.slice(0, 150).forEach(([c, n]) => log(n + "\t" + c));

// Interesting interactive-ish classes
log("\n=== INTERACTIVE-ISH CLASSES ===");
const stems =
  /hero|animate|scroll|slide|reveal|split|parallax|hover|active|open|toggle|carousel|marquee|modal|drawer|sticky|nav|search|banner|footer|header|swiper|slick|fade|video|loader|transition|map|city|listing|card|tab|accordion|dropdown|menu|chip|pill|filter|gallery|testimonial|review|partner|trust|cta|form|input|btn|button|logo|badge|skeleton|shimmer|lazy/i;
sorted
  .filter(([c]) => stems.test(c))
  .slice(0, 200)
  .forEach(([c, n]) => log(n + "\t" + c));

// Images
const imgs = [
  ...html.matchAll(
    /(?:src|data-src|srcset)=["']([^"']+\.(?:png|jpe?g|webp|svg|gif|avif)[^"']*)["']/gi
  ),
].map((m) => m[1]);
log("\n=== IMAGE URLS (unique, first 120) ===");
[...new Set(imgs)].slice(0, 120).forEach((h) => log(h));

// Videos
const vids = [
  ...html.matchAll(
    /(?:src|data-src)=["']([^"']+\.(?:mp4|webm|mov)[^"']*)["']/gi
  ),
].map((m) => m[1]);
log("\n=== VIDEO URLS ===");
[...new Set(vids)].forEach((h) => log(h));

// Meta
log("\n=== TITLE / META ===");
const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
if (title) log("title: " + title[1]);
const metas = [...html.matchAll(/<meta[^>]+>/gi)].map((m) => m[0]);
metas
  .filter((m) => /description|og:|twitter:|theme-color|author/i.test(m))
  .slice(0, 40)
  .forEach((m) => log(m.slice(0, 300)));

// Semantic structure hints - section tags and data attributes
log("\n=== SECTION / DATA ATTR HINTS ===");
const sections = [...html.matchAll(/<(section|header|footer|main|nav)([^>]*)>/gi)];
log("semantic tags count: " + sections.length);
sections.slice(0, 60).forEach((m) => log(m[0].slice(0, 250)));

// data-testid / data-qa / id attributes that look like sections
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]);
log("\n=== IDS ===");
[...new Set(ids)].slice(0, 80).forEach((h) => log(h));

const dataAttrs = [
  ...html.matchAll(/\b(data-[a-zA-Z0-9_-]+)=["']([^"']{0,80})["']/gi),
];
const dataKeys = {};
dataAttrs.forEach((m) => {
  dataKeys[m[1]] = (dataKeys[m[1]] || 0) + 1;
});
log("\n=== DATA ATTR KEYS ===");
Object.entries(dataKeys)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 60)
  .forEach(([k, n]) => log(n + "\t" + k));

// Inline styles sample
const styleTags = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
log("\n=== STYLE TAGS: " + styleTags.length + " ===");
styleTags.forEach((s, i) => {
  log("\n--- style tag " + i + " len=" + s[1].length + " ---");
  log(s[1].slice(0, 3000));
});

// Text content sample - headings
const headings = [
  ...html.matchAll(/<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi),
];
log("\n=== HEADINGS (" + headings.length + ") ===");
headings.slice(0, 80).forEach((m) => {
  const text = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  log(m[1] + ": " + text.slice(0, 120));
});

// Anchors / nav links
const hrefs = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)].map(
  (m) => m[1]
);
log("\n=== INTERNAL LINKS (sample) ===");
[...new Set(hrefs)]
  .filter((h) => h.startsWith("/") || h.includes("amberstudent"))
  .slice(0, 100)
  .forEach((h) => log(h));

fs.writeFileSync(path.join(__dirname, "_amber-extract.txt"), out.join("\n"));
console.log("\nWrote _amber-extract.txt");
