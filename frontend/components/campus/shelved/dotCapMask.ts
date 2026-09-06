/**
 * Graduation cap as a *filled* silhouette, used to tag dots in the hero
 * DotGrid. Same coordinate system as the shelved dash cap
 * (`shelved/heroCapGeometry.ts`): a 420x360 viewBox, y grows downward.
 */

/** Bounding box of the cap in cap-space — what gets fitted into a frame. */
export const CAP_BOX = { x: 30, y: 48, w: 380, h: 222 } as const;

// Mortarboard top: a square seen in perspective — rhombus centred at
// (210,118) with half-diagonals 168 x 60.
const BOARD = { cx: 210, cy: 118, hx: 168, hy: 60 } as const;
// Board thickness — a strip hanging under the two front edges.
const BOARD_DEPTH = 9;

// Skull cap: vertical sides under the board, chevron bottom parallel to the
// board's front edges.
const BODY = { cx: 210, half: 96, side: 58 } as const;
const BODY_SIDE_TOP = BOARD.cy + BOARD.hy * (1 - BODY.half / BOARD.hx);
const BODY_SIDE_BOTTOM = BODY_SIDE_TOP + BODY.side;

// Tassel: drop from the right corner of the board, then a fanning tuft.
const DROP = { x1: 378, y1: 120, x2: 386, y2: 206 } as const;
const TUFT = { cx: 386, top: 206, bottom: 246, halfTop: 3, halfBottom: 12 } as const;

/** Rhombus metric: 0 at centre, 1 on the edge. */
function boardMetric(x: number, y: number): number {
  return Math.abs(x - BOARD.cx) / BOARD.hx + Math.abs(y - BOARD.cy) / BOARD.hy;
}

/** Y of the board's lower (front) edge at a given x. */
function boardFrontY(x: number): number {
  return BOARD.cy + BOARD.hy * (1 - Math.abs(x - BOARD.cx) / BOARD.hx);
}

/** Y of the body's chevron bottom at a given x. */
function bodyBottomY(x: number): number {
  const inset = BODY.half - Math.abs(x - BODY.cx);
  return BODY_SIDE_BOTTOM + inset * (BOARD.hy / BOARD.hx);
}

function inBoard(x: number, y: number): boolean {
  return boardMetric(x, y) <= 1;
}

function inBoardDepth(x: number, y: number): boolean {
  if (Math.abs(x - BOARD.cx) > BOARD.hx) return false;
  const front = boardFrontY(x);
  return y > front && y <= front + BOARD_DEPTH;
}

function inBody(x: number, y: number): boolean {
  if (Math.abs(x - BODY.cx) > BODY.half) return false;
  if (y <= boardFrontY(x) + BOARD_DEPTH) return false;
  return y <= bodyBottomY(x);
}

/** Distance from a point to a line segment. */
function segmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function inDrop(x: number, y: number, tol: number): boolean {
  return segmentDistance(x, y, DROP.x1, DROP.y1, DROP.x2, DROP.y2) <= tol;
}

function inTuft(x: number, y: number, tol: number): boolean {
  if (y < TUFT.top - tol || y > TUFT.bottom + tol) return false;
  const t = Math.max(0, Math.min(1, (y - TUFT.top) / (TUFT.bottom - TUFT.top)));
  const half = TUFT.halfTop + (TUFT.halfBottom - TUFT.halfTop) * t;
  return Math.abs(x - TUFT.cx) <= half + tol * 0.5;
}

/**
 * Whether a cap-space point lies on the cap silhouette.
 * `tol` (cap units) fattens thin parts — the tassel — so they still catch
 * at least one dot per row at the grid's resolution. Pass ~half a cell.
 */
export function isCapPoint(x: number, y: number, tol = 0): boolean {
  return (
    inBoard(x, y) ||
    inBoardDepth(x, y) ||
    inBody(x, y) ||
    inDrop(x, y, tol) ||
    inTuft(x, y, tol)
  );
}

export type Frame = { x: number; y: number; w: number; h: number };

/**
 * `contain`-fit the cap box inside a pixel frame and return a mapper from
 * pixel coordinates (same space as the frame) to cap-space, plus the scale
 * (px per cap unit) so callers can convert pixel tolerances.
 */
export function capMapper(frame: Frame): {
  toCap: (px: number, py: number) => { x: number; y: number };
  scale: number;
} {
  const scale = Math.max(
    1e-6,
    Math.min(frame.w / CAP_BOX.w, frame.h / CAP_BOX.h),
  );
  const ox = frame.x + (frame.w - CAP_BOX.w * scale) / 2;
  const oy = frame.y + (frame.h - CAP_BOX.h * scale) / 2;
  return {
    scale,
    toCap: (px, py) => ({
      x: CAP_BOX.x + (px - ox) / scale,
      y: CAP_BOX.y + (py - oy) / scale,
    }),
  };
}
