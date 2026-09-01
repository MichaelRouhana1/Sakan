/**
 * Browser-only Mapbox GL helpers.
 * Never import `mapbox-gl` at module top-level — Expo SSR has no `window`.
 */

import type { GeoJSONSource, Map as MapboxMap, Marker, Popup } from "mapbox-gl";
import type { Listing } from "@/types/listing";
import type { MapPinGroup } from "@/lib/mapPinGroups";
import { listingCardSubtitle, listingCardTitle } from "@/lib/listingCardMeta";
import { CAMPUS_SWITCH_PROMPT } from "@/lib/campusPinLabel";
import { getMapboxStyle, getMapboxToken } from "@/lib/mapboxEnv";

export type MapboxGL = typeof import("mapbox-gl").default;
export type { MapboxMap, Marker, Popup };

declare global {
  interface Window {
    _skounActivePopup?: { remove: () => void } | null;
    _skounDismissPreview?: (() => void) | null;
  }
}

let mapboxPromise: Promise<MapboxGL> | null = null;
const resizeObservers = new WeakMap<MapboxMap, ResizeObserver>();

const CAMPUS_LINE_SOURCE = "skoun-campus-line";
const CAMPUS_LINE_LAYER = "skoun-campus-line-layer";
const CAMPUS_LINE_COLOR = "#FF3B30";
const CAMPUS_LINE_WIDTH = 6;

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
    .skoun-mapbox-map--chrome-offset .mapboxgl-ctrl-top-right {
      top: 64px;
      right: 16px;
    }
    .skoun-pitch-toggle {
      font: 700 11px/1 "DM Sans", system-ui, sans-serif !important;
      color: #121826 !important;
      letter-spacing: 0.02em;
    }
    .skoun-marker-el { background: transparent; border: none; overflow: visible; cursor: pointer; }
    .skoun-marker-el.inert { pointer-events: none; cursor: default; }
    .skoun-teardrop, .skoun-cluster-bubble { pointer-events: auto; }
    .skoun-price-stack { display: flex; flex-direction: column; align-items: center; gap: 3px; pointer-events: auto; }
    .skoun-price-pill {
      background: #fff; border: 1px solid #C5CDD8; border-radius: 8px;
      padding: 3px 8px; font: 600 12px "DM Sans", system-ui, sans-serif; color: #121826;
      box-shadow: 0 1px 3px rgba(18,24,38,0.12); white-space: nowrap;
      pointer-events: auto; transition: background 120ms ease, color 120ms ease, border-color 120ms ease, transform 120ms ease;
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
    .skoun-campus-stack {
      position: relative;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      pointer-events: none;
      -webkit-font-smoothing: antialiased;
    }
    .skoun-campus-stack.selected { transform: scale(1.06); }
    .skoun-campus-stack.clickable {
      pointer-events: auto;
      cursor: pointer;
    }
    .skoun-campus-stack.clickable .skoun-campus-label {
      transition: background-color 160ms ease;
    }
    .skoun-campus-stack.clickable:hover .skoun-campus-label {
      background: #D4B78A;
    }
    .skoun-campus-label {
      max-width: 120px; padding: 3px 8px; border-radius: 6px;
      background: #C4A574; color: #2A1F14;
      font: 700 11px/1.25 "DM Sans", system-ui, sans-serif;
      text-align: center; white-space: nowrap;
      box-shadow: 0 1px 3px rgba(18,24,38,0.22);
      -webkit-font-smoothing: antialiased;
    }
    .skoun-campus-stack.selected .skoun-campus-label {
      background: #121826; color: #fff;
    }
    .skoun-campus-pin-slot {
      position: relative;
      width: 48px;
      height: 56px;
      flex-shrink: 0;
    }
    .skoun-campus-switch {
      position: absolute;
      left: calc(100% + 2px);
      top: 22px;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 3px 3px 8px;
      border-radius: 999px;
      background: #FFFFFF;
      border: 1.5px solid #121826;
      box-shadow: 0 6px 18px rgba(18,24,38,0.2);
      pointer-events: auto;
      white-space: nowrap;
      z-index: 8;
      animation: skoun-campus-switch-in 180ms ease;
      -webkit-font-smoothing: antialiased;
    }
    .skoun-campus-switch-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: #121826;
      flex-shrink: 0;
    }
    .skoun-campus-switch-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background 160ms ease, transform 160ms ease;
    }
    .skoun-campus-switch-btn.yes {
      background: #121826;
      color: #FFFFFF;
    }
    .skoun-campus-switch-btn.no {
      background: #EEF1F6;
      color: #121826;
    }
    .skoun-campus-switch-btn.yes:hover { background: #2F6FED; }
    .skoun-campus-switch-btn.no:hover { background: #E2E8F0; }
    .skoun-campus-switch-btn:focus-visible {
      outline: 2px solid #2F6FED;
      outline-offset: 2px;
    }
    .skoun-campus-switch-btn:active { transform: scale(0.94); }
    @keyframes skoun-campus-switch-in {
      from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
      to { opacity: 1; transform: translateY(-50%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .skoun-campus-switch { animation: none; }
      .skoun-campus-stack.clickable .skoun-campus-label,
      .skoun-campus-switch-btn { transition: none; }
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

    .skoun-mapbox-amber-popup { overflow: visible !important; }
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
    .skoun-mapbox-amber-popup .mapboxgl-popup-tip-container { overflow: visible; }
    .skoun-mapbox-amber-popup.skoun-popup-n .mapboxgl-popup-tip,
    .skoun-mapbox-amber-popup.mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
      border-top-color: #ffffff;
    }
    .skoun-mapbox-amber-popup.skoun-popup-s .mapboxgl-popup-tip,
    .skoun-mapbox-amber-popup.mapboxgl-popup-anchor-top .mapboxgl-popup-tip {
      border-bottom-color: #ffffff;
    }
    .skoun-mapbox-amber-popup.skoun-popup-e .mapboxgl-popup-tip,
    .skoun-mapbox-amber-popup.mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
      border-right-color: #ffffff;
    }
    .skoun-mapbox-amber-popup.skoun-popup-w .mapboxgl-popup-tip,
    .skoun-mapbox-amber-popup.mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
      border-left-color: #ffffff;
    }
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
    .skoun-popup-body-link {
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
      position: absolute; top: 10px; right: 16px; z-index: 10;
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(255, 255, 255, 0.92); border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #334155; cursor: pointer; padding: 0;
      line-height: 1; pointer-events: auto;
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
    .skoun-popup-group-header .skoun-popup-close-btn {
      position: static;
      flex-shrink: 0;
      margin-left: 8px;
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

const PITCH_3D = 60;

function createPitchToggleControl(): {
  onAdd(map: MapboxMap): HTMLElement;
  onRemove(): void;
} {
  let mapRef: MapboxMap | null = null;
  let btn: HTMLButtonElement | null = null;
  let onPitch: (() => void) | null = null;

  function sync() {
    if (!mapRef || !btn) return;
    const is3d = mapRef.getPitch() > 15;
    btn.textContent = is3d ? "2D" : "3D";
    btn.title = is3d ? "2D map" : "3D buildings";
    btn.setAttribute(
      "aria-label",
      is3d ? "Switch to 2D map" : "Switch to 3D map",
    );
    btn.setAttribute("aria-pressed", is3d ? "true" : "false");
  }

  return {
    onAdd(map) {
      mapRef = map;
      const group = document.createElement("div");
      group.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skoun-pitch-toggle";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const is3d = map.getPitch() > 15;
        map.easeTo({
          pitch: is3d ? 0 : PITCH_3D,
          bearing: is3d ? 0 : map.getBearing(),
          duration: 450,
        });
      });
      onPitch = sync;
      map.on("pitch", sync);
      map.on("pitchend", sync);
      sync();
      group.appendChild(btn);
      return group;
    },
    onRemove() {
      if (mapRef && onPitch) {
        mapRef.off("pitch", onPitch);
        mapRef.off("pitchend", onPitch);
      }
      mapRef = null;
      btn = null;
    },
  };
}

function attachResizeObserver(el: HTMLElement, map: MapboxMap): void {
  const observer = new ResizeObserver(() => {
    map.resize();
  });
  observer.observe(el);
  resizeObservers.set(map, observer);
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
    pitch: 0,
    pitchWithRotate: true,
    attributionControl: true,
    fadeDuration: 0,
    cooperativeGestures: false,
    maxTileCacheSize: 50,
  });
  map.addControl(
    new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }),
    "top-right",
  );
  map.addControl(createPitchToggleControl(), "top-right");
  map.on("style.load", () => {
    ensureCampusLineLayer(map);
    const pending = pendingCampusRoute.get(map);
    if (pending) paintCampusRoute(map, pending);
  });
  map.once("load", () => {
    map.resize();
    ensureCampusLineLayer(map);
  });
  attachResizeObserver(el, map);
  return map;
}

