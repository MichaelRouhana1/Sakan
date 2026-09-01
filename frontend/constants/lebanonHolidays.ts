/**
 * National days Lebanese universities typically close.
 * Fixed Gregorian dates follow the PCM list (decree 5112 / 3066).
 * Lunar dates are expected windows — Dar al-Fatwa / the government
 * confirm them close to the day (moon sighting).
 * Source: http://pcm.gov.lb/arabic/subpg.aspx?pageid=22
 */

export type HolidayStatus = "confirmed" | "tentative";

export type NationalHoliday = {
  id: string;
  title: string;
  /** Expected closed days (inclusive). */
  start: string;
  end: string;
  status: HolidayStatus;
  detail: string;
  /** Moon-sighting span. Drawn as a line, not as extra filled days. */
  windowStart?: string;
  windowEnd?: string;
};

function d(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Western / Orthodox Good Friday — computable, treated as confirmed. */
const FIXED_BY_YEAR: Record<number, { westernGf: string; orthodoxGf: string }> =
  {
    2026: { westernGf: d(2026, 4, 3), orthodoxGf: d(2026, 4, 10) },
    2027: { westernGf: d(2027, 3, 26), orthodoxGf: d(2027, 4, 30) },
  };

function gregorianYear(year: number): NationalHoliday[] {
  const easter = FIXED_BY_YEAR[year];
  const rows: NationalHoliday[] = [
    {
      id: `${year}-new-year`,
      title: "New Year's Day",
      start: d(year, 1, 1),
      end: d(year, 1, 1),
      status: "confirmed",
      detail: "Official public holiday (1 January).",
    },
    {
      id: `${year}-armenian-christmas`,
      title: "Armenian Christmas",
      start: d(year, 1, 6),
      end: d(year, 1, 6),
      status: "confirmed",
      detail: "Armenian Orthodox Christmas — official public holiday.",
    },
    {
      id: `${year}-maroun`,
      title: "St Maroun's Day",
      start: d(year, 2, 9),
      end: d(year, 2, 9),
      status: "confirmed",
      detail: "Official public holiday (9 February).",
    },
    {
      id: `${year}-annunciation`,
      title: "Annunciation",
      start: d(year, 3, 25),
      end: d(year, 3, 25),
      status: "confirmed",
      detail: "Feast of the Annunciation — official public holiday.",
    },
    {
      id: `${year}-labour`,
      title: "Labour Day",
      start: d(year, 5, 1),
      end: d(year, 5, 1),
      status: "confirmed",
      detail: "Official public holiday (1 May).",
    },
    {
      id: `${year}-liberation`,
      title: "Liberation Day",
      start: d(year, 5, 25),
      end: d(year, 5, 25),
      status: "confirmed",
      detail: "Resistance and Liberation Day — campuses typically closed.",
    },
    {
      id: `${year}-assumption`,
      title: "Assumption",
      start: d(year, 8, 15),
      end: d(year, 8, 15),
      status: "confirmed",
      detail: "Assumption of Mary — official public holiday.",
    },
    {
      id: `${year}-independence`,
      title: "Independence Day",
      start: d(year, 11, 22),
      end: d(year, 11, 22),
      status: "confirmed",
      detail: "National day — official public holiday.",
    },
    {
      id: `${year}-christmas`,
      title: "Christmas",
      start: d(year, 12, 25),
      end: d(year, 12, 25),
      status: "confirmed",
      detail: "Official public holiday (25 December).",
    },
  ];
  if (easter) {
    const sameFriday = easter.westernGf === easter.orthodoxGf;
    rows.push({
      id: `${year}-gf-catholic`,
      title: sameFriday
        ? "Good Friday (Catholic & Orthodox)"
        : "Good Friday (Catholic)",
      start: easter.westernGf,
      end: sameFriday
        ? addDays(easter.westernGf, 1)
        : easter.westernGf,
      status: "confirmed",
      detail: sameFriday
        ? "When both Good Fridays fall on the same day, Friday and Saturday are off."
        : "Catholic Good Friday — official public holiday.",
    });
    if (!sameFriday) {
      rows.push({
        id: `${year}-gf-orthodox`,
        title: "Good Friday (Orthodox)",
        start: easter.orthodoxGf,
        end: easter.orthodoxGf,
        status: "confirmed",
        detail: "Orthodox Good Friday — official public holiday.",
      });
    }
  }
  return rows;
}

function addDays(iso: string, days: number): string {
  const [y, m, d0] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d0! + days);
  return d(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function lunarOne(
  id: string,
  title: string,
  expected: string,
  detail: string,
): NationalHoliday {
  return {
    id,
    title,
    start: expected,
    end: expected,
    windowStart: addDays(expected, -1),
    windowEnd: addDays(expected, 1),
    status: "tentative",
    detail,
  };
}

function lunarEid(
  id: string,
  title: string,
  start: string,
  end: string,
  detail: string,
): NationalHoliday {
  return {
    id,
    title,
    start,
    end,
    windowStart: addDays(start, -1),
    windowEnd: addDays(end, 1),
    status: "tentative",
    detail,
  };
}

/** Lunar holidays — expected closed days + a ±1 sighting window. */
const LUNAR_WINDOWS: NationalHoliday[] = [
  lunarEid(
    "2026-eid-fitr",
    "Eid al-Fitr",
    "2026-03-20",
    "2026-03-21",
    "Usually 2 days (1–2 Shawwal). Exact dates come from Dar al-Fatwa a few days before.",
  ),
  lunarEid(
    "2026-eid-adha",
    "Eid al-Adha",
    "2026-05-27",
    "2026-05-28",
    "Usually 2 days (10–11 Dhu al-Hijjah). Confirmed shortly before Eid.",
  ),
  lunarOne(
    "2026-hijri-new-year",
    "Islamic New Year",
    "2026-06-16",
    "1 Muharram — one day off. The orange line is the ±1 day moon-sighting window.",
  ),
  lunarOne(
    "2026-ashura",
    "Ashura",
    "2026-06-25",
    "10 Muharram — one day off. Date confirmed close to the day.",
  ),
  lunarOne(
    "2026-mawlid",
    "Prophet's Birthday",
    "2026-08-25",
    "12 Rabi' al-awwal — one day off. Date confirmed close to the day.",
  ),
  lunarEid(
    "2027-eid-fitr",
    "Eid al-Fitr",
    "2027-03-10",
    "2027-03-11",
    "Usually 2 days (1–2 Shawwal). Exact dates come from Dar al-Fatwa a few days before.",
  ),
  lunarEid(
    "2027-eid-adha",
    "Eid al-Adha",
    "2027-05-17",
    "2027-05-18",
    "Usually 2 days (10–11 Dhu al-Hijjah). Confirmed shortly before Eid.",
  ),
  lunarOne(
    "2027-hijri-new-year",
    "Islamic New Year",
    "2027-06-06",
    "1 Muharram — one day off. The orange line is the ±1 day moon-sighting window.",
  ),
  lunarOne(
    "2027-ashura",
    "Ashura",
    "2027-06-15",
    "10 Muharram — one day off. Date confirmed close to the day.",
  ),
  lunarOne(
    "2027-mawlid",
    "Prophet's Birthday",
    "2027-08-14",
    "12 Rabi' al-awwal — one day off. Date confirmed close to the day.",
  ),
];

export const LEBANON_HOLIDAYS: NationalHoliday[] = [
  ...gregorianYear(2026),
  ...gregorianYear(2027),
  ...LUNAR_WINDOWS,
].sort((a, b) => a.start.localeCompare(b.start));

export function toIsoDate(date: Date): string {
  return d(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function parseIsoDate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, day);
}

function inSpan(iso: string, from: string, to: string): boolean {
  return from <= iso && iso <= to;
}

export function isSingleDay(h: NationalHoliday): boolean {
  return h.start === h.end;
}

/** Days the university is expected to close (not the sighting window). */
export function fillsOn(iso: string): NationalHoliday[] {
  return LEBANON_HOLIDAYS.filter((h) => {
    if (!inSpan(iso, h.start, h.end)) return false;
    if (h.status === "tentative" && isSingleDay(h)) return false;
    return true;
  });
}

export function windowsOn(iso: string): NationalHoliday[] {
  return LEBANON_HOLIDAYS.filter(
    (h) =>
      h.status === "tentative" &&
      h.windowStart != null &&
      h.windowEnd != null &&
      inSpan(iso, h.windowStart, h.windowEnd),
  );
}

export function holidaysOn(iso: string): NationalHoliday[] {
  const ids = new Set<string>();
  const out: NationalHoliday[] = [];
  for (const h of [...fillsOn(iso), ...windowsOn(iso)]) {
    if (ids.has(h.id)) continue;
    ids.add(h.id);
    out.push(h);
  }
  return out;
}

export function holidayStart(h: NationalHoliday): string {
  return h.windowStart ?? h.start;
}

export function holidayEnd(h: NationalHoliday): string {
  return h.windowEnd ?? h.end;
}

export function nextHolidayAfter(
  fromIso: string,
  excludeId?: string,
): NationalHoliday | null {
  return (
    LEBANON_HOLIDAYS.find((h) => {
      if (excludeId && h.id === excludeId) return false;
      return holidayStart(h) > fromIso;
    }) ?? null
  );
}

export function nextHoliday(fromIso: string): NationalHoliday | null {
  return (
    LEBANON_HOLIDAYS.find((h) => holidayEnd(h) >= fromIso && holidayStart(h) >= fromIso) ??
    LEBANON_HOLIDAYS.find((h) => holidayEnd(h) >= fromIso) ??
    null
  );
}

export function lastIsoOfMonth(year: number, monthIndex: number): string {
  const last = new Date(year, monthIndex + 1, 0);
  return d(last.getFullYear(), last.getMonth() + 1, last.getDate());
}

export function holidaysInMonth(
  year: number,
  monthIndex: number,
): NationalHoliday[] {
  const start = d(year, monthIndex + 1, 1);
  const end = lastIsoOfMonth(year, monthIndex);
  return LEBANON_HOLIDAYS.filter((h) => {
    const a = h.windowStart ?? h.start;
    const b = h.windowEnd ?? h.end;
    return a <= end && b >= start;
  });
}

export function daysUntil(iso: string, fromIso: string): number {
  const a = parseIsoDate(fromIso).getTime();
  const b = parseIsoDate(iso).getTime();
  return Math.round((b - a) / 86_400_000);
}
