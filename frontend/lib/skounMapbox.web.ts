/**
 * Browser-only Mapbox GL helpers.
 * Never import `mapbox-gl` at module top-level — Expo SSR has no `window`.
 */

import type { GeoJSONSource, Map as MapboxMap, Marker, Popup } from "mapbox-gl";
import type { Listing } from "@/types/listing";
import type { MapPinGroup } from "@/lib/mapPinGroups";
import { listingCardSubtitle, listingCardTitle } from "@/lib/listingCardMeta";
import { getMapboxStyle, getMapboxToken } from "@/lib/mapboxEnv";

export type MapboxGL = typeof import("mapbox-gl").default;
export type { MapboxMap, Marker, Popup };

declare global {
  interface Window {
    _skounActivePopup?: { remove: () => void } | null;
  }
}

let mapboxPromise: Promise<MapboxGL> | null = null;
const resizeObservers = new WeakMap<MapboxMap, ResizeObserver>();

const CAMPUS_LINE_SOURCE = "skoun-campus-line";
const CAMPUS_LINE_LAYER = "skoun-campus-line-layer";

function installedMapboxGlVersion(): string {
  try {
    return require("mapbox-gl/package.json").version as string;
  } catch {
    return "3.28.1";
  }
}

export function toLngLat(coord: { lat: number; lng: number }): [number, number] {
  return [coord.lng, coord.lat];
}

