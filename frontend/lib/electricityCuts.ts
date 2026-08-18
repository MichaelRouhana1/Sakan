export const HHMM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export type CutWindow = { start: string; end: string };
export type Meridiem = "am" | "pm";

export function parseMinutes(hhmm: string): number | null {
  if (!HHMM_RE.test(hhmm.trim())) return null;
  const [h, m] = hhmm.trim().split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(raw: string): string | null {
  const mins = parseMinutes(raw);
  if (mins == null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToClock(hhmm: string): { hour: string; meridiem: Meridiem } | null {
  const mins = parseMinutes(hhmm);
  if (mins == null) return null;
  const h24 = Math.floor(mins / 60);
  const meridiem: Meridiem = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour: String(h12), meridiem };
}

export function clockToHHMM(hourRaw: string, meridiem: Meridiem): string | null {
  const hour = Number(hourRaw);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  let h24 = hour % 12;
  if (meridiem === "pm") h24 += 12;
  return `${String(h24).padStart(2, "0")}:00`;
}

export function formatClock(hhmm: string): string | null {
  const clock = hhmmToClock(hhmm);
  if (!clock) return null;
  return `${clock.hour}:00 ${clock.meridiem.toUpperCase()}`;
}

function markCutMinutes(on: boolean[], start: string, end: string): boolean {
  const a = parseMinutes(start);
  const b = parseMinutes(end);
  if (a == null || b == null) return false;
  if (b > a) {
    for (let i = a; i < b; i++) on[i] = false;
  } else {
    for (let i = a; i < 24 * 60; i++) on[i] = false;
    for (let i = 0; i < b; i++) on[i] = false;
  }
  return true;
}

/** Hours per day with power from one or more daily cut windows. */
export function hoursWithPowerFromWindows(windows: CutWindow[]): number | null {
  const complete = windows.filter((w) => parseMinutes(w.start) != null && parseMinutes(w.end) != null);
  if (complete.length === 0) return null;
  const on = Array.from({ length: 24 * 60 }, () => true);
  for (const w of complete) markCutMinutes(on, w.start, w.end);
  return Math.max(0, Math.min(24, Math.round(on.filter(Boolean).length / 60)));
}

export function cutHoursFromWindows(windows: CutWindow[]): number | null {
  const on = hoursWithPowerFromWindows(windows);
  if (on == null) return null;
  return 24 - on;
}

export function formatWindowsSummary(windows: CutWindow[]): string | null {
  const labels = windows
    .map((w) => {
      const a = formatClock(w.start);
      const b = formatClock(w.end);
      if (!a || !b) return null;
      return `${a}–${b}`;
    })
    .filter((x): x is string => x != null);
  if (labels.length === 0) return null;
  return `Cuts ${labels.join(" · ")}`;
}

export const MAX_CUT_WINDOWS = 6;

export function emptyCutWindow(): CutWindow {
  return { start: "", end: "" };
}

export function windowComplete(w: CutWindow): boolean {
  return parseMinutes(w.start) != null && parseMinutes(w.end) != null;
}

export function hoursWithPowerFromCuts(start: string, end: string): number | null {
  return hoursWithPowerFromWindows([{ start, end }]);
}

export function coerceCutWindows(
  raw: unknown,
  start?: string | null,
  end?: string | null,
): CutWindow[] {
  const parsed: CutWindow[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const s = toHHMM(String((item as CutWindow).start ?? ""));
      const e = toHHMM(String((item as CutWindow).end ?? ""));
      if (s && e) parsed.push({ start: s, end: e });
    }
  }
  if (parsed.length) return parsed.slice(0, MAX_CUT_WINDOWS);
  const a = start ? toHHMM(start) : null;
  const b = end ? toHHMM(end) : null;
  if (a && b) return [{ start: a, end: b }];
  return [];
}