/** Compact Standard-style map for decorative previews — no nav chrome. */
export function createSkounPreviewMap(
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
    pitch: 38,
    bearing: -18,
    interactive: false,
    attributionControl: true,
    fadeDuration: 0,
    maxTileCacheSize: 20,
  });
  map.once("load", () => {
    map.resize();
  });
  attachResizeObserver(el, map);
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

type PendingRoute = {
  coords: { lat: number; lng: number }[] | null;
};

const pendingCampusRoute = new WeakMap<MapboxMap, PendingRoute>();

function addCampusLineLayer(map: MapboxMap): void {
  if (map.getLayer(CAMPUS_LINE_LAYER)) {
    map.removeLayer(CAMPUS_LINE_LAYER);
  }
  const spec = {
    id: CAMPUS_LINE_LAYER,
    type: "line" as const,
    source: CAMPUS_LINE_SOURCE,
    layout: {
      "line-cap": "round" as const,
      "line-join": "round" as const,
    },
    paint: {
      "line-color": CAMPUS_LINE_COLOR,
      "line-width": CAMPUS_LINE_WIDTH,
      "line-opacity": 1,
    },
  };
  try {
    map.addLayer({ ...spec, slot: "top" });
  } catch {
    if (!map.getLayer(CAMPUS_LINE_LAYER)) {
      map.addLayer(spec);
    }
  }
}

