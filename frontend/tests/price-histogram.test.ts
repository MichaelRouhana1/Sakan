import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countListingsInRange,
  formatBucketLabel,
  hasVisibleHistogram,
  isBucketInRange,
  sliderPercent,
  snapToStep,
  type PriceHistogram,
} from "../types/priceHistogram";

const sampleHistogram: PriceHistogram = {
  minUsd: 0,
  maxUsd: 1200,
  stepUsd: 25,
  bucketWidthUsd: 50,
  totalCount: 20,
  maxBucketCount: 5,
  clampedOutliers: 1,
  buckets: Array.from({ length: 24 }, (_, i) => ({
    minUsd: i * 50,
    maxUsd: (i + 1) * 50,
    count:
      i === 5
        ? 2
        : i === 8
          ? 4
          : i === 10
            ? 5
            : i === 12
              ? 4
              : i === 15
                ? 3
                : i === 23
                  ? 2
                  : 0,
    ...(i === 23 ? { isOverflow: true } : null),
  })),
};

describe("priceHistogram frontend helpers", () => {
  it("hides histogram when null or fewer than 5 listings", () => {
    assert.equal(hasVisibleHistogram(null), false);
    assert.equal(hasVisibleHistogram(undefined), false);
    assert.equal(
      hasVisibleHistogram({ ...sampleHistogram, totalCount: 4 }),
      false,
    );
    assert.equal(hasVisibleHistogram(sampleHistogram), true);
  });

  it("highlights buckets by midpoint and treats ceiling as unbounded top", () => {
    const b0 = sampleHistogram.buckets[0]!; // 0..50 (mid 25)
    const b8 = sampleHistogram.buckets[8]!; // 400..450 (mid 425)
    const b23 = sampleHistogram.buckets[23]!; // 1150..1200 (mid 1175)

    // Full range -> every bucket in range
    assert.equal(isBucketInRange(b0, 0, 1200, 1200, false), true);
    assert.equal(isBucketInRange(b8, 0, 1200, 1200, false), true);
    assert.equal(isBucketInRange(b23, 0, 1200, 1200, true), true);

    // Narrowed [400, 700]
    assert.equal(isBucketInRange(b0, 400, 700, 1200, false), false);
    assert.equal(isBucketInRange(b8, 400, 700, 1200, false), true);
    assert.equal(isBucketInRange(b23, 400, 700, 1200, true), false);

    // Midpoint flip at 425
    assert.equal(isBucketInRange(b8, 425, 700, 1200, false), true);
    assert.equal(isBucketInRange(b8, 426, 700, 1200, false), false);

    // Equal lo === hi highlights containing bucket only
    assert.equal(isBucketInRange(b8, 420, 420, 1200, false), true);
    assert.equal(isBucketInRange(b0, 420, 420, 1200, false), false);
    assert.equal(isBucketInRange(b23, 1200, 1200, 1200, true), true);
  });

  it("counts listings inside selected range accurately", () => {
    assert.equal(countListingsInRange(sampleHistogram, 0, 1200), 20);
    // Buckets 8 (400-450: 4), 10 (500-550: 5), 12 (600-650: 4) = 13
    assert.equal(countListingsInRange(sampleHistogram, 400, 700), 13);
  });

  it("computes slider percentage and snaps cleanly to step", () => {
    assert.equal(sliderPercent(0, 0, 1200), 0);
    assert.equal(sliderPercent(600, 0, 1200), 50);
    assert.equal(sliderPercent(2000, 0, 1200), 100);
    assert.equal(snapToStep(413, 0, 1200, 25), 425);
    assert.equal(snapToStep(-50, 0, 1200, 25), 0);
    assert.equal(snapToStep(5000, 0, 1200, 25), 1200);
  });

  it("formats bucket labels including overflow suffix", () => {
    assert.equal(
      formatBucketLabel({ minUsd: 400, maxUsd: 450, count: 1 }, false),
      "$400–$450 · 1 unit",
    );
    assert.equal(
      formatBucketLabel(
        { minUsd: 1150, maxUsd: 1200, count: 2, isOverflow: true },
        true,
      ),
      "$1150–$1200+ · 2 units",
    );
  });
});
