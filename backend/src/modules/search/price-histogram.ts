export const PRICE_HISTOGRAM_MIN_LISTINGS = 5;

export type PriceHistogramBucket = {
  minUsd: number;
  maxUsd: number;
  count: number;
  isOverflow?: boolean;
};

export type PriceHistogram = {
  minUsd: number;
  maxUsd: number;
  stepUsd: number;
  bucketWidthUsd: number;
  totalCount: number;
  maxBucketCount: number;
  clampedOutliers: number;
  buckets: PriceHistogramBucket[];
};

const CEILING_LADDER: ReadonlyArray<{
  maxUsd: number;
  bucketCount: number;
  stepUsd: number;
}> = [
  { maxUsd: 500, bucketCount: 20, stepUsd: 25 },
  { maxUsd: 600, bucketCount: 24, stepUsd: 25 },
  { maxUsd: 750, bucketCount: 25, stepUsd: 25 },
  { maxUsd: 1000, bucketCount: 25, stepUsd: 25 },
  { maxUsd: 1200, bucketCount: 24, stepUsd: 25 },
  { maxUsd: 1500, bucketCount: 25, stepUsd: 25 },
  { maxUsd: 2000, bucketCount: 25, stepUsd: 25 },
  { maxUsd: 2500, bucketCount: 25, stepUsd: 25 },
  { maxUsd: 3000, bucketCount: 24, stepUsd: 25 },
  { maxUsd: 4000, bucketCount: 25, stepUsd: 50 },
  { maxUsd: 5000, bucketCount: 25, stepUsd: 50 },
  { maxUsd: 6000, bucketCount: 24, stepUsd: 50 },
  { maxUsd: 7500, bucketCount: 25, stepUsd: 100 },
  { maxUsd: 10000, bucketCount: 25, stepUsd: 100 },
];

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

function selectCeiling(rawCeiling: number): {
  maxUsd: number;
  bucketCount: number;
  stepUsd: number;
} {
  for (const tier of CEILING_LADDER) {
    if (tier.maxUsd >= rawCeiling) return tier;
  }
  const maxUsd = Math.ceil(rawCeiling / 2500) * 2500;
  return { maxUsd, bucketCount: 25, stepUsd: 100 };
}

/**
 * Build a 20–25 bucket monthly-rent histogram from eligible unit rents.
 * Returns null when fewer than PRICE_HISTOGRAM_MIN_LISTINGS (5) listings match.
 * Extreme upper outliers are clamped at ~p95 and folded into the final bucket.
 */
export function buildPriceHistogram(
  rents: readonly number[],
): PriceHistogram | null {
  const valid = rents.filter((r) => Number.isFinite(r) && r >= 0);
  if (valid.length < PRICE_HISTOGRAM_MIN_LISTINGS) return null;

  const sorted = [...valid].sort((a, b) => a - b);
  const actualMax = sorted[sorted.length - 1]!;
  const p95 = percentile(sorted, 0.95);

  const rawCeiling =
    p95 <= 0 || actualMax <= p95 * 1.35
      ? actualMax
      : Math.min(actualMax, p95 * 1.05);

  const { maxUsd, bucketCount, stepUsd } = selectCeiling(rawCeiling);
  const bucketWidthUsd = maxUsd / bucketCount;

  const buckets: PriceHistogramBucket[] = Array.from(
    { length: bucketCount },
    (_, i) => ({
      minUsd: Math.round(i * bucketWidthUsd),
      maxUsd: Math.round((i + 1) * bucketWidthUsd),
      count: 0,
    }),
  );

  let clampedOutliers = 0;
  for (const rent of valid) {
    if (rent >= maxUsd) {
      buckets[bucketCount - 1]!.count += 1;
      if (rent > maxUsd) clampedOutliers += 1;
    } else {
      const idx = Math.min(
        bucketCount - 1,
        Math.max(0, Math.floor(rent / bucketWidthUsd)),
      );
      buckets[idx]!.count += 1;
    }
  }

  if (clampedOutliers > 0) {
    buckets[bucketCount - 1]!.isOverflow = true;
  }

  let maxBucketCount = 0;
  for (const b of buckets) {
    if (b.count > maxBucketCount) maxBucketCount = b.count;
  }

  return {
    minUsd: 0,
    maxUsd,
    stepUsd,
    bucketWidthUsd,
    totalCount: valid.length,
    maxBucketCount,
    clampedOutliers,
    buckets,
  };
}
