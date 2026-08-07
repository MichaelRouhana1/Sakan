const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
  path.join(__dirname, "_amber-homepage-raw.html"),
  "utf8"
);

// Strip to text with markers for key headings
function strip(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const markers = [
  "Home away from home",
  "Popular Cities Across the Globe",
  "Thousands of properties globally",
  "Book your Perfect Accommodation",
  "Amber Referral Program",
  "Book your place in 3 easy steps",
  "We have the best partners",
  "Featured In",
  "Hundreds of cities around the world",
  "Need help",
  "Get Help",
  "Download the",
  "Follow Us",
  "Company",
  "Trust of 2 Million",
  "Read all reviews",
  "List With Us",
  "Partner With Us",
  "2M+ Beds",
];

const text = strip(html);
const out = [];
markers.forEach((m) => {
  const idx = text.indexOf(m);
  out.push("\n==== " + m + " @" + idx + " ====");
  if (idx >= 0) out.push(text.slice(idx, idx + 900));
});

// Fonts / link tags in head portion
const head = html.slice(0, 50000);
out.push("\n==== FONT / LINK HINTS IN HEAD ====");
[...head.matchAll(/font[^"'\s<>]*/gi)].slice(0, 30).forEach((m) => out.push(m[0]));
[...head.matchAll(/href=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((h) => /font|css|static/i.test(h))
  .slice(0, 40)
  .forEach((h) => out.push(h));

// Find __INITIAL_STATE__ snippet keys
const initIdx = html.indexOf("window.__INITIAL_STATE__");
out.push("\n==== INITIAL STATE START ====");
if (initIdx >= 0) {
  out.push(html.slice(initIdx, initIdx + 2000));
}

// Image urls more thoroughly - also background urls
const imgs = new Set();
for (const m of html.matchAll(
  /https:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp|svg|gif|avif)(?:\?[^"'\\\s>]*)?/gi
)) {
  imgs.add(m[0]);
}
out.push("\n==== ALL IMAGE URLS (" + imgs.size + ") ====");
[...imgs].forEach((u) => out.push(u));

fs.writeFileSync(path.join(__dirname, "_amber-copy-assets.txt"), out.join("\n"));
console.log("done", imgs.size, "images");
