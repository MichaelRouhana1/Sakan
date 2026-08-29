import {
  priorByDate,
  sliceByDate,
  type RangeId,
} from "../analytics/types";

export type { RangeId };
export { RANGE_TABS } from "../analytics/types";

export type FunnelStepId =
  | "type"
  | "location"
  | "specs"
  | "utilities"
  | "rules"
  | "photos"
  | "pricing"
  | "copy"
  | "contact"
  | "published";

export type FunnelStepMeta = {
  id: FunnelStepId;
  label: string;
  hint: string;
};

/** Matches listing wizard; last stage is publish, not the review screen itself. */
export const FUNNEL_STEPS: FunnelStepMeta[] = [
  { id: "type", label: "Place type", hint: "Rental model and building type" },
  { id: "location", label: "Location", hint: "Map pin so students walk the commute" },
  { id: "specs", label: "Layout & size", hint: "Beds, baths, occupancy" },
  { id: "utilities", label: "Power & water", hint: "Lebanon essentials first" },
  { id: "rules", label: "Who can stay", hint: "Gender, mix, house rules" },
  { id: "photos", label: "Photos", hint: "At least 3 images, cover first" },
  { id: "pricing", label: "Rent & terms", hint: "USD, deposit, lease length" },
  { id: "copy", label: "Title & story", hint: "What renters read before WhatsApp" },
  { id: "contact", label: "Contact", hint: "Role, phone, WhatsApp" },
  { id: "published", label: "Published", hint: "Live listing after review" },
];

export type DayFunnel = {
  date: string;
  counts: Record<FunnelStepId, number>;
};

export type FunnelStage = FunnelStepMeta & {
  count: number;
  pctOfStart: number;
  dropCount: number;
  dropPct: number;
};

export type PosterRef = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type AbandonedDraft = {
  id: string;
  poster: PosterRef;
  title: string | null;
  area: string;
  lastStepId: Exclude<FunnelStepId, "published">;
  startedAt: string;
  lastActiveAt: string;
  reminderSentAt: string | null;
};

export type ListFunnelParams = {
  range: RangeId;
  customFrom: string;
  customTo: string;
};

export type FunnelResult = {
  days: DayFunnel[];
  prior: DayFunnel[];
  dataStart: string;
  dataEnd: string;
};

export type ListAbandonedParams = {
  from: string;
  to: string;
  step?: FunnelStepId | "all";
};

export function stepLabel(id: FunnelStepId): string {
  return FUNNEL_STEPS.find((step) => step.id === id)?.label ?? id;
}

export function personName(user: PosterRef): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: PosterRef): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysStalled(lastActiveAt: string, nowIso: string): number {
  const last = Date.parse(lastActiveAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(last) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor((now - last) / 86400000));
}

export function stalledLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function emptyCounts(): Record<FunnelStepId, number> {
  return {
    type: 0,
    location: 0,
    specs: 0,
    utilities: 0,
    rules: 0,
    photos: 0,
    pricing: 0,
    copy: 0,
    contact: 0,
    published: 0,
  };
}

export function sumCounts(days: DayFunnel[]): Record<FunnelStepId, number> {
  const out = emptyCounts();
  for (const row of days) {
    for (const step of FUNNEL_STEPS) {
      out[step.id] += row.counts[step.id];
    }
  }
  return out;
}

export function buildStages(days: DayFunnel[]): FunnelStage[] {
  const sums = sumCounts(days);
  const started = Math.max(1, sums.type);
  return FUNNEL_STEPS.map((meta, i) => {
    const count = sums[meta.id];
    const prev = i === 0 ? count : sums[FUNNEL_STEPS[i - 1].id];
    const dropCount = Math.max(0, prev - count);
    const dropPct = prev > 0 ? (dropCount / prev) * 100 : 0;
    return {
      ...meta,
      count,
      pctOfStart: (count / started) * 100,
      dropCount,
      dropPct,
    };
  });
}

export function worstDropIndex(stages: FunnelStage[]): number {
  let worst = 1;
  let best = -1;
  for (let i = 1; i < stages.length; i += 1) {
    if (stages[i].dropPct > best) {
      best = stages[i].dropPct;
      worst = i;
    }
  }
  return worst;
}

export function sliceDays(
  days: DayFunnel[],
  range: RangeId,
  customFrom: string,
  customTo: string,
): DayFunnel[] {
  return sliceByDate(days, range, customFrom, customTo);
}

export function priorDays(days: DayFunnel[], current: DayFunnel[]): DayFunnel[] {
  return priorByDate(days, current);
}

export function sparkFor(
  days: DayFunnel[],
  id: FunnelStepId | "rate" | "abandoned",
  n = 14,
): number[] {
  const slice = days.slice(-n);
  return slice.map((row) => {
    if (id === "rate") {
      return row.counts.type > 0
        ? (row.counts.published / row.counts.type) * 100
        : 0;
    }
    if (id === "abandoned") {
      return Math.max(0, row.counts.type - row.counts.published);
    }
    return row.counts[id];
  });
}

export function isoDay(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}
