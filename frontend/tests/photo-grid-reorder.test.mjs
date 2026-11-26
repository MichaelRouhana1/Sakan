import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPhotoSlotRects,
  edgeAutoScrollStep,
  hitTestPhotoImage,
  movePhotoByIndex,
  targetSlotIndexForCenter,
} from "../lib/photoGridGeometry.ts";

test("buildPhotoSlotRects computes flush 2-column rows", () => {
  const rects = buildPhotoSlotRects(4, 332, 260, 12, 2);
  assert.equal(rects.length, 4);
  // (332 - 12) / 2 = 160
  assert.deepEqual(rects[0], { x: 0, y: 0, width: 160, height: 260, imageHeight: 160 });
  assert.deepEqual(rects[1], { x: 172, y: 0, width: 160, height: 260, imageHeight: 160 });
  assert.deepEqual(rects[2], { x: 0, y: 272, width: 160, height: 260, imageHeight: 160 });
  assert.deepEqual(rects[3], { x: 172, y: 272, width: 160, height: 260, imageHeight: 160 });
});

test("hitTestPhotoImage accepts photo body and excludes delete zone and caption", () => {
  const rects = buildPhotoSlotRects(2, 332, 260, 12, 2);
  // Center of photo 0
  assert.equal(hitTestPhotoImage({ x: 80, y: 80 }, rects), 0);
  // Center of photo 1
  assert.equal(hitTestPhotoImage({ x: 250, y: 80 }, rects), 1);
  // Top-left delete safe zone of photo 0 and photo 1
  assert.equal(hitTestPhotoImage({ x: 20, y: 20 }, rects), -1);
  assert.equal(hitTestPhotoImage({ x: 192, y: 20 }, rects), -1);
  // Caption input region below the 160px square image
  assert.equal(hitTestPhotoImage({ x: 80, y: 210 }, rects), -1);
  // Gap between columns
  assert.equal(hitTestPhotoImage({ x: 166, y: 80 }, rects), -1);
});

test("2-photo grid supports horizontal swap and swapping back cleanly", () => {
  const rects = buildPhotoSlotRects(2, 332, 260, 12, 2);
  // Dragging photo 0 right over photo 1
  assert.equal(targetSlotIndexForCenter({ x: 252, y: 80 }, rects, 0), 1);
  // After swap, active photo is now at index 1; staying in slot 1 keeps index 1
  assert.equal(targetSlotIndexForCenter({ x: 252, y: 80 }, rects, 1), 1);
  // Dragging back left over slot 0 swaps back cleanly
  assert.equal(targetSlotIndexForCenter({ x: 80, y: 80 }, rects, 1), 0);
});

test("2D grid supports diagonal drag to Cover and clamps drags over AddPhotoTile", () => {
  const rects = buildPhotoSlotRects(3, 332, 260, 12, 2);
  // Dragging photo 2 (row 1 col 0) up-right into slot 1 (row 0 col 1)
  assert.equal(targetSlotIndexForCenter({ x: 252, y: 80 }, rects, 2), 1);
  // Dragging photo 2 above top-left corner clamps to slot 0 (Cover)
  assert.equal(targetSlotIndexForCenter({ x: -20, y: -40 }, rects, 2), 0);
  // Dragging photo 0 into the empty 4th cell where AddPhotoTile sits clamps to slot 2 (last photo)
  assert.equal(targetSlotIndexForCenter({ x: 252, y: 360 }, rects, 0), 2);
});

test("seam hysteresis prevents jitter right at the boundary of a neighbor", () => {
  const rects = buildPhotoSlotRects(2, 332, 260, 12, 2);
  // Just 5px inside slot 1's left edge (x=177 < 172 + 160*0.12 = 191.2) stays at 0
  assert.equal(targetSlotIndexForCenter({ x: 177, y: 80 }, rects, 0), 0);
  // Crossing past the inset triggers the swap cleanly
  assert.equal(targetSlotIndexForCenter({ x: 196, y: 80 }, rects, 0), 1);
});

test("movePhotoByIndex reorders immutably", () => {
  const original = ["a", "b", "c", "d"];
  const moved = movePhotoByIndex(original, 3, 0);
  assert.deepEqual(moved, ["d", "a", "b", "c"]);
  assert.deepEqual(original, ["a", "b", "c", "d"]);
  assert.equal(movePhotoByIndex(original, 1, 1), original);
});

test("edgeAutoScrollStep scrolls up near top, down near bottom, and stays still in middle", () => {
  assert.ok(edgeAutoScrollStep(110, 100, 800) < 0);
  assert.equal(edgeAutoScrollStep(450, 100, 800), 0);
  assert.ok(edgeAutoScrollStep(790, 100, 800) > 0);
});
