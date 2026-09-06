/**
 * Graduation cap sampled as short dashes — shared by the web (interactive)
 * and native (static) HeroCap renderers so both draw the same silhouette.
 *
 * Coordinates live in a 420x360 viewBox. Angles are degrees; a dash is
 * symmetric so angles are only meaningful modulo 180.
 */

/** Visible viewBox — cropped to the cap so it fills the hero slot. */
export const CAP_VIEW = { x: 30, y: 48, w: 380, h: 222 } as const;
export const CAP_VIEWBOX = `${CAP_VIEW.x} ${CAP_VIEW.y} ${CAP_VIEW.w} ${CAP_VIEW.h}`;

export type CapDash = {
  x: number;
  y: number;
  /** Full dash length in viewBox units. */
  len: number;
  /** Stroke opacity 0–1. */
  o: number;
  /** Resting angle in degrees, follows the local edge of the cap. */
  rest: number;
};

const DEG = 180 / Math.PI;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Mortarboard top: a square seen in perspective — rhombus centred at
// (210,118) with half-diagonals 168 x 60.
const BOARD = { cx: 210, cy: 118, hx: 168, hy: 60 } as const;
// Screen-space slope of the board edges (y grows downward).
const TILT = Math.atan2(BOARD.hy, BOARD.hx) * DEG; // ≈ 19.7°
// Board thickness — a strip hanging under the two front edges.
const BOARD_DEPTH = 9;
// Dashes within this "rhombus metric" distance of the edge form the outline.
const RIM = 0.14;

// Skull cap, after Ionicons `school-outline`: vertical sides under the
// board, a chevron bottom parallel to the board's front edges, and a seam
// down the centre.
const BODY = {
  cx: 210,
  half: 96,
  // Height of the vertical sides, measured from the board's front edge.
  side: 58,
  edge: 8,
} as const;
const BODY_SIDE_TOP = BOARD.cy + BOARD.hy * (1 - BODY.half / BOARD.hx);
const BODY_SIDE_BOTTOM = BODY_SIDE_TOP + BODY.side;

// Tassel: button at the board centre, cord along the board to the right
// corner, then a drop and a tuft.
const BUTTON = { x: 210, y: 118, r: 7 } as const;
const DROP = { x1: 378, y1: 120, x2: 386, y2: 206 } as const;
const TUFT = { cx: 386, top: 206, bottom: 246 } as const;

/** Rhombus metric: 0 at centre, 1 on the edge. */
function boardMetric(x: number, y: number): number {
  return Math.abs(x - BOARD.cx) / BOARD.hx + Math.abs(y - BOARD.cy) / BOARD.hy;
}

/** Y of the board's lower (front) edge at a given x. */
function boardFrontY(x: number): number {
  return BOARD.cy + BOARD.hy * (1 - Math.abs(x - BOARD.cx) / BOARD.hx);
}

/** Direction of the board edge nearest this point. */
function edgeAngle(x: number, y: number): number {
  const upper = y < BOARD.cy;
  const left = x < BOARD.cx;
  return (upper === left ? -1 : 1) * TILT;
}

/** Y of the body's chevron bottom at a given x. */
function bodyBottomY(x: number): number {
  const inset = BODY.half - Math.abs(x - BODY.cx);
  return BODY_SIDE_BOTTOM + inset * (BOARD.hy / BOARD.hx);
}

function inBody(x: number, y: number): boolean {
  if (Math.abs(x - BODY.cx) > BODY.half) return false;
  if (y <= boardFrontY(x) + BOARD_DEPTH + 2) return false;
  return y <= bodyBottomY(x);
}

function inBoardDepth(x: number, y: number): boolean {
  if (Math.abs(x - BOARD.cx) > BOARD.hx) return false;
  const front = boardFrontY(x);
  return y > front + 1 && y <= front + BOARD_DEPTH;
}

