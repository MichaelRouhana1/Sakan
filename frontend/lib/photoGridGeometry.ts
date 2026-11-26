export const PHOTO_GRID_COLUMNS = 2;
export const PHOTO_GRID_GAP = 12;
export const PHOTO_DELETE_SAFE_ZONE = 44;

export type Point2D = { x: number; y: number };

export type PhotoSlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  imageHeight: number;
};

/** Computes uniform 2-column slot rectangles from measured grid width and cell height. */
export function buildPhotoSlotRects(
  count: number,
  gridWidth: number,
  cellHeight: number,
  gap: number = PHOTO_GRID_GAP,
  columns: number = PHOTO_GRID_COLUMNS,
): PhotoSlotRect[] {
  if (count <= 0 || gridWidth <= 0 || columns <= 0) return [];
  const width = (gridWidth - gap * (columns - 1)) / columns;
  if (width <= 0) return [];
  const imageHeight = width;
  const height = Math.max(imageHeight, cellHeight);
  const rects: PhotoSlotRect[] = [];
  for (let index = 0; index < count; index++) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    rects.push({
      x: col * (width + gap),
      y: row * (height + gap),
      width,
      height,
      imageHeight,
    });
  }
  return rects;
}

/**
 * Returns the slot index if `point` lies inside that slot's square photo image
 * and outside the top-left delete button safe zone; otherwise returns -1.
 */
export function hitTestPhotoImage(
  point: Point2D,
  rects: readonly PhotoSlotRect[],
  deleteSafeZone: number = PHOTO_DELETE_SAFE_ZONE,
): number {
  for (let index = 0; index < rects.length; index++) {
    const r = rects[index];
    if (
      point.x >= r.x &&
      point.x <= r.x + r.width &&
      point.y >= r.y &&
      point.y <= r.y + r.imageHeight
    ) {
      const localX = point.x - r.x;
      const localY = point.y - r.y;
      if (localX <= deleteSafeZone && localY <= deleteSafeZone) {
        return -1;
      }
      return index;
    }
  }
  return -1;
}

/**
 * Finds the destination slot index for a dragged tile whose visual center is `center`.
 * Applies a small inset hysteresis on non-current slots so hovering on the seam between
 * two tiles never flickers back and forth, while clamping drags outside the grid bounds
 * to the nearest valid photo slot (never past the last photo).
 */
export function targetSlotIndexForCenter(
  center: Point2D,
  rects: readonly PhotoSlotRect[],
  currentIndex: number,
): number {
  if (rects.length <= 1) return currentIndex;

  // 1. Direct hit against any non-current slot with gentle inset hysteresis.
  for (let index = 0; index < rects.length; index++) {
    const r = rects[index];
    const insetX = index === currentIndex ? 0 : r.width * 0.12;
    const insetY = index === currentIndex ? 0 : r.imageHeight * 0.12;
    if (
      center.x >= r.x + insetX &&
      center.x <= r.x + r.width - insetX &&
      center.y >= r.y + insetY &&
      center.y <= r.y + r.height - insetY
    ) {
      return index;
    }
  }

  // 2. If still clearly inside the current slot (including its seam margin), stay put.
  const current = rects[currentIndex];
  if (current) {
    const padX = current.width * 0.16;
    const padY = current.imageHeight * 0.16;
    if (
      center.x >= current.x - padX &&
      center.x <= current.x + current.width + padX &&
      center.y >= current.y - padY &&
      center.y <= current.y + current.height + padY
    ) {
      return currentIndex;
    }
  }

  // 3. Outside grid bounds or deep in the gutter: snap to the nearest photo slot center.
  let bestIndex = currentIndex;
  let bestDistSq = Number.POSITIVE_INFINITY;
  for (let index = 0; index < rects.length; index++) {
    const r = rects[index];
    const cx = r.x + r.width / 2;
    const cy = r.y + r.imageHeight / 2;
    const dx = center.x - cx;
    const dy = center.y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = index;
    }
  }
  return bestIndex;
}

/** Moves an item in an array from `fromIndex` to `toIndex` without mutating the input. */
export function movePhotoByIndex<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items as T[];
  }
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Computes vertical edge auto-scroll velocity (px per frame) when dragging near viewport edges. */
export function edgeAutoScrollStep(
  pointerScreenY: number,
  viewportTop: number,
  viewportBottom: number,
  edgeZone: number = 76,
  maxSpeed: number = 11,
): number {
  if (viewportBottom <= viewportTop) return 0;
  if (pointerScreenY < viewportTop + edgeZone) {
    const ratio = Math.min(1, Math.max(0, (viewportTop + edgeZone - pointerScreenY) / edgeZone));
    return -Math.max(1.5, ratio * maxSpeed);
  }
  if (pointerScreenY > viewportBottom - edgeZone) {
    const ratio = Math.min(1, Math.max(0, (pointerScreenY - (viewportBottom - edgeZone)) / edgeZone));
    return Math.max(1.5, ratio * maxSpeed);
  }
  return 0;
}
