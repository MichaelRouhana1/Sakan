import test from "node:test";
import assert from "node:assert/strict";
import { PhotoCropQueue } from "../lib/photoCropQueue.ts";
import {
  boundedCrop,
  cropFromPosition,
  cropImagePlacement,
} from "../lib/photoCropGeometry.ts";
import { normalizePhotoCaption } from "../lib/photoCaption.ts";
const file = (name) => ({ uri: `blob:${name}`, name, owned: true });
const rect = { x: 0, y: 0, width: 160, height: 100 };
const tick = () => new Promise((resolve) => setImmediate(resolve));
function harness(options = {}) {
  const commits = [],
    releases = [];
  const queue = new PhotoCropQueue({
    capacity: () => 15,
    decode: async (s) => ({ ...s, width: 800, height: 500 }),
    exportCrop: async (s) => `crop:${s.name}`,
    commit: (uri) => commits.push(uri),
    release: (s) => releases.push(s.uri),
    changed: () => {},
    ...options,
  });
  return { queue, commits, releases };
}
test("FIFO admission reserves uploading/error slots and reports overflow", async () => {
  const { queue, commits, releases } = harness({ capacity: () => 2 });
  await queue.admit(["a", "b", "overflow"].map(file));
  assert.equal(queue.state.total, 2);
  assert.equal(queue.state.position, 1);
  assert.match(queue.state.notices[0], /1 photo was skipped/);
  assert.deepEqual(releases, ["blob:overflow"]);
  await queue.save(rect);
  assert.equal(queue.state.current.name, "b");
  assert.equal(queue.state.position, 2);
  await queue.save(rect);
  assert.equal(queue.state.phase, "idle");
  assert.deepEqual(commits, ["crop:a", "crop:b"]);
});
test("picker lock rejects concurrent intake and releases rejected owned sources", async () => {
  const { queue, releases } = harness();
  const token = queue.beginPick();
  assert.equal(queue.beginPick(), null);
  await queue.admit([file("race")]);
  assert.deepEqual(releases, ["blob:race"]);
  await queue.admit([file("chosen")], token);
  assert.equal(queue.state.current.name, "chosen");
});
test("decode failures continue at original positions, discard one differs from finish", async () => {
  const { queue, commits, releases } = harness({
    decode: async (s) => {
      if (s.name === "bad") throw Error();
      return { ...s, width: 800, height: 500 };
    },
  });
  await queue.admit(["bad", "discard", "save", "remainder"].map(file));
  assert.equal(queue.state.position, 2);
  assert.match(queue.state.notices[0], /bad.*Skipped/);
  queue.discard();
  await tick();
  assert.equal(queue.state.position, 3);
  await queue.save(rect);
  queue.finish();
  assert.deepEqual(commits, ["crop:save"]);
  assert.equal(queue.state.phase, "idle");
  assert.deepEqual(
    new Set(releases),
    new Set(["blob:bad", "blob:discard", "blob:save", "blob:remainder"]),
  );
});
test("duplicate save is ignored; finishing an in-flight export discards late output", async () => {
  let resolve;
  const output = new Promise((r) => (resolve = r));
  const { queue, commits, releases } = harness({ exportCrop: () => output });
  await queue.admit([file("a"), file("b")]);
  const saving = queue.save(rect);
  await queue.save(rect);
  queue.finish();
  resolve("blob:late");
  await saving;
  assert.deepEqual(commits, []);
  assert.equal(queue.state.phase, "idle");
  assert.deepEqual(
    new Set(releases),
    new Set(["blob:a", "blob:b", "blob:late"]),
  );
});
test("late decode and picker results cannot resurrect a dismissed batch", async () => {
  let resolve;
  const { queue, releases } = harness({
    decode: () => new Promise((r) => (resolve = r)),
  });
  const admitting = queue.admit([file("a")]);
  queue.finish();
  resolve({ ...file("normalized"), width: 10, height: 10 });
  await admitting;
  assert.equal(queue.state.phase, "idle");
  assert.ok(releases.includes("blob:normalized"));
  const token = queue.beginPick();
  queue.finish();
  await queue.admit([file("late-picker")], token);
  assert.ok(releases.includes("blob:late-picker"));
});
test("export failure permits retry without advancing or losing current crop", async () => {
  let fail = true;
  const { queue, commits } = harness({
    exportCrop: async () => {
      if (fail) throw Error();
      return "saved";
    },
  });
  await queue.admit([file("a")]);
  await queue.save(rect);
  assert.equal(queue.state.phase, "cropping");
  assert.ok(queue.state.error);
  assert.equal(queue.state.position, 1);
  fail = false;
  await queue.save(rect);
  assert.deepEqual(commits, ["saved"]);
});
test("portrait, landscape and extreme pan/zoom stay in source bounds", () => {
  for (const [w, h] of [
    [600, 1200],
    [1800, 900],
    [1, 1],
    [4032, 3024],
  ])
    for (const zoom of [1, 2, 4, 50])
      for (const x of [-10, 0, 0.5, 1, 20]) {
        const r = boundedCrop(cropFromPosition(w, h, zoom, x, 1 - x), w, h);
        assert.ok(r.x >= 0 && r.y >= 0 && r.width >= 1 && r.height >= 1);
        assert.ok(r.x + r.width <= w && r.y + r.height <= h);
        assert.ok(Math.abs(r.width - r.height * 1.6) <= 1.6);
      }
});
test("preview transforms center-cover the selected rectangle in narrow and wide frames", () => {
  const source = { width: 1200, height: 1800 },
    crop = { x: 100, y: 500, width: 800, height: 500 };
  for (const frame of [
    { width: 320, height: 200 },
    { width: 118, height: 168 },
    { width: 390, height: 370 },
    { width: 660, height: 400 },
  ]) {
    const p = cropImagePlacement(source, crop, frame),
      scale = p.width / source.width;
    assert.ok(
      Math.abs(p.left + (crop.x + crop.width / 2) * scale - frame.width / 2) <
        1e-8,
    );
    assert.ok(
      Math.abs(p.top + (crop.y + crop.height / 2) * scale - frame.height / 2) <
        1e-8,
    );
    assert.ok(
      crop.width * scale >= frame.width && crop.height * scale >= frame.height,
    );
  }
});
test("captions trim, allow empty, preserve Unicode and respect existing 48 characters", () => {
  assert.equal(
    normalizePhotoCaption("  Sofa bed sleeps 2  "),
    "Sofa bed sleeps 2",
  );
  assert.equal(normalizePhotoCaption("   "), "");
  assert.equal(normalizePhotoCaption(null), "");
  assert.equal(normalizePhotoCaption("  مطبخ  "), "مطبخ");
  assert.equal(normalizePhotoCaption("x".repeat(100)).length, 48);
});

test("full gallery rejects every dropped file with a clear notice and releases it", async () => {
  const { queue, releases } = harness({ capacity: () => 0 });
  await queue.admit([file("extra")]);
  assert.equal(queue.state.phase, "idle");
  assert.match(queue.state.notices[0], /all 15 slots/);
  assert.deepEqual(releases, ["blob:extra"]);
});
