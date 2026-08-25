import { isoFromUtc, pad2, type DayPoint } from "./types";

export const ANCHOR_DATE = "2026-08-25";

function noise(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function season(month: number, day: number): number {
  if (month === 8 && day >= 8) return 1.38;
  if (month === 9) return 1.48;
  if (month === 10 && day <= 12) return 1.22;
  if (month === 1 && day >= 12) return 1.18;
  if (month === 2 && day <= 18) return 1.26;
  if (month === 6 || month === 7) return 0.76;
  if (month === 5 && day >= 20) return 0.84;
  return 1;
}

function buildDays(): DayPoint[] {
  const end = Date.UTC(2026, 7, 25);
  const start = Date.UTC(2025, 7, 25);
  const out: DayPoint[] = [];
  const n = Math.round((end - start) / 86400000) + 1;

  for (let i = 0; i < n; i += 1) {
    const ms = start + i * 86400000;
    const d = new Date(ms);
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const dow = d.getUTCDay();
    const t = i / (n - 1);
    const s = season(month, day);
    const wave = 1 + 0.035 * Math.sin(i / 18) + 0.02 * Math.sin(i / 7);
    const weekend = dow === 0 || dow === 6 ? 0.78 : dow === 5 ? 0.9 : 1;

    const renterPool = 1640 + t * 2680 + s * 90;
    const posterPool = 290 + t * 560 + s * 28;
    const rN = 0.93 + noise(i, 1) * 0.12;
    const pN = 0.94 + noise(i, 2) * 0.1;

    const activeRenters = Math.round(renterPool * s * rN * wave);
    const activePosters = Math.round(posterPool * (0.88 + s * 0.12) * pN);
    const signups = Math.max(
      3,
      Math.round(
        (7 + s * 16) * (0.55 + noise(i, 3) * 0.9) + (month === 9 ? 10 : 0),
      ),
    );
    const dauRenters = Math.round(activeRenters * 0.19 * weekend * (0.92 + noise(i, 4) * 0.14));
    const dauPosters = Math.round(activePosters * 0.31 * weekend * (0.9 + noise(i, 5) * 0.16));
    const dau = dauRenters + dauPosters;
    const mau = Math.round(activeRenters * 0.62 + activePosters * 0.74);

    out.push({
      date: `${d.getUTCFullYear()}-${pad2(month)}-${pad2(day)}`,
      activeRenters,
      activePosters,
      signups,
      dau,
      mau,
      dauRenters,
      dauPosters,
    });
  }

  return out;
}

export const MOCK_DAYS: DayPoint[] = buildDays();

export const DATA_START = MOCK_DAYS[0]?.date ?? ANCHOR_DATE;
export const DATA_END = MOCK_DAYS[MOCK_DAYS.length - 1]?.date ?? ANCHOR_DATE;

export const RETENTION = {
  w1: 0.44,
  w4: 0.29,
  w8: 0.21,
};

export function defaultCustomFrom(): string {
  return isoFromUtc(Date.UTC(2026, 5, 1));
}