export function ensureCampusLineLayer(map: MapboxMap): void {
  if (!map.isStyleLoaded()) {
    map.once("idle", () => ensureCampusLineLayer(map));
    return;
  }
  if (!map.getSource(CAMPUS_LINE_SOURCE)) {
    map.addSource(CAMPUS_LINE_SOURCE, {
      type: "geojson",
      data: emptyLineFc(),
    });
  }
  if (!map.getLayer(CAMPUS_LINE_LAYER)) {
    addCampusLineLayer(map);
  }
}

function paintCampusRoute(map: MapboxMap, pending: PendingRoute): void {
  ensureCampusLineLayer(map);
  const src = map.getSource(CAMPUS_LINE_SOURCE) as GeoJSONSource | undefined;
  if (!src) {
    map.once("idle", () => {
      const next = pendingCampusRoute.get(map);
      if (next) paintCampusRoute(map, next);
    });
    return;
  }
  const { coords } = pending;
  if (!coords || coords.length < 2) {
    src.setData(emptyLineFc());
    if (map.getLayer(CAMPUS_LINE_LAYER)) {
      map.setPaintProperty(CAMPUS_LINE_LAYER, "line-opacity", 0);
    }
    return;
  }
  src.setData({
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: coords.map(toLngLat),
    },
  });
  if (map.getLayer(CAMPUS_LINE_LAYER)) {
    map.setPaintProperty(CAMPUS_LINE_LAYER, "line-opacity", 1);
    map.setPaintProperty(CAMPUS_LINE_LAYER, "line-color", CAMPUS_LINE_COLOR);
    map.setPaintProperty(CAMPUS_LINE_LAYER, "line-width", CAMPUS_LINE_WIDTH);
  }
}

