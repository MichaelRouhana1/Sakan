export type CutWindow = { start: string; end: string };

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseMinutes(hhmm: string): number | null {
  if (!HHMM_RE.test(hhmm.trim())) return null;
  const [h, m] = hhmm.trim().split(":").map(Number);
  return h * 60 + m;
}

function markCutMinutes(on: boolean[], start: string, end: string): void {
  const a = parseMinutes(start);
  const b = parseMinutes(end);
  if (a == null || b == null) return;
  if (b > a) {
    for (let i = a; i < b; i++) on[i] = false;
  } else {
    for (let i = a; i < 24 * 60; i++) on[i] = false;
    for (let i = 0; i < b; i++) on[i] = false;
  }
}

export function completeCutWindows(windows: CutWindow[]): CutWindow[] {
  return windows.filter(
    (w) => parseMinutes(w.start) != null && parseMinutes(w.end) != null,
  );
}

export function hoursWithPowerFromWindows(windows: CutWindow[]): number | null {
  const complete = completeCutWindows(windows);
  if (complete.length === 0) return null;
  const on = Array.from({ length: 24 * 60 }, () => true);
  for (const w of complete) markCutMinutes(on, w.start, w.end);
  return Math.max(0, Math.min(24, Math.round(on.filter(Boolean).length / 60)));
}

export function resolveCutWindows(input: {
  electricity: string;
  electricityCutWindows?: CutWindow[];
  electricityCutsStart?: string | null;
  electricityCutsEnd?: string | null;
}): CutWindow[] {
  if (input.electricity !== "scheduled_cuts") return [];
  const fromArray = completeCutWindows(input.electricityCutWindows ?? []).slice(0, 6);
  if (fromArray.length) return fromArray;
  if (input.electricityCutsStart && input.electricityCutsEnd) {
    return completeCutWindows([
      { start: input.electricityCutsStart, end: input.electricityCutsEnd },
    ]);
  }
  return [];
}
