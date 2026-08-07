const fs = require("fs");
const path = require("path");

const files = ["_amber-main.js", "_amber-home-1343.js"].filter((f) =>
  fs.existsSync(path.join(__dirname, f))
);

const needles = [
  "animateWords",
  "animateOpacity",
  "IntersectionObserver",
  "requestAnimationFrame",
  "scrollLeft",
  "scrollTo",
  "addEventListener",
  "gsap",
  "GSAP",
  "framer",
  "swiper",
  "lottie",
  "anime",
  "transition",
  "transform",
  "carousel",
  "HorizontalScroll",
  "shimmer",
  "Ripple",
  "ticker",
  "placeholder",
  "typewriter",
  "setInterval",
  "setTimeout",
  "activePill",
  "pillsActive",
  "showNavOnHover",
  "partytown",
  "react-slick",
  "embla",
  "keen-slider",
  "loadable",
  "@loadable",
  "react-helmet",
  "redux",
  "createStore",
  "__INITIAL_STATE__",
  "Trustpilot",
  "whatsapp",
  "shortlist",
  "heroImg",
  "overlayBg",
];

const out = [];
const log = (s) => {
  out.push(s);
  console.log(s);
};

for (const f of files) {
  const js = fs.readFileSync(path.join(__dirname, f), "utf8");
  log("\n========== " + f + " len=" + js.length + " ==========");

  for (const n of needles) {
    const count = js.split(n).length - 1;
    if (count > 0) log(n + ": " + count);
  }

  // Extract small windows around interesting strings
  const windows = [
    "animateWords",
    "animateOpacity",
    "showNavOnHover",
    "CarouselIndicator",
    "HorizontalScroll",
    "IntersectionObserver",
    "withPinkGradient",
    "heroSectionSearchBar",
    "RecentlySearched",
    "activePill",
    "Ripple",
    "ticker",
    "shimmerBackground",
  ];

  for (const w of windows) {
    const idx = js.indexOf(w);
    if (idx < 0) {
      log("\n-- no hit for " + w);
      continue;
    }
    log("\n-- context for " + w + " @ " + idx);
    log(js.slice(Math.max(0, idx - 200), idx + 400).replace(/\n/g, " "));
  }

  // Library fingerprints
  log("\n-- library fingerprints --");
  [
    ["React", /react\.production|react-dom|__SECRET_INTERNALS/],
    ["webpack", /webpackChunk|__webpack_require__/],
    ["loadable", /@loadable\/component|loadableReady/],
    ["redux", /@@redux|combineReducers/],
    ["react-router", /BrowserRouter|createBrowserHistory|react-router/],
    ["axios", /axios\.defaults|AxiosError/],
    ["lodash", /function debounce|_\.debounce/],
    ["dayjs", /dayjs/],
    ["moment", /moment\(/],
    ["slick", /react-slick|slick-slider/],
    ["emotion", /emotion|__css/],
    ["styled-components", /styled-components|sc-component/],
  ].forEach(([name, re]) => {
    log(name + ": " + (re.test(js) ? "YES" : "no"));
  });
}

// Also scan home chunk 1343 for CSS module class maps that reveal intent
const home = fs.readFileSync(path.join(__dirname, "_amber-home-1343.js"), "utf8");
log("\n========== CLASS MAP SNIPPETS ==========");
for (const mod of [
  "HeroSectionDesktopStyles",
  "searchModalDesktop",
  "popularCitites",
  "ThousandPropertiesNewRails",
  "ThreeStepsSection",
  "bookYourPerfectAccommodation",
  "TrustPilotBanner",
  "AppDownload",
  "GetHelpDesktop",
  "FooterDesktop",
  "carousel",
  "Image",
  "HorizontalScroll",
]) {
  const idx = home.indexOf(mod);
  log("\n" + mod + " in home-1343: " + (idx >= 0 ? "yes@" + idx : "no"));
  if (idx >= 0) log(home.slice(idx, idx + 500).replace(/\n/g, " "));
}

fs.writeFileSync(path.join(__dirname, "_amber-js-extract.txt"), out.join("\n"));
console.log("Wrote js extract");
