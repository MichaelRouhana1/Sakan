import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPriceHistogram,
  PRICE_HISTOGRAM_MIN_LISTINGS,
} from "../src/modules/search/price-histogram.js";

describe("buildPriceHistogram", () => {
  it("returns null when fewer than 5 valid listings match", () => {
    assert.equal(buildPriceHistogram([]), null);
    assert.equal(buildPriceHistogram([300]), null);
    assert.equal(buildPriceHistogram([300, 400, 500, 600]), null);
    assert.equal(
      buildPriceHistogram([300, 400, 500, Number.NaN, -100, 600]),
      null,
    );
    assert.equal(PRICE_HISTOGRAM_MIN_LISTINGS, 5);
  });

  it("builds 20-25 buckets with exact count conservation for typical distributions", () => {
    const rents = [
      200, 250, 300, 350, 400, 420, 450, 480, 500, 550, 600, 650, 700, 800,
      950, 1100,
    ];
    const hist = buildPriceHistogram(rents);
    assert.ok(hist);
    assert.equal(hist.minUsd, 0);
    assert.equal(hist.maxUsd, 1200);
    assert.equal(hist.totalCount, rents.length);
    assert.ok(hist.buckets.length >= 20 && hist.buckets.length <= 30);
    const sum = hist.buckets.reduce((acc, b) => acc + b.count, 0);
    assert.equal(sum, rents.length);
    assert.equal(hist.clampedOutliers, 0);
    assert.equal(
      hist.maxBucketCount,
      Math.max(...hist.buckets.map((b) => b.count)),
    );
  });

  it("clamps extreme upper outliers and folds them into the final bucket", () => {
    const core = Array.from({ length: 20 }, (_, i) => 250 + i * 35); // 250..915
    const rents = [...core, 12000];
    const hist = buildPriceHistogram(rents);
    assert.ok(hist);
    assert.ok(hist.maxUsd <= 1200, `expected clamped ceiling <= 1200, got ${hist.maxUsd}`);
    assert.equal(hist.clampedOutliers, 1);
    const last = hist.buckets[hist.buckets.length - 1]!;
    assert.equal(last.isOverflow, true);
    assert.ok(last.count >= 1);
    const sum = hist.buckets.reduce((acc, b) => acc + b.count, 0);
    assert.equal(sum, rents.length);
  });

  it("handles identical rents without division errors", () => {
    const rents = [500, 500, 500, 500, 500, 500];
    const hist = buildPriceHistogram(rents);
    assert.ok(hist);
    assert.equal(hist.totalCount, 6);
    assert.equal(hist.maxUsd, 500);
    const sum = hist.buckets.reduce((acc, b) => acc + b.count, 0);
    assert.equal(sum, 6);
    assert.equal(hist.buckets[hist.buckets.length - 1]!.count, 6);
    assert.equal(hist.clampedOutliers, 0);
  });

  it("scales cleanly above $10,000", () => {
    const rents = [4000, 6000, 8000, 10000, 11500, 12000];
    const hist = buildPriceHistogram(rents);
    assert.ok(hist);
    assert.equal(hist.maxUsd, 12500);
    assert.equal(hist.buckets.length, 25);
    assert.equal(hist.bucketWidthUsd, 500);
    assert.equal(hist.stepUsd, 100);
    assert.equal(
      hist.buckets.reduce((acc, b) => acc + b.count, 0),
      rents.length,
    );
  });
});