export function ensureMapboxCss(): void {
  if (typeof document === "undefined") return;
  const version = installedMapboxGlVersion();
  const id = "skoun-mapbox-css";
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://api.mapbox.com/mapbox-gl-js/v${version}/mapbox-gl.css`;
    document.head.appendChild(link);
  }

  const overridesId = "skoun-mapbox-overrides";
  let style = document.getElementById(overridesId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = overridesId;
    document.head.appendChild(style);
  }
  style.textContent = `
    .skoun-mapbox-map { width: 100%; height: 100%; position: relative; z-index: 0; background: #E2E8F0; overflow: hidden; }
    .skoun-mapbox-map .mapboxgl-map { width: 100%; height: 100%; }
    .skoun-mapbox-map .mapboxgl-ctrl-attrib { font-size: 10px; }
    .skoun-marker-el { background: transparent; border: none; overflow: visible; cursor: pointer; }
    .skoun-marker-el.inert { pointer-events: none; cursor: default; }
    .skoun-teardrop, .skoun-cluster-bubble { pointer-events: auto; }
    .skoun-price-stack { display: flex; flex-direction: column; align-items: center; gap: 3px; pointer-events: none; }
    .skoun-price-pill {
      background: #fff; border: 1px solid #C5CDD8; border-radius: 8px;
      padding: 3px 8px; font: 600 12px "DM Sans", system-ui, sans-serif; color: #121826;
      box-shadow: 0 1px 3px rgba(18,24,38,0.12); white-space: nowrap;
      pointer-events: none; transition: background 120ms ease, color 120ms ease, border-color 120ms ease, transform 120ms ease;
    }
    .skoun-price-pill.on { background: #121826; border-color: #121826; color: #fff; }
    .skoun-price-stack.on { transform: scale(1.06); }
    .skoun-teardrop {
      width: 30px; height: 40px; position: relative; filter: drop-shadow(0 1px 2px rgba(18,24,38,0.28));
    }
    .skoun-teardrop .head {
      width: 30px; height: 30px; border-radius: 50%; position: relative; overflow: hidden;
    }
    .skoun-teardrop.listing .head { background: #2F6FED; }
    .skoun-teardrop.listing.selected .head { background: #C23B2E; }
    .skoun-teardrop .cutout {
      position: absolute; left: 50%; top: 50%; width: 10px; height: 10px;
      margin: -5px 0 0 -5px; border-radius: 50%; background: #fff;
    }
    .skoun-teardrop .tip {
      width: 0; height: 0; margin: -5px auto 0;
      border-left: 9px solid transparent; border-right: 9px solid transparent;
      border-top: 14px solid #121826;
    }
    .skoun-teardrop.listing.selected .tip { border-top-color: #8E241A; }
    .skoun-campus-pin {
      width: 48px; height: 56px; display: flex; flex-direction: column;
      align-items: center; filter: drop-shadow(0 1px 2px rgba(18,24,38,0.3));
    }
    .skoun-campus-pin .ring {
      width: 44px; height: 44px; border-radius: 50%; border: 2px solid #121826;
      background: #E8EEF6; display: flex; align-items: center; justify-content: center;
    }
    .skoun-campus-pin .disc {
      width: 38px; height: 38px; border-radius: 50%; background: #121826;
      display: flex; align-items: center; justify-content: center;
    }
    .skoun-campus-pin .stem {
      width: 4px; height: 10px; background: #121826; border-radius: 2px; margin-top: -1px;
    }
    .skoun-campus-pin .base {
      width: 14px; height: 4px; border-radius: 2px; background: #121826; margin-top: -1px;
    }
    .skoun-dist-badge {
      display: flex; align-items: center; justify-content: center;
      box-sizing: border-box;
      background: #fff; border: 1.5px solid #C23B2E; border-radius: 999px;
      padding: 0 6px; height: 18px; font: 600 10px/1 "DM Sans", system-ui, sans-serif; color: #8E241A;
      box-shadow: 0 1px 3px rgba(18,24,38,0.16); white-space: nowrap; text-align: center;
    }
    .skoun-cluster-bubble {
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%; background: #C23B2E; color: #fff;
      font: 700 13px "DM Sans", system-ui, sans-serif;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 8px rgba(18,24,38,0.28);
      cursor: pointer; user-select: none;
      transition: transform 120ms ease;
    }
    .skoun-cluster-bubble:hover { transform: scale(1.06); }

    .skoun-mapbox-amber-popup .mapboxgl-popup-content {
      padding: 0 !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04) !important;
      border: 1px solid #E2E8F0 !important;
      overflow: hidden !important;
      background: #ffffff !important;
      width: 240px;
    }
    .skoun-mapbox-amber-popup .mapboxgl-popup-close-button { display: none !important; }
    .skoun-amber-popup-card {
      width: 240px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      font-family: "DM Sans", system-ui, -apple-system, sans-serif;
      display: block;
      text-decoration: none !important;
      color: inherit !important;
      cursor: pointer;
    }
    .skoun-popup-media {
      width: 100%; height: 130px; position: relative; overflow: hidden; background: #F1F5F9;
    }
    .skoun-popup-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .skoun-popup-close-btn {
      position: absolute; top: 8px; right: 8px; z-index: 10;
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(255, 255, 255, 0.92); border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #334155; cursor: pointer; padding: 0;
    }
    .skoun-popup-close-btn:hover { background: #ffffff; }
    .skoun-popup-body { display: block; padding: 12px; background: #ffffff; }
    .skoun-popup-title {
      font-size: 14px; font-weight: 700; color: #0F172A;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .skoun-popup-subtitle {
      font-size: 12px; color: #64748B;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;
    }
    .skoun-popup-price { font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 4px; }
    .skoun-popup-price .unit { font-size: 12px; font-weight: 400; color: #64748B; }
    .skoun-amber-popup-group { padding: 12px; width: 240px; }
    .skoun-popup-group-header {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 13px; font-weight: 700; color: #0F172A;
      margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;
    }
    .skoun-popup-group-list {
      max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;
    }
    .skoun-popup-group-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px; border-radius: 8px; background: #F8FAFC; border: 1px solid #E2E8F0;
      text-decoration: none !important; color: inherit !important;
    }
    .skoun-popup-group-item:hover { background: #F1F5F9; }
    .skoun-popup-group-title {
      font-size: 12px; font-weight: 600; color: #0F172A;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;
    }
    .skoun-popup-group-price { font-size: 12px; font-weight: 700; color: #2F6FED; }
  `;
}

