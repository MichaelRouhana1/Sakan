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
  Point,
  Popup,
  Polyline,
  TileLayer,
} from "leaflet";
import type { Listing } from "@/types/listing";
import type { MapPinGroup } from "@/lib/mapPinGroups";
import { listingCardSubtitle, listingCardTitle } from "@/lib/listingCardMeta";

export type LeafletNS = typeof import("leaflet");

declare global {
  interface Window {
    _skounActivePopup?: { remove: () => void } | null;
  }
}

let leafletPromise: Promise<LeafletNS> | null = null;

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Ensure Leaflet CSS is loaded (client only). Always refresh overrides. */
export function ensureLeafletCss(): void {
  if (typeof document === "undefined") return;
  const id = "skoun-leaflet-css";
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  const overridesId = "skoun-leaflet-overrides";
  let style = document.getElementById(overridesId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = overridesId;
    document.head.appendChild(style);
  }
  style.textContent = `
    .skoun-leaflet-map { width: 100%; height: 100%; position: relative; z-index: 0; background: #E2E8F0; overflow: hidden; }
    .skoun-leaflet-map .leaflet-container { width: 100%; height: 100%; max-width: 100%; max-height: 100%; position: relative; z-index: 0; overflow: hidden; }
    .skoun-leaflet-map .leaflet-control-attribution { font-size: 10px; }
    .skoun-div-icon {
      background: transparent !important;
      border: none !important;
      overflow: visible !important;
      pointer-events: none !important;
    }
    .skoun-teardrop, .skoun-cluster-bubble { pointer-events: auto; }
    .skoun-price-stack { display: flex; flex-direction: column; align-items: center; gap: 3px; pointer-events: none; }
    .skoun-price-pill {
      background: #fff; border: 1px solid #C5CDD8; border-radius: 8px;
      padding: 3px 8px; font: 600 12px "DM Sans", system-ui, sans-serif; color: #121826;
      box-shadow: 0 1px 3px rgba(18,24,38,0.12); white-space: nowrap;
      pointer-events: none;
    }
    .skoun-price-pill.on { background: #fff; border-color: #C5CDD8; color: #121826; }
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
    .skoun-dist-icon {
      background: transparent !important;
      border: none !important;
    }
    .skoun-dist-badge {
      display: flex; align-items: center; justify-content: center;
      width: 100%; height: 100%; box-sizing: border-box;
      background: #fff; border: 1.5px solid #C23B2E; border-radius: 999px;
      padding: 0 6px; font: 600 10px/1 "DM Sans", system-ui, sans-serif; color: #8E241A;
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

    /* Amber Floating Map Popup */
    .skoun-leaflet-amber-popup .leaflet-popup-content-wrapper {
      padding: 0 !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04) !important;
      border: 1px solid #E2E8F0 !important;
      overflow: hidden !important;
      background: #ffffff !important;
    }
    .skoun-leaflet-amber-popup .leaflet-popup-content {
      margin: 0 !important;
      width: 240px !important;
      line-height: 1.4 !important;
    }
    .skoun-leaflet-amber-popup {
      overflow: visible !important;
    }
    .skoun-leaflet-amber-popup .leaflet-popup-tip-container {
      margin-top: -1px;
    }
    .skoun-leaflet-amber-popup.skoun-popup-s,
    .skoun-leaflet-amber-popup.skoun-popup-e,
    .skoun-leaflet-amber-popup.skoun-popup-w {
      margin-bottom: 0;
    }
    .skoun-leaflet-amber-popup.skoun-popup-s .leaflet-popup-tip-container {
      top: 0;
      bottom: auto;
      left: 50%;
      margin: 0 0 0 -20px;
      width: 40px;
      height: 20px;
      transform: translateY(-100%);
    }
    .skoun-leaflet-amber-popup.skoun-popup-s .leaflet-popup-tip {
      margin: 8px auto -10px;
    }
    .skoun-leaflet-amber-popup.skoun-popup-e .leaflet-popup-tip-container {
      left: 0;
      right: auto;
      top: 50%;
      margin: -12px 0 0 0;
      width: 12px;
      height: 24px;
      transform: translate(-100%, 0);
      overflow: hidden;
    }
    .skoun-leaflet-amber-popup.skoun-popup-e .leaflet-popup-tip {
      width: 16px;
      height: 16px;
      margin: 4px 0 0 6px;
    }
    .skoun-leaflet-amber-popup.skoun-popup-w .leaflet-popup-tip-container {
      left: auto;
      right: 0;
      top: 50%;
      margin: -12px 0 0 0;
      width: 12px;
      height: 24px;
      transform: translate(100%, 0);
      overflow: hidden;
    }
    .skoun-leaflet-amber-popup.skoun-popup-w .leaflet-popup-tip {
      width: 16px;
      height: 16px;
      margin: 4px 0 0 -10px;
    }
    .skoun-leaflet-amber-popup .leaflet-popup-close-button {
      display: none !important;
    }
    .leaflet-fade-anim .skoun-leaflet-amber-popup {
      transition: none !important;
      opacity: 1 !important;
    }
    .leaflet-zoom-anim .skoun-leaflet-amber-popup {
      transition: none !important;
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
    .skoun-popup-media {
      width: 100%;
      height: 130px;
      position: relative;
      overflow: hidden;
      background: #F1F5F9;
    }
    .skoun-popup-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .skoun-popup-close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.92);
      border: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      padding: 0;
      transition: background 150ms ease;
    }
    .skoun-popup-close-btn:hover {
      background: #ffffff;
    }
    .skoun-popup-body {
      display: block;
      padding: 12px;
      background: #ffffff;
    }
    .skoun-popup-title {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .skoun-popup-subtitle {
      font-size: 12px;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .skoun-popup-price {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 4px;
    }
    .skoun-popup-price .unit {
      font-size: 12px;
      font-weight: 400;
      color: #64748B;
    }

    .skoun-amber-popup-group {
      padding: 12px;
      width: 240px;
    }
    .skoun-popup-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E2E8F0;
    }
    .skoun-popup-group-list {
      max-height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .skoun-popup-group-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      text-decoration: none !important;
      color: inherit !important;
      transition: background 150ms ease;
    }
    .skoun-popup-group-item:hover {
      background: #F1F5F9;
    }
    .skoun-popup-group-title {
      font-size: 12px;
      font-weight: 600;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
    }
    .skoun-popup-group-price {
      font-size: 12px;
      font-weight: 700;
      color: #2F6FED;
    }
  `;
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
    scrollWheelZoom: true,
    wheelPxPerZoomLevel: 140,
    wheelDebounceTime: 60,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    fadeAnimation: false,
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
    iconSize: [30, 65],
    iconAnchor: [15, 65],
  });
}

