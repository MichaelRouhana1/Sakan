import { brandPaletteCss, readStoredBrandPalette } from "./brandPalette";

const STYLE_ID = "studently-brand-palette";

/** SPA dev (`output: "single"`) never mounts `app/+html.tsx`. */
export function installBrandPalette() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== brandPaletteCss) style.textContent = brandPaletteCss;
  if (readStoredBrandPalette() === "ocean") {
    document.documentElement.setAttribute("data-palette", "ocean");
  } else {
    document.documentElement.removeAttribute("data-palette");
  }
}

installBrandPalette();