function buildDashes(): CapDash[] {
  const out: CapDash[] = [];
  const pitch = 10;
  let k = 0;

  // Grid is symmetric about the cap centre (x = 210) so both sides match.
  for (let gx = 30; gx <= 410; gx += pitch) {
    for (let gy = 52; gy <= 266; gy += pitch) {
      k += 1;
      const x = gx + (hash(k) - 0.5) * 4;
      const y = gy + (hash(k + 8) - 0.5) * 4;

      let rest: number | null = null;
      let o = 0.3 + hash(k + 21) * 0.5;
      let len = 9 + hash(k + 4) * 5;

      const m = boardMetric(x, y);
      if (m <= 1) {
        if (m >= 1 - RIM) {
          // Outline: follow the edge, brighter and longer.
          rest = edgeAngle(x, y);
          o = 0.68 + hash(k + 5) * 0.27;
          len = 11 + hash(k + 6) * 4;
        } else {
          // Interior grain: one consistent direction, thinned out so the
          // outline dominates and the board reads as a flat plane.
          if (hash(k + 9) < 0.3) continue;
          rest = TILT;
          o = 0.26 + hash(k + 21) * 0.34;
        }
      } else if (inBoardDepth(x, y)) {
        rest = x < BOARD.cx ? TILT : -TILT;
        o = 0.55 + hash(k + 7) * 0.3;
        len = 10 + hash(k + 6) * 4;
      } else if (inBody(x, y)) {
        const dx = Math.abs(x - BODY.cx);
        if (y >= bodyBottomY(x) - BODY.edge) {
          // Chevron bottom — follows the board's front edges.
          rest = x < BODY.cx ? TILT : -TILT;
          o = 0.62 + hash(k + 7) * 0.3;
          len = 11 + hash(k + 6) * 4;
        } else if (dx >= BODY.half - BODY.edge) {
          // Vertical sides.
          rest = 90;
          o = 0.62 + hash(k + 7) * 0.3;
          len = 11 + hash(k + 6) * 4;
        } else {
          // Sparse vertical fill so the outline dominates.
          if (hash(k + 9) < 0.4) continue;
          rest = 90;
          o = 0.24 + hash(k + 21) * 0.3;
        }
      }

      if (rest == null) continue;
      out.push({ x, y, len, o: Math.min(0.95, o), rest });
    }
  }

  // Centre seam: from the board's bottom vertex to the chevron point.
  const seamTop = boardFrontY(BODY.cx) + BOARD_DEPTH + 4;
  const seamBottom = bodyBottomY(BODY.cx) - 4;
  for (let y = seamTop; y <= seamBottom; y += 10) {
    k += 1;
    out.push({
      x: BODY.cx + (hash(k) - 0.5) * 1.2,
      y,
      len: 9,
      o: 0.7 + hash(k + 3) * 0.25,
      rest: 90,
    });
  }

  // Button: a small ring of tangential dashes at the board centre.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    out.push({
      x: BUTTON.x + Math.cos(a) * BUTTON.r,
      y: BUTTON.y + Math.sin(a) * BUTTON.r * 0.55,
      len: 6,
      o: 0.9,
      rest: a * DEG + 90,
    });
  }

  // Cord lying on the board, from the button to the right corner.
  const cordStart = BUTTON.x + BUTTON.r + 4;
  const cordEnd = BOARD.cx + BOARD.hx - 2;
  for (let x = cordStart; x <= cordEnd; x += 8) {
    k += 1;
    out.push({
      x,
      y: BOARD.cy + (hash(k) - 0.5) * 1.5,
      len: 7,
      o: 0.85,
      rest: 0,
    });
  }

  // Drop: hangs from the corner down to the tuft.
  const dropAngle = Math.atan2(DROP.y2 - DROP.y1, DROP.x2 - DROP.x1) * DEG;
  const dropLen = Math.hypot(DROP.x2 - DROP.x1, DROP.y2 - DROP.y1);
  const steps = Math.floor(dropLen / 8);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    k += 1;
    out.push({
      x: DROP.x1 + (DROP.x2 - DROP.x1) * t + (hash(k) - 0.5) * 1.2,
      y: DROP.y1 + (DROP.y2 - DROP.y1) * t,
      len: 8,
      o: 0.7 + hash(k + 3) * 0.25,
      rest: dropAngle,
    });
  }

  // Knot where the tuft starts.
  out.push({ x: TUFT.cx, y: TUFT.top, len: 9, o: 0.9, rest: 0 });

  // Tuft: strands fanning out from the knot, each a chain of dashes.
  const strands = 7;
  for (let s = 0; s < strands; s++) {
    const spread = (s / (strands - 1) - 0.5) * 2; // -1 … 1
    const x1 = TUFT.cx + spread * 2;
    const x2 = TUFT.cx + spread * 11;
    const y1 = TUFT.top + 4;
    const y2 = TUFT.bottom - Math.abs(spread) * 5;
    const angle = Math.atan2(y2 - y1, x2 - x1) * DEG;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      k += 1;
      out.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        len: 7 + hash(k) * 2,
        o: 0.55 + hash(k + 3) * 0.35,
        rest: angle,
      });
    }
  }

  return out;
}

export const CAP_DASHES: readonly CapDash[] = buildDashes();

/** Shortest signed difference between two line angles (mod 180). */
export function lineDelta(from: number, to: number): number {
  return ((((to - from) % 180) + 270) % 180) - 90;
}
