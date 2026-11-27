import test from "node:test";
import assert from "node:assert/strict";
import {
  COLLAPSING_HEADER_DEFAULTS,
  computeCollapsingHeaderMetrics,
} from "../lib/collapsingHeaderMath.ts";

test("at rest and negative overscroll, large title is fully visible and compact header is hidden", () => {
  for (const scrollY of [-48, -1, 0, 10]) {
    const m = computeCollapsingHeaderMetrics(scrollY, 52, 28, false);
    assert.equal(m.largeTitleOpacity, 1);
    assert.equal(m.compactTitleOpacity, 0);
    assert.equal(
      m.compactTitleTranslateY,
      COLLAPSING_HEADER_DEFAULTS.titleLiftPx,
    );
    assert.equal(m.dividerOpacity, 0);
    assert.equal(m.backdropOpacity, 0);
  }
});

test("once scrolled past the large title, compact header settles fully with hairline and backdrop", () => {
  for (const scrollY of [60, 140, 800]) {
    const m = computeCollapsingHeaderMetrics(scrollY, 52, 28, false);
    assert.equal(m.largeTitleOpacity, 0);
    assert.equal(m.compactTitleOpacity, 1);
    assert.equal(m.compactTitleTranslateY, 0);
    assert.equal(m.dividerOpacity, 1);
    assert.equal(m.backdropOpacity, 1);
  }
});

test("handoff is monotonic and never shows both titles at full opacity simultaneously", () => {
  let prevCompact = 0;
  let prevLarge = 1;
  for (let y = 0; y <= 70; y += 2) {
    const m = computeCollapsingHeaderMetrics(y, 52, 28, false);
    assert.ok(m.compactTitleOpacity >= prevCompact - 1e-9);
    assert.ok(m.largeTitleOpacity <= prevLarge + 1e-9);
    assert.ok(
      !(m.largeTitleOpacity > 0.9 && m.compactTitleOpacity > 0.9),
      `both titles too opaque at scrollY=${y}`,
    );
    prevCompact = m.compactTitleOpacity;
    prevLarge = m.largeTitleOpacity;
  }
});

test("hairline divider leads the compact title arrival", () => {
  const early = computeCollapsingHeaderMetrics(29, 52, 28, false);
  assert.ok(early.dividerOpacity > 0);
  assert.equal(early.compactTitleOpacity, 0);
});

test("reduced motion removes vertical translation while keeping opacity crossfade intact", () => {
  for (const scrollY of [0, 36, 44, 60]) {
    const m = computeCollapsingHeaderMetrics(scrollY, 52, 28, true);
    assert.equal(m.compactTitleTranslateY, 0);
  }
  const mid = computeCollapsingHeaderMetrics(42, 52, 28, true);
  assert.ok(mid.compactTitleOpacity > 0 && mid.compactTitleOpacity < 1);
  assert.ok(mid.dividerOpacity > 0 && mid.dividerOpacity < 1);
});

test("custom measured titleBottom adapts for lower titles such as Credits", () => {
  // At scrollY=80, a title whose bottom is at y=180 has not yet reached the header.
  const before = computeCollapsingHeaderMetrics(80, 180, 28, false);
  assert.equal(before.largeTitleOpacity, 1);
  assert.equal(before.compactTitleOpacity, 0);

  // Once scrolled past y=188, it is fully handed off.
  const after = computeCollapsingHeaderMetrics(190, 180, 28, false);
  assert.equal(after.largeTitleOpacity, 0);
  assert.equal(after.compactTitleOpacity, 1);
});