export async function loadMapbox(): Promise<MapboxGL> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mapbox requires a browser window"));
  }
  if (!mapboxPromise) {
    mapboxPromise = import("mapbox-gl").then((mod) => {
      ensureMapboxCss();
      const mapboxgl = mod.default;
      mapboxgl.accessToken = getMapboxToken() ?? "";
      // Do not set CDN workerUrl — browsers block cross-origin Worker scripts
      // from api.mapbox.com on localhost (Failed to construct 'Worker').
      // Default bundled blob worker from mapbox-gl.
      return mapboxgl;
    });
  }
  return mapboxPromise;
}

export function createSkounMap(
  mapboxgl: MapboxGL,
  el: HTMLElement,
  center: { lat: number; lng: number },
  zoom = 13,
): MapboxMap | null {
  const token = getMapboxToken();
  if (!token) return null;
  if (el.querySelector(".mapboxgl-canvas")) return null;

  ensureMapboxCss();
  const map = new mapboxgl.Map({
    container: el,
    style: getMapboxStyle(),
    center: toLngLat(center),
    zoom,
    attributionControl: true,
    fadeDuration: 0,
    cooperativeGestures: false,
    maxTileCacheSize: 50,
  });
  map.addControl(
    new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
    "top-right",
  );
  map.once("load", () => {
    map.resize();
    ensureCampusLineLayer(map);
  });
  const observer = new ResizeObserver(() => {
    map.resize();
  });
  observer.observe(el);
  resizeObservers.set(map, observer);
  return map;
}

export function destroySkounMap(map: MapboxMap | null): void {
  if (!map) return;
  resizeObservers.get(map)?.disconnect();
  resizeObservers.delete(map);
  map.remove();
}

export function setMapInteractive(map: MapboxMap, on: boolean): void {
  const fn = on ? "enable" : "disable";
  map.dragPan[fn]();
  map.scrollZoom[fn]();
  map.boxZoom[fn]();
  map.doubleClickZoom[fn]();
  map.keyboard[fn]();
  map.touchZoomRotate[fn]();
  map.dragRotate[fn]();
}

function emptyLineFc(): {
  type: "FeatureCollection";
  features: [];
} {
  return { type: "FeatureCollection", features: [] };
}

export function ensureCampusLineLayer(map: MapboxMap): void {
  if (!map.isStyleLoaded()) {
    map.once("idle", () => ensureCampusLineLayer(map));
    return;
  }
  if (map.getSource(CAMPUS_LINE_SOURCE)) return;
  map.addSource(CAMPUS_LINE_SOURCE, {
    type: "geojson",
    data: emptyLineFc(),
  });
  map.addLayer({
    id: CAMPUS_LINE_LAYER,
    type: "line",
    source: CAMPUS_LINE_SOURCE,
    paint: {
      "line-color": "#C23B2E",
      "line-width": 2.5,
      "line-dasharray": [2, 1.6],
    },
  });
}

export function setCampusLine(
  map: MapboxMap,
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null,
): void {
  ensureCampusLineLayer(map);
  const src = map.getSource(CAMPUS_LINE_SOURCE) as GeoJSONSource | undefined;
  if (!src) return;
  if (!from || !to) {
    src.setData(emptyLineFc());
    return;
  }
  src.setData({
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [toLngLat(from), toLngLat(to)],
    },
  });
}

export { mapboxStaticImageUrl } from "@/lib/mapboxEnv";