export function setCampusRoute(
  map: MapboxMap,
  coords: { lat: number; lng: number }[] | null,
): void {
  const pending = { coords };
  pendingCampusRoute.set(map, pending);
  if (!map.isStyleLoaded()) {
    map.once("idle", () => {
      const next = pendingCampusRoute.get(map);
      if (next) paintCampusRoute(map, next);
    });
    return;
  }
  paintCampusRoute(map, pending);
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

const CAMPUS_SWITCH_SWAP_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 6h13.5V3.5L22 7.5 15.5 11.5V9H2zM22 15H8.5v-2.5L2 16.5 8.5 20.5V18H22z"/></svg>`;
const CAMPUS_SWITCH_CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 12.5l5 5L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CAMPUS_SWITCH_CLOSE_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

export function campusPinHtml(
  label?: string,
  selected = false,
  opts?: { pending?: boolean; clickable?: boolean },
): string {
  const pin = teardropHtml("campus");
  const text = label?.trim();
  if (!text) return pin;
  const stack = [
    "skoun-campus-stack",
    selected ? "selected" : "",
    opts?.clickable ? "clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const prompt = opts?.pending
    ? `<div class="skoun-campus-switch" role="group" aria-label="${escapeHtml(CAMPUS_SWITCH_PROMPT)}">
        <span class="skoun-campus-switch-mark">${CAMPUS_SWITCH_SWAP_SVG}</span>
        <button type="button" class="skoun-campus-switch-btn yes" data-campus-switch="confirm" aria-label="Switch to this campus">${CAMPUS_SWITCH_CHECK_SVG}</button>
        <button type="button" class="skoun-campus-switch-btn no" data-campus-switch="cancel" aria-label="Keep current campus">${CAMPUS_SWITCH_CLOSE_SVG}</button>
      </div>`
    : "";
  return `<div class="${stack}"><div class="skoun-campus-label">${escapeHtml(text)}</div><div class="skoun-campus-pin-slot">${pin}${prompt}</div></div>`;
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
type LatLngLike = { lat: number; lng: number };

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

function chromeExcludeRects(
  map: MapboxMap,
  pad: number,
): Array<{ left: number; top: number; right: number; bottom: number }> {
  const container = map.getContainer();
  const mapBox = container.getBoundingClientRect();
  const out: Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }> = [];
  const addEl = (el: Element | null) => {
    if (!el) return;
    const box = el.getBoundingClientRect();
    out.push({
      left: box.left - mapBox.left - pad,
      top: box.top - mapBox.top - pad,
      right: box.right - mapBox.left + pad,
      bottom: box.bottom - mapBox.top + pad,
    });
  };
  addEl(container.querySelector(".mapboxgl-ctrl-top-right"));
  let root: Element | null = container;
  let closeEl: Element | null = null;
  while (root && !closeEl) {
    closeEl = root.querySelector('[aria-label="Close map"]');
    root = root.parentElement;
  }
  addEl(closeEl);
  return out;
}

type ScreenSeg = { a: ScreenPt; b: ScreenPt; len: number };

function pointAlongSegs(segs: ScreenSeg[], dist: number): ScreenPt | null {
  if (segs.length === 0) return null;
  let remain = Math.max(0, dist);
  for (const s of segs) {
    if (s.len <= 0) continue;
    if (remain <= s.len) {
      const t = remain / s.len;
      return {
        x: s.a.x + t * (s.b.x - s.a.x),
        y: s.a.y + t * (s.b.y - s.a.y),
      };
    }
    remain -= s.len;
  }
  return segs[segs.length - 1].b;
}

function badgeHitsChrome(
  pt: ScreenPt,
  bw: number,
  bh: number,
  rects: Array<{ left: number; top: number; right: number; bottom: number }>,
): boolean {
  const badge = badgeRectAt(pt.x, pt.y, bw, bh);
  return rects.some((r) => rectsOverlap(badge, r));
}

export function distanceBadgeOnPath(
  map: MapboxMap,
  coords: LatLngLike[],
  label: string,
): { lat: number; lng: number } | null {
  if (coords.length < 2) return null;
  const [bw, bh] = distBadgeSize(label);
  const el = map.getContainer();
  const size = { x: el.clientWidth, y: el.clientHeight };
  const left = bw / 2 + DIST_BADGE_EDGE_PAD;
  const top = bh / 2 + DIST_BADGE_EDGE_PAD;
  const right = size.x - bw / 2 - DIST_BADGE_EDGE_PAD;
  const bottom = size.y - bh / 2 - DIST_BADGE_EDGE_PAD;

  const pts = coords.map((c) => {
    const p = map.project(toLngLat(c));
    return { x: p.x, y: p.y };
  });
  const segs: ScreenSeg[] = [];
  for (let i = 1; i < pts.length; i++) {
    const clip = clipSegmentToRect(pts[i - 1], pts[i], left, top, right, bottom);
    if (!clip) continue;
    const a = {
      x: pts[i - 1].x + clip.t0 * (pts[i].x - pts[i - 1].x),
      y: pts[i - 1].y + clip.t0 * (pts[i].y - pts[i - 1].y),
    };
    const b = {
      x: pts[i - 1].x + clip.t1 * (pts[i].x - pts[i - 1].x),
      y: pts[i - 1].y + clip.t1 * (pts[i].y - pts[i - 1].y),
    };
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.5) continue;
    segs.push({ a, b, len });
  }
  const total = segs.reduce((s, g) => s + g.len, 0);
  if (total < 0.5) {
    return null;
  }

  let dist = total / 2;
  const chrome = chromeExcludeRects(map, 4);
  const steps = 32;
  const tryDist = (d: number) => {
    const pt = pointAlongSegs(segs, d);
    if (!pt) return false;
    return !badgeHitsChrome(pt, bw, bh, chrome);
  };
  if (!tryDist(dist)) {
    let found: number | null = null;
    for (let i = 1; i <= steps; i++) {
      const d = dist + ((total - dist) * i) / steps;
      if (tryDist(d)) {
        found = d;
        break;
      }
    }
    if (found == null) {
      for (let i = 1; i <= steps; i++) {
        const d = dist - (dist * i) / steps;
        if (tryDist(d)) {
          found = d;
          break;
        }
      }
    }
    if (found != null) dist = found;
  }

  const screen = pointAlongSegs(segs, dist);
  if (!screen) return null;
  const ll = map.unproject([screen.x, screen.y]);
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

  return `<div class="skoun-amber-popup-card">
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="skoun-popup-body-link" onclick="window.open('${escapeHtml(url)}', '_blank', 'noopener,noreferrer'); return false;">
      <div class="skoun-popup-media">
        <img src="${escapeHtml(coverUrl)}" alt="${title}" class="skoun-popup-img" />
      </div>
      <div class="skoun-popup-body">
        <div class="skoun-popup-title">${title}</div>
        <div class="skoun-popup-subtitle">${subtitle}</div>
        <div class="skoun-popup-price"><strong>${price}</strong> <span class="unit">/ month</span></div>
      </div>
    </a>
    <button type="button" class="skoun-popup-close-btn" aria-label="Close">✕</button>
  </div>`;
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
      <button type="button" class="skoun-popup-close-btn" aria-label="Close">✕</button>
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

function candidatePairFromAxes(
  dx: number,
  dy: number,
  ax: number,
  ay: number,
): [AmberPopupSide, AmberPopupSide] {
  const longest = Math.max(ax, ay);
  if (longest < 1) return ["w", "e"];
  if (Math.min(ax, ay) / longest >= DIAGONAL_RATIO) {
    return [dx >= 0 ? "w" : "e", dy >= 0 ? "n" : "s"];
  }
  return ay >= ax ? ["w", "e"] : ["n", "s"];
}

/** Hub-relative vector like campus−pin. Axis magnitudes from polyline |segment| sums. */
function pathHeadingHubVector(
  map: MapboxMap,
  coords: LatLngLike[],
): { dx: number; dy: number; ax: number; ay: number } | null {
  if (coords.length < 2) return null;
  const pts = coords.map((c) => map.project(toLngLat(c)));
  let ax = 0;
  let ay = 0;
  let netDx = 0;
  let netDy = 0;
  for (let i = 1; i < pts.length; i++) {
    const sx = pts[i].x - pts[i - 1].x;
    const sy = pts[i].y - pts[i - 1].y;
    ax += Math.abs(sx);
    ay += Math.abs(sy);
    netDx += sx;
    netDy += sy;
  }
  return { dx: -netDx, dy: -netDy, ax, ay };
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
  return candidatePairFromAxes(dx, dy, Math.abs(dx), Math.abs(dy));
}

function mapSize(map: MapboxMap): { x: number; y: number } {
  const el = map.getContainer();
  return { x: el.clientWidth, y: el.clientHeight };
}

export function resolveUniPopupSide(
  map: MapboxMap,
  listing: LatLngLike,
  campus: LatLngLike,
  pathCoords?: LatLngLike[] | null,
): AmberPopupSide {
  const size = mapSize(map);
  const heading =
    pathCoords && pathCoords.length >= 2
      ? pathHeadingHubVector(map, pathCoords)
      : null;
  const [a, b] = heading
    ? candidatePairFromAxes(heading.dx, heading.dy, heading.ax, heading.ay)
    : candidatePair(map, listing, campus);
  const pin = { x: size.x / 2, y: size.y / 2 };
  return roomierSide(a, b, pin, size);
}

function mapboxAnchorForSide(
  side: AmberPopupSide,
): "top" | "bottom" | "left" | "right" {
  switch (side) {
    case "s":
      return "top";
    case "e":
      return "left";
    case "w":
      return "right";
    case "n":
    default:
      return "bottom";
  }
}

function gapOffsetForSide(side: AmberPopupSide): [number, number] {
  switch (side) {
    case "s":
      return [0, GAP];
    case "e":
      return [GAP, 0];
    case "w":
      return [-GAP, 0];
    case "n":
    default:
      return [0, -GAP];
  }
}

const popupSide = new WeakMap<Popup, AmberPopupSide>();
const replacingPopups = new WeakSet<Popup>();

function paintPopupSide(popup: Popup, side: AmberPopupSide): void {
  popup.setOffset(gapOffsetForSide(side));
  const node = popup.getElement();
  if (node) {
    node.classList.remove(
      "skoun-popup-n",
      "skoun-popup-s",
      "skoun-popup-e",
      "skoun-popup-w",
    );
    node.classList.add(`skoun-popup-${side}`);
    node.setAttribute("data-skoun-side", side);
  }
  popupSide.set(popup, side);
}

function bindPopupCloseButton(popup: Popup): void {
  const root = popup.getElement();
  const btn = root?.querySelector(".skoun-popup-close-btn");
  if (!(btn instanceof HTMLElement) || btn.dataset.skounBound === "1") return;
  btn.dataset.skounBound = "1";
  const dismiss = (ev: Event) => {
    ev.preventDefault();
    ev.stopPropagation();
    popup.remove();
    window._skounDismissPreview?.();
  };
  btn.addEventListener("click", dismiss);
  btn.addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  });
}

