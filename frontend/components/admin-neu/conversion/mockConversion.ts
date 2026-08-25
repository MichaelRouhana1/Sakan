import {
  FUNNEL_STEPS,
  isoDay,
  type AbandonedDraft,
  type DayFunnel,
  type FunnelStepId,
} from "./types";

export const ANCHOR_DATE = "2026-08-25";
export const ANCHOR_TS = "2026-08-25T18:00:00.000Z";

function noise(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function season(month: number, day: number): number {
  if (month === 8 && day >= 8) return 1.34;
  if (month === 9) return 1.52;
  if (month === 10 && day <= 12) return 1.18;
  if (month === 1 && day >= 12) return 1.12;
  if (month === 2 && day <= 18) return 1.2;
  if (month === 6 || month === 7) return 0.72;
  if (month === 5 && day >= 20) return 0.82;
  return 1;
}

/** Share of drafts that still reach each stage. Photos is the cliff. */
const KEEP = [1, 0.89, 0.82, 0.735, 0.695, 0.548, 0.492, 0.438, 0.396, 0.334];

function buildDays(): DayFunnel[] {
  const end = Date.UTC(2026, 7, 25);
  const start = Date.UTC(2025, 7, 25);
  const n = Math.round((end - start) / 86400000) + 1;
  const out: DayFunnel[] = [];

  for (let i = 0; i < n; i += 1) {
    const ms = start + i * 86400000;
    const d = new Date(ms);
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const dow = d.getUTCDay();
    const s = season(month, day);
    const weekend = dow === 0 || dow === 6 ? 0.62 : dow === 5 ? 0.84 : 1;
    const started = Math.max(
      2,
      Math.round((9 + s * 16) * weekend * (0.72 + noise(i, 1) * 0.55)),
    );

    const counts = {} as Record<FunnelStepId, number>;
    let prev = started;
    FUNNEL_STEPS.forEach((step, idx) => {
      const wobble = 0.96 + noise(i, idx + 2) * 0.08;
      const raw = Math.round(started * KEEP[idx] * wobble);
      const next = Math.min(prev, Math.max(idx === 0 ? started : 0, raw));
      counts[step.id] = next;
      prev = next;
    });

    out.push({ date: isoDay(ms), counts });
  }

  return out;
}

export const MOCK_DAYS: DayFunnel[] = buildDays();
export const DATA_START = MOCK_DAYS[0]?.date ?? ANCHOR_DATE;
export const DATA_END = MOCK_DAYS[MOCK_DAYS.length - 1]?.date ?? ANCHOR_DATE;

export function defaultCustomFrom(): string {
  return "2026-06-01";
}

export const MOCK_DRAFTS: AbandonedDraft[] = [
  {
    id: "d-01",
    poster: {
      id: "u-21",
      firstName: "Elie",
      lastName: "Nassar",
      email: "elie.nassar@gmail.com",
    },
    title: "Bright studio off Jeanne d'Arc",
    area: "Hamra",
    lastStepId: "photos",
    startedAt: "2026-08-12T09:18:00.000Z",
    lastActiveAt: "2026-08-22T16:04:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-02",
    poster: {
      id: "u-22",
      firstName: "Layla",
      lastName: "Karam",
      email: "layla.karam@lau.edu",
    },
    title: "Girls apartment near LAU",
    area: "Qoreitem",
    lastStepId: "utilities",
    startedAt: "2026-08-18T11:40:00.000Z",
    lastActiveAt: "2026-08-24T08:12:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-03",
    poster: {
      id: "u-07",
      firstName: "Rita",
      lastName: "Bazzi",
      email: "rita.bazzi@gmail.com",
    },
    title: null,
    area: "Ras Beirut",
    lastStepId: "photos",
    startedAt: "2026-08-08T14:22:00.000Z",
    lastActiveAt: "2026-08-19T19:51:00.000Z",
    reminderSentAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "d-04",
    poster: {
      id: "u-23",
      firstName: "Tarek",
      lastName: "Abou Jaoude",
      email: "tarek.aj@outlook.com",
    },
    title: "1BR with generator 10A",
    area: "Achrafieh",
    lastStepId: "copy",
    startedAt: "2026-08-15T07:55:00.000Z",
    lastActiveAt: "2026-08-23T13:27:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-05",
    poster: {
      id: "u-24",
      firstName: "Rania",
      lastName: "Sleiman",
      email: "rania.sleiman@mail.aub.edu",
    },
    title: "Quiet room near Main Gate",
    area: "Hamra",
    lastStepId: "pricing",
    startedAt: "2026-08-20T16:08:00.000Z",
    lastActiveAt: "2026-08-25T10:14:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-06",
    poster: {
      id: "u-25",
      firstName: "Jad",
      lastName: "Haddad",
      email: "jad.haddad@gmail.com",
    },
    title: null,
    area: "Jounieh",
    lastStepId: "location",
    startedAt: "2026-08-21T12:33:00.000Z",
    lastActiveAt: "2026-08-21T12:41:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-07",
    poster: {
      id: "u-26",
      firstName: "Nadine",
      lastName: "Aoun",
      email: "nadine.aoun@hotmail.com",
    },
    title: "Shared dorm bed — girls only",
    area: "Ain El Mreisseh",
    lastStepId: "photos",
    startedAt: "2026-08-04T18:02:00.000Z",
    lastActiveAt: "2026-08-17T21:09:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-08",
    poster: {
      id: "u-27",
      firstName: "Walid",
      lastName: "Tannous",
      email: "walid.tannous@gmail.com",
    },
    title: "Family apartment Baabda",
    area: "Baabda",
    lastStepId: "contact",
    startedAt: "2026-08-11T08:44:00.000Z",
    lastActiveAt: "2026-08-24T17:36:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-09",
    poster: {
      id: "u-28",
      firstName: "Yara",
      lastName: "Gebara",
      email: "yara.gebara@usj.edu.lb",
    },
    title: "Studio facing campus",
    area: "Huvelin",
    lastStepId: "utilities",
    startedAt: "2026-08-16T10:11:00.000Z",
    lastActiveAt: "2026-08-22T09:03:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-10",
    poster: {
      id: "u-29",
      firstName: "Samer",
      lastName: "Rahme",
      email: "samer.rahme@gmail.com",
    },
    title: null,
    area: "Verdun",
    lastStepId: "specs",
    startedAt: "2026-08-23T15:20:00.000Z",
    lastActiveAt: "2026-08-23T15:28:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-11",
    poster: {
      id: "u-30",
      firstName: "Hiba",
      lastName: "Farah",
      email: "hiba.farah@gmail.com",
    },
    title: "Sunny 2BR with balcony",
    area: "Hamra",
    lastStepId: "photos",
    startedAt: "2026-07-28T09:50:00.000Z",
    lastActiveAt: "2026-08-14T11:17:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-12",
    poster: {
      id: "u-31",
      firstName: "Anthony",
      lastName: "Khalil",
      email: "anthony.khalil@outlook.com",
    },
    title: "Private room + desk",
    area: "Byblos",
    lastStepId: "copy",
    startedAt: "2026-08-09T13:06:00.000Z",
    lastActiveAt: "2026-08-18T20:42:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-13",
    poster: {
      id: "u-32",
      firstName: "Mira",
      lastName: "Saad",
      email: "mira.saad@lau.edu",
    },
    title: "Entire place near LAU Byblos",
    area: "Byblos",
    lastStepId: "rules",
    startedAt: "2026-08-19T08:29:00.000Z",
    lastActiveAt: "2026-08-24T22:05:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-14",
    poster: {
      id: "u-33",
      firstName: "Fouad",
      lastName: "Khoury",
      email: "fouad.khoury@gmail.com",
    },
    title: "Chalet-style house share",
    area: "Aley",
    lastStepId: "photos",
    startedAt: "2026-07-12T17:14:00.000Z",
    lastActiveAt: "2026-07-30T12:08:00.000Z",
    reminderSentAt: null,
  },
  {
    id: "d-15",
    poster: {
      id: "u-34",
      firstName: "Sara",
      lastName: "Chami",
      email: "sara.chami@mail.aub.edu",
    },
    title: null,
    area: "Hamra",
    lastStepId: "type",
    startedAt: "2026-08-25T09:02:00.000Z",
    lastActiveAt: "2026-08-25T09:07:00.000Z",
    reminderSentAt: null,
  },
];