function teardropHtml(
  variant: "listing" | "campus",
  selected = false,
): string {
  if (variant === "campus") {
    return `<div class="skoun-campus-pin" aria-hidden="true">
      <div class="ring"><div class="disc">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="#FFFFFF"/>
          <path d="M5 13.18V17c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82" stroke="#FFFFFF" stroke-width="1.6" fill="none"/>
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

export function pricePinHtml(label: string, selected: boolean): string {
  const pillCls = selected ? "skoun-price-pill on" : "skoun-price-pill";
  const stackCls = selected ? "skoun-price-stack on" : "skoun-price-stack";
  return `<div class="${stackCls}"><div class="${pillCls}">${escapeHtml(label)}</div>${teardropHtml("listing", selected)}</div>`;
}

export function clusterBubbleHtml(count: number, size: number): string {
  return `<div class="skoun-cluster-bubble" style="width:${size}px;height:${size}px;font-size:${size >= 46 ? 15 : 13}px">${escapeHtml(String(count))}</div>`;
}

export function campusPinHtml(): string {
  return teardropHtml("campus");
}

export function listingPinHtml(selected = false): string {
  return teardropHtml("listing", selected);
}

export function distanceBadgeHtml(label: string): string {
  return `<div class="skoun-dist-badge">${escapeHtml(label)}</div>`;
}

export function markerElement(
  html: string,
  opts?: { inert?: boolean },
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = opts?.inert ? "skoun-marker-el inert" : "skoun-marker-el";
  el.innerHTML = html;
  return el;
}

export function makeMarker(
  mapboxgl: MapboxGL,
  html: string,
  coord: { lat: number; lng: number },
  opts?: { anchor?: "bottom" | "center"; inert?: boolean; zIndex?: number },
): Marker {
  const el = markerElement(html, { inert: opts?.inert });
  if (opts?.zIndex != null) el.style.zIndex = String(opts.zIndex);
  return new mapboxgl.Marker({
    element: el,
    anchor: opts?.anchor ?? "bottom",
    pitchAlignment: "viewport",
    rotationAlignment: "viewport",
  }).setLngLat(toLngLat(coord));
}

const DIST_BADGE_H = 18;
const DIST_BADGE_EDGE_PAD = 6;

function distBadgeSize(label: string): [number, number] {
  const padX = 12;
  const border = 3;
  if (typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.font = '600 10px "DM Sans", system-ui, sans-serif';
      const w = Math.ceil(ctx.measureText(label).width + padX + border);
      return [Math.max(w, 28), DIST_BADGE_H];
    }
  }
  return [Math.ceil(label.length * 6.4 + padX + border), DIST_BADGE_H];
}

type ScreenPt = { x: number; y: number };

function clipSegmentToRect(
  p0: ScreenPt,
  p1: ScreenPt,
  left: number,
  top: number,
  right: number,
  bottom: number,
): { t0: number; t1: number } | null {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  let t0 = 0;
  let t1 = 1;
  const edges = [
    { p: -dx, q: p0.x - left },
    { p: dx, q: right - p0.x },
    { p: -dy, q: p0.y - top },
    { p: dy, q: bottom - p0.y },
  ];
  for (const { p, q } of edges) {
    if (p === 0) {
      if (q < 0) return null;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return { t0, t1 };
}

function pointInRect(
  p: ScreenPt,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function badgeRectAt(
  sx: number,
  sy: number,
  bw: number,
  bh: number,
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: sx - bw / 2,
    top: sy - bh / 2,
    right: sx + bw / 2,
    bottom: sy + bh / 2,
  };
}

function zoomControlExcludeRect(
  map: MapboxMap,
  pad: number,
): { left: number; top: number; right: number; bottom: number } | null {
  const container = map.getContainer();
  const zoom = container.querySelector(".mapboxgl-ctrl-top-right");
  if (!zoom) return null;
  const mapBox = container.getBoundingClientRect();
  const zoomBox = zoom.getBoundingClientRect();
  return {
    left: zoomBox.left - mapBox.left - pad,
    top: zoomBox.top - mapBox.top - pad,
    right: zoomBox.right - mapBox.left + pad,
    bottom: zoomBox.bottom - mapBox.top + pad,
  };
}

function nudgeTOffZoomControl(
  a: ScreenPt,
  b: ScreenPt,
  tPreferred: number,
  tMin: number,
  tMax: number,
  bw: number,
  bh: number,
  zoomEx: { left: number; top: number; right: number; bottom: number },
): number {
  const overlaps = (t: number) =>
    rectsOverlap(
      badgeRectAt(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y), bw, bh),
      zoomEx,
    );
  if (!overlaps(tPreferred)) return tPreferred;
  const steps = 32;
  for (let i = 1; i <= steps; i++) {
    const t = tPreferred + ((tMax - tPreferred) * i) / steps;
    if (!overlaps(t)) return t;
  }
  for (let i = 1; i <= steps; i++) {
    const t = tPreferred - ((tPreferred - tMin) * i) / steps;
    if (!overlaps(t)) return t;
  }
  return tPreferred;
}

export function distanceBadgeLngLat(
  map: MapboxMap,
  campus: { lat: number; lng: number },
  listing: { lat: number; lng: number },
  label: string,
): { lat: number; lng: number } {
  const geoMid = {
    lat: (campus.lat + listing.lat) / 2,
    lng: (campus.lng + listing.lng) / 2,
  };
  const a = map.project(toLngLat(campus));
  const b = map.project(toLngLat(listing));
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const [bw, bh] = distBadgeSize(label);
  const el = map.getContainer();
  const size = { x: el.clientWidth, y: el.clientHeight };
  const left = bw / 2 + DIST_BADGE_EDGE_PAD;
  const top = bh / 2 + DIST_BADGE_EDGE_PAD;
  const right = size.x - bw / 2 - DIST_BADGE_EDGE_PAD;
  const bottom = size.y - bh / 2 - DIST_BADGE_EDGE_PAD;

  let tMin = 0;
  let tMax = 1;
  let t = 0.5;

  if (pointInRect(mid, left, top, right, bottom)) {
    t = 0.5;
  } else {
    const clip = clipSegmentToRect(a, b, left, top, right, bottom);
    if (!clip) return geoMid;
    tMin = clip.t0;
    tMax = clip.t1;
    t = Math.max(tMin, Math.min(tMax, 0.5));
  }

  const zoomEx = zoomControlExcludeRect(map, 4);
  if (zoomEx) {
    t = nudgeTOffZoomControl(a, b, t, tMin, tMax, bw, bh, zoomEx);
  }

  const ll = map.unproject([a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)]);
  return { lat: ll.lat, lng: ll.lng };
}

export function createAmberPopupHtml(listing: Listing): string {
  const title = escapeHtml(listingCardTitle(listing));
  const subtitle = escapeHtml(listingCardSubtitle(listing));
  const price = `$${listing.monthlyRentUsd.toLocaleString("en-US")}`;
  const coverUrl =
    listing.coverUrl ||
    listing.photos?.[0]?.url ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80";
  const url = `/listing/${listing.id}`;

  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="skoun-amber-popup-card" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener,noreferrer'); return false;">
    <div class="skoun-popup-media">
      <img src="${escapeHtml(coverUrl)}" alt="${title}" class="skoun-popup-img" />
      <button type="button" class="skoun-popup-close-btn" aria-label="Close" onclick="event.stopPropagation(); event.preventDefault(); if (window._skounActivePopup) { window._skounActivePopup.remove(); }">✕</button>
    </div>
    <div class="skoun-popup-body">
      <div class="skoun-popup-title">${title}</div>
      <div class="skoun-popup-subtitle">${subtitle}</div>
      <div class="skoun-popup-price"><strong>${price}</strong> <span class="unit">/ month</span></div>
    </div>
  </a>`;
}

export function createAmberGroupPopupHtml(group: MapPinGroup): string {
  const itemsHtml = group.listings
    .map((listing) => {
      const title = escapeHtml(listingCardTitle(listing));
      const price = `$${listing.monthlyRentUsd.toLocaleString("en-US")}`;
      const url = `/listing/${listing.id}`;
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="skoun-popup-group-item" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener,noreferrer'); return false;">
        <span class="skoun-popup-group-title">${title}</span>
        <span class="skoun-popup-group-price">${price}/mo</span>
      </a>`;
    })
    .join("");

  return `<div class="skoun-amber-popup-card skoun-amber-popup-group">
    <div class="skoun-popup-group-header">
      <span>${group.count} places at this pin</span>
      <button type="button" class="skoun-popup-close-btn" aria-label="Close" onclick="event.stopPropagation(); event.preventDefault(); if (window._skounActivePopup) { window._skounActivePopup.remove(); }">✕</button>
    </div>
    <div class="skoun-popup-group-list">${itemsHtml}</div>
  </div>`;
}

export type AmberPopupSide = "n" | "s" | "e" | "w";

const CARD_W = 240;
const CARD_H = 222;
const TIP = 20;
const GAP = 8;
const CLIP_PAD = 8;
const DIAGONAL_RATIO = 0.35;

type LatLngLike = { lat: number; lng: number };

function leftoverSpace(
  side: AmberPopupSide,
  pin: ScreenPt,
  mapSize: { x: number; y: number },
): number {
  switch (side) {
    case "e":
      return mapSize.x - CLIP_PAD - pin.x - (CARD_W + TIP + GAP);
    case "w":
      return pin.x - CLIP_PAD - (CARD_W + TIP + GAP);
    case "s":
      return mapSize.y - CLIP_PAD - pin.y - (CARD_H + TIP + GAP);
    case "n":
    default:
      return pin.y - CLIP_PAD - (CARD_H + TIP + GAP);
  }
}

function roomierSide(
  a: AmberPopupSide,
  b: AmberPopupSide,
  pin: ScreenPt,
  mapSize: { x: number; y: number },
): AmberPopupSide {
  return leftoverSpace(a, pin, mapSize) >= leftoverSpace(b, pin, mapSize)
    ? a
    : b;
}

function candidatePair(
  map: MapboxMap,
  listing: LatLngLike,
  campus: LatLngLike,
): [AmberPopupSide, AmberPopupSide] {
  const pin = map.project(toLngLat(listing));
  const hub = map.project(toLngLat(campus));
  const dx = hub.x - pin.x;
  const dy = hub.y - pin.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const longest = Math.max(ax, ay);
  if (longest < 1) return ["w", "e"];
  if (Math.min(ax, ay) / longest >= DIAGONAL_RATIO) {
    return [dx >= 0 ? "w" : "e", dy >= 0 ? "n" : "s"];
  }
  return ay >= ax ? ["w", "e"] : ["n", "s"];
}

function mapSize(map: MapboxMap): { x: number; y: number } {
  const el = map.getContainer();
  return { x: el.clientWidth, y: el.clientHeight };
}

export function resolveUniPopupSide(
  map: MapboxMap,
  listing: LatLngLike,
  campus: LatLngLike,
): AmberPopupSide {
  const size = mapSize(map);
  const [a, b] = candidatePair(map, listing, campus);
  const pin = { x: size.x / 2, y: size.y / 2 };
  return roomierSide(a, b, pin, size);
}

function offsetForSide(
  side: AmberPopupSide,
  width: number,
  height: number,
): [number, number] {
  switch (side) {
    case "s":
      return [0, height / 2 + TIP + GAP];
    case "e":
      return [width / 2 + TIP + GAP, 0];
    case "w":
      return [-(width / 2 + TIP + GAP), 0];
    case "n":
    default:
      return [0, -GAP];
  }
}

export function applyAmberPopupSide(popup: Popup, side: AmberPopupSide): void {
  const el = popup.getElement();
  const width = el?.offsetWidth || CARD_W;
  const height = el?.offsetHeight || CARD_H;
  popup.setOffset(offsetForSide(side, width, height));
  const node = popup.getElement();
  if (node) node.setAttribute("data-skoun-side", side);
}

export function amberPopupHtml(group: MapPinGroup): string {
  if (group.count > 1) return createAmberGroupPopupHtml(group);
  const listing = group.listings[0];
  return listing ? createAmberPopupHtml(listing) : "";
}

export function bindAmberPopup(
  mapboxgl: MapboxGL,
  marker: Marker,
  html: string,
  onOpen?: (popup: Popup) => void,
  onClose?: () => void,
): Popup {
  const popup = new mapboxgl.Popup({
    closeButton: false,
    offset: [0, -8],
    maxWidth: "240px",
    className: "skoun-mapbox-amber-popup",
    anchor: "bottom",
    closeOnClick: false,
  }).setHTML(html);

  marker.setPopup(popup);
  popup.on("open", () => {
    window._skounActivePopup = popup;
    onOpen?.(popup);
  });
  popup.on("close", () => {
    window._skounActivePopup = null;
    onClose?.();
  });
  return popup;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
