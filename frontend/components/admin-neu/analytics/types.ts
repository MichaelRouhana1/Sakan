export type RangeId = "7d" | "30d" | "90d" | "1y" | "custom";
export type SeriesId = "both" | "renters" | "posters";

export type DayPoint = {
  date: string;
  activeRenters: number;
  activePosters: number;
  signups: number;
  dau: number;
  mau: number;
  dauRenters: number;
  dauPosters: number;
};

export type Retention = {
  w1: number;
  w4: number;
  w8: number;
};

export type ListTrendsParams = {
  range: RangeId;
  customFrom: string;
  customTo: string;
};

export type TrendsResult = {
  points: DayPoint[];
  prior: DayPoint[];
  retention: Retention;
  dataStart: string;
  dataEnd: string;
  weekSignups: number;
  priorWeekSignups: number;
};

export const RANGE_TABS: { id: RangeId; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "1y", label: "1Y" },
  { id: "custom", label: "Custom" },
];

export const SERIES_TABS: { id: SeriesId; label: string }[] = [
  { id: "both", label: "Both" },
  { id: "renters", label: "Renters" },
  { id: "posters", label: "Posters" },
];

export const RANGE_DAYS: Record<Exclude<RangeId, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoFromUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function utcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  return isoFromUtc(utcMs(iso) + days * 86400000);
}

export function weekdayOf(iso: string): number {
  return new Date(utcMs(iso)).getUTCDay();
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatDayYear(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatMonth(iso: string): string {
  const [, m] = iso.split("-").map(Number);
  return MONTHS[m - 1];
}

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function lastOf<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

export function sumBy(points: DayPoint[], key: keyof DayPoint): number {
  return points.reduce((sum, row) => sum + Number(row[key]), 0);
}

export function meanBy(points: DayPoint[], key: keyof DayPoint): number {
  if (points.length === 0) return 0;
  return sumBy(points, key) / points.length;
}

export function sliceByDate<T extends { date: string }>(
  days: T[],
  range: RangeId,
  customFrom: string,
  customTo: string,
): T[] {
  if (days.length === 0) return [];
  const end = lastOf(days)!.date;
  if (range !== "custom") {
    const start = addDays(end, -(RANGE_DAYS[range] - 1));
    return days.filter((row) => row.date >= start && row.date <= end);
  }
  const from = customFrom <= customTo ? customFrom : customTo;
  const to = customFrom <= customTo ? customTo : customFrom;
  return days.filter((row) => row.date >= from && row.date <= to);
}

export function priorByDate<T extends { date: string }>(
  days: T[],
  current: T[],
): T[] {
  if (current.length === 0) return [];
  const first = current[0].date;
  const startIdx = days.findIndex((row) => row.date === first);
  if (startIdx <= 0) return [];
  const from = Math.max(0, startIdx - current.length);
  return days.slice(from, startIdx);
}

export function sliceRange(
  days: DayPoint[],
  range: RangeId,
  customFrom: string,
  customTo: string,
): DayPoint[] {
  return sliceByDate(days, range, customFrom, customTo);
}

export function priorSlice(days: DayPoint[], current: DayPoint[]): DayPoint[] {
  return priorByDate(days, current);
}

export function lastDays<T>(points: T[], n: number): T[] {
  if (points.length <= n) return points;
  return points.slice(-n);
}

export function weekSignupsOf(points: DayPoint[]): number {
  return sumBy(lastDays(points, 7), "signups");
}

/** Mock cohort return — range length nudges the curve so the card is not a constant. */
export function retentionFromSlice(points: DayPoint[]): Retention {
  const last = lastOf(points);
  const stickiness = last && last.mau > 0 ? last.dau / last.mau : 0.28;
  const span = points.length;
  const spanBoost = span >= 300 ? 0.05 : span >= 80 ? 0.02 : span >= 25 ? 0 : -0.04;
  const w1 = clamp(stickiness * 1.45 + spanBoost, 0.16, 0.62);
  const w4 = clamp(w1 * 0.66, 0.11, 0.44);
  const w8 = clamp(w4 * 0.72, 0.08, 0.32);
  return { w1, w4, w8 };
}

export function xLabels(points: DayPoint[]): { i: number; label: string }[] {
  if (points.length === 0) return [];
  if (points.length <= 8) {
    return points.map((row, i) => ({ i, label: formatDay(row.date) }));
  }
  const span = utcMs(points[points.length - 1].date) - utcMs(points[0].date);
  const months = span > 120 * 86400000;
  const target = months ? 6 : points.length > 60 ? 6 : 5;
  const step = Math.max(1, Math.round((points.length - 1) / target));
  const out: { i: number; label: string }[] = [];
  for (let i = 0; i < points.length; i += step) {
    out.push({
      i,
      label: months ? formatMonth(points[i].date) : formatDay(points[i].date),
    });
  }
  const last = points.length - 1;
  if (out[out.length - 1]?.i !== last) {
    out.push({
      i: last,
      label: months ? formatMonth(points[last].date) : formatDay(points[last].date),
    });
  }
  return out;
}

export function bucketPoints(points: DayPoint[], maxBars: number): DayPoint[] {
  if (points.length <= maxBars) return points;
  const size = points.length / maxBars;
  const out: DayPoint[] = [];
  for (let i = 0; i < maxBars; i += 1) {
    const from = Math.floor(i * size);
    const to = Math.floor((i + 1) * size);
    const slice = points.slice(from, Math.max(from + 1, to));
    out.push({
      date: slice[0].date,
      activeRenters: Math.round(meanBy(slice, "activeRenters")),
      activePosters: Math.round(meanBy(slice, "activePosters")),
      signups: Math.round(sumBy(slice, "signups")),
      dau: Math.round(meanBy(slice, "dau")),
      mau: Math.round(meanBy(slice, "mau")),
      dauRenters: Math.round(meanBy(slice, "dauRenters")),
      dauPosters: Math.round(meanBy(slice, "dauPosters")),
    });
  }
  return out;
}

export function weekdayAverages(
  points: DayPoint[],
  key: "dau" | "dauRenters" | "dauPosters" = "dau",
): number[] {
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const row of points) {
    const d = weekdayOf(row.date);
    sums[d] += row[key];
    counts[d] += 1;
  }
  return sums.map((sum, i) => (counts[i] === 0 ? 0 : sum / counts[i]));
}

export function sparkValues(points: DayPoint[], key: keyof DayPoint, n = 14): number[] {
  return points.slice(-n).map((row) => Number(row[key]));
}

export function toCsv(points: DayPoint[]): string {
  const header =
    "date,active_renters,active_posters,signups,dau,mau,dau_renters,dau_posters";
  const rows = points.map(
    (row) =>
      `${row.date},${row.activeRenters},${row.activePosters},${row.signups},${row.dau},${row.mau},${row.dauRenters},${row.dauPosters}`,
  );
  return [header, ...rows].join("\n");
}