function wireAmberPopup(
  popup: Popup,
  onOpen?: (popup: Popup) => void,
  onClose?: () => void,
): void {
  popup.on("open", () => {
    const prev = window._skounActivePopup;
    if (prev && prev !== popup) {
      replacingPopups.add(prev as Popup);
      prev.remove();
    }
    window._skounActivePopup = popup;
    bindPopupCloseButton(popup);
    onOpen?.(popup);
  });
  popup.on("close", () => {
    // Keep popup in replacingPopups forever (WeakSet). Mapbox can fire
    // close twice (remove + setPopup); deleting on first close made the
    // second fire call onClose and wipe sheet/route while card stayed open.
    if (replacingPopups.has(popup)) {
      if (window._skounActivePopup === popup) {
        window._skounActivePopup = null;
      }
      return;
    }
    window._skounActivePopup = null;
    onClose?.();
  });
}

/** Force-close every amber popup on the map (outside-click / dismiss). */
export function dismissAmberPopupsOnMap(map: MapboxMap): void {
  window._skounActivePopup?.remove();
  window._skounActivePopup = null;
  const root = map.getContainer();
  root.querySelectorAll(".mapboxgl-popup").forEach((node) => {
    node.remove();
  });
}

export function bindAmberPopup(
  mapboxgl: MapboxGL,
  marker: Marker,
  html: string,
  onOpen?: (popup: Popup) => void,
  onClose?: () => void,
  side: AmberPopupSide = "n",
): Popup {
  const popup = new mapboxgl.Popup({
    closeButton: false,
    offset: gapOffsetForSide(side),
    maxWidth: "240px",
    className: `skoun-mapbox-amber-popup skoun-popup-${side}`,
    anchor: mapboxAnchorForSide(side),
    closeOnClick: false,
  }).setHTML(html);

  marker.setPopup(popup);
  popupSide.set(popup, side);
  wireAmberPopup(popup, onOpen, onClose);
  return popup;
}

export function applyAmberPopupSide(
  ctx: {
    mapboxgl: MapboxGL;
    map: MapboxMap;
    marker: Marker;
    html: string;
    onOpen?: (popup: Popup) => void;
    onClose?: () => void;
  },
  popup: Popup,
  side: AmberPopupSide,
): Popup {
  const prev = popupSide.get(popup) ?? "n";
  if (prev === side) {
    paintPopupSide(popup, side);
    return popup;
  }

  const wasOpen = popup.isOpen();
  replacingPopups.add(popup);
  popup.remove();
  const next = bindAmberPopup(
    ctx.mapboxgl,
    ctx.marker,
    ctx.html,
    ctx.onOpen,
    ctx.onClose,
    side,
  );
  if (wasOpen) {
    next.addTo(ctx.map);
    window._skounActivePopup = next;
    bindPopupCloseButton(next);
  }
  return next;
}

export function amberPopupHtml(group: MapPinGroup): string {
  if (group.count > 1) return createAmberGroupPopupHtml(group);
  const listing = group.listings[0];
  return listing ? createAmberPopupHtml(listing) : "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
