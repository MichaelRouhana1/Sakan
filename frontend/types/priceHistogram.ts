export const DEFAULT_RENT_MIN = 0;
export const DEFAULT_RENT_MAX = 2500;
export const DEFAULT_RENT_STEP = 25;
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

export function hasVisibleHistogram(
  histogram: PriceHistogram | null | undefined,
): histogram is PriceHistogram {
  return Boolean(
    histogram &&
      histogram.totalCount >= PRICE_HISTOGRAM_MIN_LISTINGS &&
      histogram.buckets.length > 0 &&
      histogram.maxBucketCount > 0,
  );
}

/**
 * Midpoint highlighting: a bucket flips active/muted right as either thumb
 * center crosses the bar center. When lo === hi, highlight the containing bar.
 * When hi >= ceiling, all buckets at or above lo (including overflow) stay active.
 */
export function isBucketInRange(
  bucket: PriceHistogramBucket,
  lo: number,
  hi: number,
  ceiling: number,
  isLastBucket = false,
): boolean {
  const unboundedTop = hi >= ceiling;
  if (lo === hi) {
    if (lo >= ceiling) return isLastBucket;
    return bucket.minUsd <= lo && lo < bucket.maxUsd;
  }
  const mid = (bucket.minUsd + bucket.maxUsd) / 2;
  return mid >= lo && (unboundedTop || mid <= hi);
}

export function countListingsInRange(
  histogram: PriceHistogram,
  lo: number,
  hi: number,
): number {
  let count = 0;
  const lastIndex = histogram.buckets.length - 1;
  for (let i = 0; i < histogram.buckets.length; i++) {
    const bucket = histogram.buckets[i]!;
    if (isBucketInRange(bucket, lo, hi, histogram.maxUsd, i === lastIndex)) {
      count += bucket.count;
    }
  }
  return count;
}

export function sliderPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const ratio = (value - min) / (max - min);
  return Math.max(0, Math.min(1, ratio)) * 100;
}

export function snapToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  if (!Number.isFinite(value)) return min;
  const clamped = Math.max(min, Math.min(max, value));
  if (step <= 0) return Math.round(clamped);
  const snapped = Math.round((clamped - min) / step) * step + min;
  return Math.max(min, Math.min(max, snapped));
}

export function formatBucketLabel(
  bucket: PriceHistogramBucket,
  isLastBucket: boolean,
): string {
  const range =
    isLastBucket && bucket.isOverflow
      ? `$${bucket.minUsd}–$${bucket.maxUsd}+`
      : `$${bucket.minUsd}–$${bucket.maxUsd}`;
  const unit = bucket.count === 1 ? "unit" : "units";
  return `${range} · ${bucket.count} ${unit}`;
}
