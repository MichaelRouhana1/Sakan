/**
 * Browser-only Leaflet helpers.
 * Never import `leaflet` at module top-level — Expo SSR has no `window`.
 */

import type {
  DivIcon,
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
  Marker,
  Polyline,
  TileLayer,
} from "leaflet";

export type LeafletNS = typeof import("leaflet");

let cssReady = false;
let leafletPromise: Promise<LeafletNS> | null = null;

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Ensure Leaflet CSS is loaded (client only). */
export function ensureLeafletCss(): void {
  if (cssReady || typeof document === "undefined") return;
  const id = "skoun-leaflet-css";
  if (document.getElementById(id)) {
    cssReady = true;
    return;
  }
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.id = "skoun-leaflet-overrides";
  style.textContent = `
    .skoun-leaflet-map { width: 100%; height: 100%; z-index: 0; background: #DCEFE6; }
    .skoun-leaflet-map .leaflet-control-attribution { font-size: 10px; }
    .skoun-div-icon { background: transparent !important; border: none !important; }
    .skoun-price-stack { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .skoun-price-pill {
      background: #fff; border: 1px solid #C9D6CF; border-radius: 8px;
      padding: 3px 8px; font: 600 12px "DM Sans", system-ui, sans-serif; color: #14241E;
      box-shadow: 0 1px 3px rgba(20,36,30,0.12); white-space: nowrap;
    }
    .skoun-price-pill.on { background: #fff; border-color: #C9D6CF; color: #14241E; }
    .skoun-teardrop {
      width: 30px; height: 40px; position: relative; filter: drop-shadow(0 1px 2px rgba(20,36,30,0.28));
    }
    .skoun-teardrop .head {
      width: 30px; height: 30px; border-radius: 50%; position: relative; overflow: hidden;
    }
    .skoun-teardrop.listing .head { background: #4FB79F; }
    .skoun-teardrop.listing.selected .head { background: #C23B2E; }
    .skoun-teardrop .cutout {
      position: absolute; left: 50%; top: 50%; width: 10px; height: 10px;
      margin: -5px 0 0 -5px; border-radius: 50%; background: #fff;
    }
    .skoun-teardrop .tip {
      width: 0; height: 0; margin: -5px auto 0;
      border-left: 9px solid transparent; border-right: 9px solid transparent;
      border-top: 14px solid #02675C;
    }
    .skoun-teardrop.listing.selected .tip { border-top-color: #8E241A; }
    .skoun-campus-pin {
      width: 48px; height: 56px; display: flex; flex-direction: column;
      align-items: center; filter: drop-shadow(0 1px 2px rgba(20,36,30,0.3));
    }
    .skoun-campus-pin .ring {
      width: 44px; height: 44px; border-radius: 50%; border: 2px solid #14241E;
      background: #F3EBD6; display: flex; align-items: center; justify-content: center;
    }
    .skoun-campus-pin .disc {
      width: 38px; height: 38px; border-radius: 50%; background: #B8954A;
      display: flex; align-items: center; justify-content: center;
    }
    .skoun-campus-pin .stem {
      width: 4px; height: 10px; background: #14241E; border-radius: 2px; margin-top: -1px;
    }
    .skoun-campus-pin .base {
      width: 14px; height: 4px; border-radius: 2px; background: #14241E; margin-top: -1px;
    }
    .skoun-dist-badge {
      background: #fff; border: 1.5px solid #C23B2E; border-radius: 999px;
      padding: 3px 8px; font: 600 11px "DM Sans", system-ui, sans-serif; color: #8E241A;
      box-shadow: 0 1px 3px rgba(20,36,30,0.16); white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
  cssReady = true;
}

/** Dynamically load leaflet only in the browser (safe for Expo SSR). */
export function loadLeaflet(): Promise<LeafletNS> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet requires a browser window"));
  }
  if (!leafletPromise) {
    leafletPromise = import("leaflet").then((mod) => {
      ensureLeafletCss();
      return mod;
    });
  }
  return leafletPromise;
}

export function addOsmTiles(L: LeafletNS, map: LeafletMap): TileLayer {
  return L.tileLayer(OSM_URL, {
    attribution: OSM_ATTR,
    maxZoom: 19,
  }).addTo(map);
}

export function createSkounMap(
  L: LeafletNS,
  el: HTMLElement,
  center: [number, number],
  zoom = 13,
): LeafletMap {
  ensureLeafletCss();
  const map = L.map(el, {
    zoomControl: true,
    attributionControl: true,
  }).setView(center, zoom);
  addOsmTiles(L, map);
  requestAnimationFrame(() => map.invalidateSize());
  return map;
}

function teardropHtml(
  variant: "listing" | "campus",
  selected = false,
): string {
  if (variant === "campus") {
    return `<div class="skoun-campus-pin" aria-hidden="true">
      <div class="ring"><div class="disc">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="#EAF6F0"/>
          <path d="M5 13.18V17c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82" stroke="#EAF6F0" stroke-width="1.6" fill="none"/>
        </svg>
      </div></div>
      <div class="stem"></div>
      <div class="base"></div>
    </div>`;
  }
  const cls = [
    "skoun-teardrop",
    variant,
    selected && variant === "listing" ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<div class="${cls}"><div class="head"><div class="cutout"></div></div><div class="tip"></div></div>`;
}

export function pricePinIcon(
  L: LeafletNS,
  label: string,
  selected: boolean,
): DivIcon {
  const pillCls = selected ? "skoun-price-pill on" : "skoun-price-pill";
  const html = `<div class="skoun-price-stack"><div class="${pillCls}">${escapeHtml(label)}</div>${teardropHtml("listing", selected)}</div>`;
  return L.divIcon({
    className: "skoun-div-icon",
    html,
    iconSize: [88, 72],
    iconAnchor: [44, 72],
  });
}

export function campusPinIcon(L: LeafletNS): DivIcon {
  return L.divIcon({
    className: "skoun-div-icon",
    html: teardropHtml("campus"),
    iconSize: [48, 56],
    iconAnchor: [24, 56],
  });
}

export function listingPinIcon(L: LeafletNS, selected = false): DivIcon {
  return L.divIcon({
    className: "skoun-div-icon",
    html: teardropHtml("listing", selected),
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
}

export function distanceBadgeIcon(L: LeafletNS, label: string): DivIcon {
  return L.divIcon({
    className: "skoun-div-icon",
    html: `<div class="skoun-dist-badge">${escapeHtml(label)}</div>`,
    iconSize: [72, 24],
    iconAnchor: [36, 12],
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type {
  DivIcon,
  LatLngExpression,
  LayerGroup,
  LeafletMap,
  Marker,
  Polyline,
  TileLayer,
};
