import {
  cutHoursFromWindows,
  hoursWithPowerFromWindows,
  parseMinutes,
  type CutWindow,
} from "@/lib/electricityCuts";

export type PowerStability = "stable" | "moderate" | "severe";
export type StabilityFilter = PowerStability | "all";
export type SegmentKind = "edl" | "generator" | "blackout";

export type GridWindow = CutWindow & { id: string };

export type GridZone = {
  id: string;
  name: string;
  district: string;
  governorate: string;
  listingCount: number;
  generatorDuringCuts: boolean;
  generatorAmperes: number | null;
  cutWindows: GridWindow[];
  note: string;
  updatedAt: string;
};

export type WindowDraft = {
  zoneId: string;
  start: string;
  end: string;
};

export type CutAction = {
  kind: "remove" | "clear";
  zoneId: string;
  windowId?: string;
};

export const TIME_STEPS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export const AMPERE_OPTIONS = [5, 10, 15, 20, 30] as const;

export function formatTime(hhmm: string): string {
  const mins = parseMinutes(hhmm);
  if (mins == null) return hhmm;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${meridiem}`;
}

export function formatWindow(window: CutWindow): string {
  return `${formatTime(window.start)}–${formatTime(window.end)}`;
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function completeWindows(windows: CutWindow[]): CutWindow[] {
  return windows.filter(
    (window) => parseMinutes(window.start) != null && parseMinutes(window.end) != null,
  );
}

export function edlHours(zone: GridZone): number {
  const complete = completeWindows(zone.cutWindows);
  if (complete.length === 0) return 24;
  return hoursWithPowerFromWindows(complete) ?? 24;
}

export function cutHours(zone: GridZone): number {
  const complete = completeWindows(zone.cutWindows);
  if (complete.length === 0) return 0;
  return cutHoursFromWindows(complete) ?? 0;
}

export function generatorHours(zone: GridZone): number {
  return zone.generatorDuringCuts ? cutHours(zone) : 0;
}

export function blackoutHours(zone: GridZone): number {
  return zone.generatorDuringCuts ? 0 : cutHours(zone);
}

export function stabilityOf(zone: GridZone): PowerStability {
  const cuts = cutHours(zone);
  if (cuts <= 4) return "stable";
  if (cuts <= 12) return "moderate";
  return "severe";
}

export function stabilityLabel(status: PowerStability): string {
  if (status === "stable") return "Stable";
  if (status === "moderate") return "Moderate cuts";
  return "Severe cuts";
}

export function windowDurationHours(start: string, end: string): number | null {
  return cutHoursFromWindows([{ start, end }]);
}

export function buildSegments(
  windows: CutWindow[],
  generatorDuringCuts: boolean,
): { kind: SegmentKind; minutes: number }[] {
  const complete = completeWindows(windows);
  const slot: SegmentKind[] = Array.from({ length: 24 * 60 }, () => "edl");
  const fill: SegmentKind = generatorDuringCuts ? "generator" : "blackout";

  for (const window of complete) {
    const a = parseMinutes(window.start);
    const b = parseMinutes(window.end);
    if (a == null || b == null) continue;
    if (b > a) {
      for (let i = a; i < b; i++) slot[i] = fill;
    } else {
      for (let i = a; i < 24 * 60; i++) slot[i] = fill;
      for (let i = 0; i < b; i++) slot[i] = fill;
    }
  }

  const segs: { kind: SegmentKind; minutes: number }[] = [];
  for (const kind of slot) {
    const last = segs[segs.length - 1];
    if (last && last.kind === kind) last.minutes += 1;
    else segs.push({ kind, minutes: 1 });
  }
  return segs;
}

export function findZone(zones: GridZone[], id: string): GridZone | null {
  return zones.find((row) => row.id === id) ?? null;
}
