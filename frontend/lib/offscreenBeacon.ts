export type EdgePad = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type AvoidRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type OffscreenBeacon = {
  /** Top-left of the circle, in viewport pixels. */
  x: number;
  y: number;
  /** Degrees. 0 = pointing right (screen east). */
  angleDeg: number;
};

export const OFFSCREEN_BEACON_SIZE = 44;

type BeaconOpts = {
  size?: number;
  pad?: Partial<EdgePad> | number;
  /** Treat the target as still visible this far inside the viewport. */
  hideInset?: number;
  avoid?: AvoidRect[];
};

function normalizePad(
  pad: Partial<EdgePad> | number | undefined,
  size: number,
): EdgePad {
  const half = size / 2;
  const base = 14 + half;
  if (typeof pad === "number") {
    const v = pad + half;
    return { top: v, right: v, bottom: v, left: v };
  }
  return {
    top: (pad?.top ?? 14) + half,
    right: (pad?.right ?? 14) + half,
    bottom: (pad?.bottom ?? 20) + half,
    left: (pad?.left ?? 14) + half,
  };
}

function rayRectHit(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): { x: number; y: number } | null {
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (right - cx) / dx);
  else if (dx < 0) t = Math.min(t, (left - cx) / dx);
  if (dy > 0) t = Math.min(t, (bottom - cy) / dy);
  else if (dy < 0) t = Math.min(t, (top - cy) / dy);
  if (!Number.isFinite(t) || t <= 0) return null;
  return { x: cx + dx * t, y: cy + dy * t };
}

function circleHitsRect(
  cx: number,
  cy: number,
  r: number,
  rect: AvoidRect,
): boolean {
  return !(
    cx + r < rect.left ||
    cx - r > rect.right ||
    cy + r < rect.top ||
    cy - r > rect.bottom
  );
}

function nudgeOutOfRects(
  hit: { x: number; y: number },
  radius: number,
  avoid: AvoidRect[],
  bounds: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number } {
  let { x, y } = hit;
  for (const rect of avoid) {
    if (!circleHitsRect(x, y, radius + 2, rect)) continue;
    const candidates = [
      { x: rect.left - radius - 4, y },
      { x: rect.right + radius + 4, y },
      { x, y: rect.top - radius - 4 },
      { x, y: rect.bottom + radius + 4 },
    ].filter(
      (p) =>
        p.x >= bounds.left &&
        p.x <= bounds.right &&
        p.y >= bounds.top &&
        p.y <= bounds.bottom,
    );
    if (candidates.length === 0) continue;
    let best = candidates[0];
    let bestD = Infinity;
    for (const p of candidates) {
      const d = (p.x - hit.x) ** 2 + (p.y - hit.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    x = best.x;
    y = best.y;
  }
  return {
    x: Math.min(bounds.right, Math.max(bounds.left, x)),
    y: Math.min(bounds.bottom, Math.max(bounds.top, y)),
  };
}

/**
 * Sit a circular beacon on the viewport edge, pointing at an off-screen target.
 * Returns null while the target is still inside the padded viewport.
 */
export function offscreenEdgeBeacon(
  target: { x: number; y: number },
  viewport: { width: number; height: number },
  opts?: BeaconOpts,
): OffscreenBeacon | null {
  const size = opts?.size ?? OFFSCREEN_BEACON_SIZE;
  const hideInset = opts?.hideInset ?? 10;
  const w = viewport.width;
  const h = viewport.height;
  if (w < size + 16 || h < size + 16) return null;

  const onScreen =
    target.x >= hideInset &&
    target.x <= w - hideInset &&
    target.y >= hideInset &&
    target.y <= h - hideInset;
  if (onScreen) return null;

  const pad = normalizePad(opts?.pad, size);
  const left = pad.left;
  const top = pad.top;
  const right = w - pad.right;
  const bottom = h - pad.bottom;
  if (right <= left || bottom <= top) return null;

  const cx = w / 2;
  const cy = h / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return null;

  const raw = rayRectHit(cx, cy, dx, dy, left, top, right, bottom);
  if (!raw) return null;

  const hit = nudgeOutOfRects(raw, size / 2, opts?.avoid ?? [], {
    left,
    top,
    right,
    bottom,
  });

  return {
    x: hit.x - size / 2,
    y: hit.y - size / 2,
    angleDeg: (Math.atan2(target.y - hit.y, target.x - hit.x) * 180) / Math.PI,
  };
}

export function sameOffscreenBeacon(
  a: OffscreenBeacon | null,
  b: OffscreenBeacon | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) < 0.6 &&
    Math.abs(a.y - b.y) < 0.6 &&
    Math.abs(a.angleDeg - b.angleDeg) < 0.5
  );
}

export function projectOnRegion(
  point: { lat: number; lng: number },
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  },
  size: { width: number; height: number },
): { x: number; y: number } {
  const west = region.longitude - region.longitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  return {
    x: ((point.lng - west) / region.longitudeDelta) * size.width,
    y: ((north - point.lat) / region.latitudeDelta) * size.height,
  };
}