/** Amber-style count bubble — size scales with point density. */
export function clusterBubbleIcon(
  L: LeafletNS,
  count: number,
  size: number,
): DivIcon {
  const html = `<div class="skoun-cluster-bubble" style="width:${size}px;height:${size}px;font-size:${size >= 46 ? 15 : 13}px">${escapeHtml(String(count))}</div>`;
  return L.divIcon({
    className: "skoun-div-icon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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

/** Liang–Barsky clip. Returns segment params t0..t1 on p0→p1 inside rect, or null. */
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

/** Leaflet +/- zoom control — measured from map container when present. */
function zoomControlExcludeRect(
  map: LeafletMap,
  pad: number,
): { left: number; top: number; right: number; bottom: number } | null {
  const container = map.getContainer();
  const zoom = container.querySelector(".leaflet-control-zoom");
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

/** Slide t along the line (toward listing first) until the badge clears UI chrome. */
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
      badgeRectAt(
        a.x + t * (b.x - a.x),
        a.y + t * (b.y - a.y),
        bw,
        bh,
      ),
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

/**
 * Badge lat/lng on the campus line. True midpoint when on screen;
 * otherwise clamped to the visible line at the viewport edge.
 */
export function distanceBadgeLatLng(
  map: LeafletMap,
  campus: { lat: number; lng: number },
  listing: { lat: number; lng: number },
  label: string,
): { lat: number; lng: number } {
  const geoMid = {
    lat: (campus.lat + listing.lat) / 2,
    lng: (campus.lng + listing.lng) / 2,
  };
  const a = map.latLngToContainerPoint([campus.lat, campus.lng]);
  const b = map.latLngToContainerPoint([listing.lat, listing.lng]);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const [bw, bh] = distBadgeSize(label);
  const size = map.getSize();
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

  const ll = map.containerPointToLatLng([
    a.x + t * (b.x - a.x),
    a.y + t * (b.y - a.y),
  ]);
  return { lat: ll.lat, lng: ll.lng };
}

export function distanceBadgeIcon(L: LeafletNS, label: string): DivIcon {
  ensureLeafletCss();
  const size = distBadgeSize(label);
  return L.divIcon({
    className: "skoun-div-icon skoun-dist-icon",
    html: `<div class="skoun-dist-badge">${escapeHtml(label)}</div>`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
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

const AMBER_POPUP_OPTS = {
  className: "skoun-leaflet-amber-popup",
  closeButton: false,
  offset: [0, -8] as [number, number],
  maxWidth: 240,
  minWidth: 240,
  autoPan: false,
  autoPanPadding: [40, 40] as [number, number],
};

export type AmberPopupSide = "n" | "s" | "e" | "w";

const POPUP_SIDE_CLASS: Record<AmberPopupSide, string> = {
  n: "skoun-popup-n",
  s: "skoun-popup-s",
  e: "skoun-popup-e",
  w: "skoun-popup-w",
};

const POPUP_SIDE_CLASSES = Object.values(POPUP_SIDE_CLASS);

const CARD_W = 240;
const CARD_H = 222;
const TIP = 20;
const GAP = 8;
const CLIP_PAD = 8;

type LatLngLike = { lat: number; lng: number };

/** Leftover px from pin to map edge after placing the card on that side. */
function leftoverSpace(
  side: AmberPopupSide,
  pin: Point,
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
  pin: Point,
  mapSize: { x: number; y: number },
): AmberPopupSide {
  return leftoverSpace(a, pin, mapSize) >= leftoverSpace(b, pin, mapSize)
    ? a
    : b;
}

/** Smaller/larger axis ≥ this → treat as diagonal (opposite corner). */
const DIAGONAL_RATIO = 0.35;

/**
 * Vertical line → left/right. Horizontal → top/bottom.
 * Diagonal → opposite corner (away from campus).
 */
function candidatePair(
  map: LeafletMap,
  listing: LatLngLike,
  campus: LatLngLike,
): [AmberPopupSide, AmberPopupSide] {
  const pin = map.latLngToContainerPoint([listing.lat, listing.lng]);
  const hub = map.latLngToContainerPoint([campus.lat, campus.lng]);
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

/** Score leftover as if pin is already map-center (we pan there on select). */
function centeredPin(map: LeafletMap): Point {
  const size = map.getSize();
  return { x: size.x / 2, y: size.y / 2 } as Point;
}

/** Roomier side from the line pair only — never flips to the other axis. */
export function preferredUniPopupSide(
  map: LeafletMap,
  listing: LatLngLike,
  campus: LatLngLike,
): AmberPopupSide {
  const size = map.getSize();
  const [a, b] = candidatePair(map, listing, campus);
  return roomierSide(a, b, centeredPin(map), size);
}

export function resolveUniPopupSide(
  map: LeafletMap,
  listing: LatLngLike,
  campus: LatLngLike,
): AmberPopupSide {
  return preferredUniPopupSide(map, listing, campus);
}

function offsetForSide(
  side: AmberPopupSide,
  width: number,
  height: number,
): [number, number] {
  switch (side) {
    case "s":
      return [0, height + TIP + GAP];
    case "e":
      return [width / 2 + TIP + GAP, height / 2];
    case "w":
      return [-(width / 2 + TIP + GAP), height / 2];
    case "n":
    default:
      return [0, -GAP];
  }
}

export function applyAmberPopupSide(popup: Popup, side: AmberPopupSide): void {
  const el = popup.getElement();
  if (el) {
    for (const cls of POPUP_SIDE_CLASSES) el.classList.remove(cls);
    el.classList.add(POPUP_SIDE_CLASS[side]);
  }
  const width = el?.offsetWidth || CARD_W;
  const height = el?.offsetHeight || CARD_H;
  popup.options.offset = offsetForSide(side, width, height);
  popup.update();
}

export function amberPopupHtml(group: MapPinGroup): string {
  if (group.count > 1) return createAmberGroupPopupHtml(group);
  const listing = group.listings[0];
  return listing ? createAmberPopupHtml(listing) : "";
}

export function bindAmberPopup(
  marker: Marker,
  html: string,
  onOpen?: () => void,
  onClose?: () => void,
): void {
  marker.bindPopup(html, AMBER_POPUP_OPTS);
  marker.on("popupopen", (e) => {
    const popup = (e as unknown as { popup: { remove: () => void } }).popup;
    window._skounActivePopup = popup;
    onOpen?.();
  });
  marker.on("popupclose", () => {
    window._skounActivePopup = null;
    onClose?.();
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
  Popup,
  Polyline,
  TileLayer,
};
