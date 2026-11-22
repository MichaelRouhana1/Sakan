const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type IsoParts = { y: number; m: number; d: number };

export function parseIsoDate(iso: string): IsoParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return { y, m, d };
}

export function toIsoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayIsoDate(now = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function shiftIsoDate(iso: string, days: number): string | null {
  const parts = parseIsoDate(iso);
  if (!parts) return null;
  const date = new Date(parts.y, parts.m - 1, parts.d + days);
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function isoInRange(iso: string, minDate?: string, maxDate?: string): boolean {
  if (!parseIsoDate(iso)) return false;
  if (minDate && iso < minDate) return false;
  if (maxDate && iso > maxDate) return false;
  return true;
}

/** Readable field text. The stored value stays YYYY-MM-DD. */
export function formatWizardDate(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return "";
  return `${parts.d} ${MONTHS_SHORT[parts.m - 1]} ${parts.y}`;
}

export function longWizardDate(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return "";
  const weekday = WEEKDAYS[new Date(parts.y, parts.m - 1, parts.d).getDay()];
  return `${weekday} ${parts.d} ${MONTHS[parts.m - 1]} ${parts.y}`;
}

export function monthTitle(y: number, m: number): string {
  return `${MONTHS[m - 1]} ${y}`;
}

export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const date = new Date(y, m - 1 + delta, 1);
  return { y: date.getFullYear(), m: date.getMonth() + 1 };
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

export function monthHasSelectableDay(y: number, m: number, minDate?: string, maxDate?: string): boolean {
  const first = toIsoDate(y, m, 1);
  const last = toIsoDate(y, m, daysInMonth(y, m));
  if (maxDate && first > maxDate) return false;
  if (minDate && last < minDate) return false;
  return true;
}

/** Six weeks starting on Sunday, including leading and trailing days. */
export function monthGrid(y: number, m: number): string[] {
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - first.getDay());
  const cells: string[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push(toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate()));
  }
  return cells;
}
