import type { AuditEvent, ChartRangeId, RoleMatrix, TrafficPoint } from "./types";

/** Seed window for custom date picker bounds (demo catalog dates). */
export const DATA_END = "2026-08-25";
export const DATA_START = "2026-07-26";
export const defaultCustomFrom = "2026-08-18";

export const ACTORS = {
  rania: {
    id: "adm_rania",
    name: "Rania Khoury",
    email: "rania@skoun.ops",
    role: "super_admin" as const,
  },
  nabil: {
    id: "adm_nabil",
    name: "Nabil Haddad",
    email: "nabil@skoun.ops",
    role: "moderator" as const,
  },
  maya: {
    id: "adm_maya",
    name: "Maya Saab",
    email: "maya@skoun.ops",
    role: "moderator" as const,
  },
  karim: {
    id: "adm_karim",
    name: "Karim Fares",
    email: "karim@skoun.ops",
    role: "support" as const,
  },
  lina: {
    id: "adm_lina",
    name: "Lina Mansour",
    email: "lina@skoun.ops",
    role: "analyst" as const,
  },
};

/** Demo session actors for save / export until real admin identity wires. */
export const DEMO_SAVE_ACTOR = ACTORS.rania;
export const DEMO_EXPORT_ACTOR = ACTORS.lina;

export const MOCK_MATRIX: RoleMatrix = {
  super_admin: {
    users_view: true,
    users_edit: true,
    users_delete: true,
    listings_view: true,
    listings_edit: true,
    listings_delete: true,
    credits_grant: true,
    zones_edit: true,
    reports_review: true,
    rbac_manage: true,
    logs_export: true,
    analytics_view: true,
  },
  moderator: {
    users_view: true,
    users_edit: true,
    users_delete: true,
    listings_view: true,
    listings_edit: true,
    listings_delete: true,
    credits_grant: true,
    zones_edit: true,
    reports_review: true,
    rbac_manage: false,
    logs_export: true,
    analytics_view: true,
  },
  support: {
    users_view: true,
    users_edit: true,
    users_delete: false,
    listings_view: true,
    listings_edit: true,
    listings_delete: false,
    credits_grant: false,
    zones_edit: false,
    reports_review: true,
    rbac_manage: false,
    logs_export: false,
    analytics_view: false,
  },
  analyst: {
    users_view: true,
    users_edit: false,
    users_delete: false,
    listings_view: true,
    listings_edit: false,
    listings_delete: false,
    credits_grant: false,
    zones_edit: false,
    reports_review: false,
    rbac_manage: false,
    logs_export: true,
    analytics_view: true,
  },
};

export const MOCK_EVENTS: AuditEvent[] = [
  {
    id: "aud_001",
    actor: ACTORS.rania,
    action: "rbac.update",
    detail: "Enabled logs_export for Analyst",
    target: "Role · Analyst",
    ip: "185.112.44.18",
    createdAt: "2026-08-25T17:52:00.000Z",
  },
  {
    id: "aud_002",
    actor: ACTORS.nabil,
    action: "listing.archive",
    detail: "Expired boost · duplicate photos",
    target: "Listing · Hamra studio #L-4412",
    ip: "91.232.110.54",
    createdAt: "2026-08-25T16:18:00.000Z",
  },
  {
    id: "aud_003",
    actor: ACTORS.maya,
    action: "credit_tx.approve",
    detail: "Comp 2 post credits · launch promo",
    target: "User · elie.n@aub.edu.lb",
    ip: "178.135.22.91",
    createdAt: "2026-08-25T15:41:00.000Z",
  },
  {
    id: "aud_004",
    actor: ACTORS.nabil,
    action: "zone.change",
    detail: "Moved Achrafieh East → Achrafieh Core",
    target: "Neighborhood · Sassine",
    ip: "91.232.110.54",
    createdAt: "2026-08-25T14:05:00.000Z",
  },
  {
    id: "aud_005",
    actor: ACTORS.karim,
    action: "report.dismiss",
    detail: "Dismissed spam · no policy hit",
    target: "Report · RP-8821",
    ip: "176.67.88.201",
    createdAt: "2026-08-25T13:22:00.000Z",
  },
  {
    id: "aud_006",
    actor: ACTORS.maya,
    action: "user.status",
    detail: "status=banned · Repeat fake listings after warn",
    target: "User · ghost.host@mail.com",
    ip: "178.135.22.91",
    createdAt: "2026-08-25T11:47:00.000Z",
  },
  {
    id: "aud_007",
    actor: ACTORS.lina,
    action: "logs.export",
    detail: "CSV · last 7 days · compliance",
    target: "Audit ledger",
    ip: "194.126.19.33",
    createdAt: "2026-08-25T10:12:00.000Z",
  },
  {
    id: "aud_008",
    actor: ACTORS.rania,
    action: "pricing.edit",
    detail: "Post credit $9 → $8.50",
    target: "Pricing engine",
    ip: "185.112.44.18",
    createdAt: "2026-08-24T19:30:00.000Z",
  },
  {
    id: "aud_009",
    actor: ACTORS.rania,
    action: "institution.update",
    detail: "Renamed shortName AUB → AUB Beirut",
    target: "Institution · American University of Beirut",
    ip: "185.112.44.18",
    createdAt: "2026-08-24T18:05:00.000Z",
  },
  {
    id: "aud_010",
    actor: ACTORS.maya,
    action: "credit_tx.approve",
    detail: "Whish · 3 post pack",
    target: "Tx · TX-22901",
    ip: "178.135.22.91",
    createdAt: "2026-08-24T16:44:00.000Z",
  },
  {
    id: "aud_011",
    actor: ACTORS.karim,
    action: "user.status",
    detail: "status=restricted · Messaging freeze · harassment queue",
    target: "User · sami.k@lau.edu.lb",
    ip: "176.67.88.201",
    createdAt: "2026-08-24T15:01:00.000Z",
  },
  {
    id: "aud_012",
    actor: ACTORS.nabil,
    action: "listing.remove",
    detail: "Off-platform escrow scam language",
    target: "Listing · Verdun 2BR #L-4388",
    ip: "91.232.110.54",
    createdAt: "2026-08-24T12:28:00.000Z",
  },
  {
    id: "aud_013",
    actor: ACTORS.maya,
    action: "credit_tx.reject",
    detail: "Duplicate OMT slip",
    target: "Tx · TX-22874",
    ip: "178.135.22.91",
    createdAt: "2026-08-23T20:15:00.000Z",
  },
  {
    id: "aud_014",
    actor: ACTORS.rania,
    action: "user.status",
    detail: "status=active · Appeal accepted · clean history",
    target: "User · nada.b@usj.edu.lb",
    ip: "185.112.44.18",
    createdAt: "2026-08-23T17:40:00.000Z",
  },
  {
    id: "aud_015",
    actor: ACTORS.lina,
    action: "logs.export",
    detail: "CSV · zone changes only",
    target: "Audit ledger",
    ip: "194.126.19.33",
    createdAt: "2026-08-23T09:55:00.000Z",
  },
  {
    id: "aud_016",
    actor: ACTORS.nabil,
    action: "listing.archive",
    detail: "Owner request · lease signed",
    target: "Listing · Jounieh loft #L-4201",
    ip: "91.232.110.54",
    createdAt: "2026-08-22T21:10:00.000Z",
  },
  {
    id: "aud_017",
    actor: ACTORS.maya,
    action: "campus.create",
    detail: "Branch campus pin set",
    target: "Campus · LAU Byblos",
    ip: "178.135.22.91",
    createdAt: "2026-08-22T14:33:00.000Z",
  },
  {
    id: "aud_018",
    actor: ACTORS.karim,
    action: "report.dismiss",
    detail: "Confirmed wrong address · archived listing",
    target: "Report · RP-8760",
    ip: "176.67.88.201",
    createdAt: "2026-08-21T11:08:00.000Z",
  },
  {
    id: "aud_019",
    actor: ACTORS.rania,
    action: "rbac.update",
    detail: "Disabled zones_edit for Support",
    target: "Role · Support",
    ip: "185.112.44.18",
    createdAt: "2026-08-20T16:22:00.000Z",
  },
  {
    id: "aud_020",
    actor: ACTORS.nabil,
    action: "zone.change",
    detail: "Split Mar Elias into North / South",
    target: "District · Beirut",
    ip: "91.232.110.54",
    createdAt: "2026-08-19T13:47:00.000Z",
  },
  {
    id: "aud_021",
    actor: ACTORS.maya,
    action: "listing.restore",
    detail: "False positive archive · restored live",
    target: "Listing · Bliss micro #L-4190",
    ip: "178.135.22.91",
    createdAt: "2026-08-18T22:05:00.000Z",
  },
  {
    id: "aud_022",
    actor: ACTORS.karim,
    action: "report.dismiss",
    detail: "Wrong campus tag · corrected",
    target: "Report · RP-8712",
    ip: "176.67.88.201",
    createdAt: "2026-08-17T08:40:00.000Z",
  },
];

const ENDPOINTS = [
  "GET /api/listings",
  "GET /api/listings/search",
  "GET /api/listings/:id",
  "GET /api/explore",
] as const;

/** Demo hourly buckets (chart “Last 24 hours” series — not log rolling window). */
export const MOCK_TRAFFIC_24H: TrafficPoint[] = Array.from(
  { length: 24 },
  (_, i) => {
    const hour = (19 - (23 - i) + 24) % 24;
    const base =
      hour >= 9 && hour <= 22 ? 420 + (hour % 5) * 55 : 90 + (hour % 3) * 20;
    const spike = hour === 3 || hour === 4 ? 980 : hour === 14 ? 210 : 0;
    const scrapes =
      hour === 3 || hour === 4
        ? 640 + (hour - 3) * 40
        : hour === 14
          ? 95
          : Math.round(base * 0.04);
    return {
      label: `${String(hour).padStart(2, "0")}:00`,
      requests: base + spike,
      scrapes,
      endpoint: ENDPOINTS[hour % ENDPOINTS.length],
    };
  },
);

export const MOCK_TRAFFIC_7D: TrafficPoint[] = [
  {
    label: "Wed",
    requests: 8420,
    scrapes: 310,
    endpoint: "GET /api/listings",
  },
  {
    label: "Thu",
    requests: 9104,
    scrapes: 288,
    endpoint: "GET /api/listings/search",
  },
  {
    label: "Fri",
    requests: 12040,
    scrapes: 1120,
    endpoint: "GET /api/listings/search",
  },
  {
    label: "Sat",
    requests: 7802,
    scrapes: 254,
    endpoint: "GET /api/explore",
  },
  {
    label: "Sun",
    requests: 6501,
    scrapes: 198,
    endpoint: "GET /api/listings",
  },
  {
    label: "Mon",
    requests: 9888,
    scrapes: 340,
    endpoint: "GET /api/listings/:id",
  },
  {
    label: "Tue",
    requests: 10420,
    scrapes: 890,
    endpoint: "GET /api/listings/search",
  },
];

export const MOCK_TRAFFIC_30D: TrafficPoint[] = Array.from(
  { length: 30 },
  (_, i) => {
    const day = 27 - (29 - i);
    const labelDay = day <= 0 ? day + 31 : day;
    const month = day <= 0 ? "Jul" : "Aug";
    const weekend = (i + 3) % 7 === 5 || (i + 3) % 7 === 6;
    const base = weekend ? 6200 : 8800 + (i % 4) * 420;
    const scrapes =
      i === 22 || i === 28 ? 1400 + (i % 3) * 80 : Math.round(base * 0.035);
    return {
      label: `${month} ${labelDay}`,
      requests: base + (i === 22 || i === 28 ? 3200 : 0),
      scrapes,
      endpoint: ENDPOINTS[i % ENDPOINTS.length],
    };
  },
);

export function trafficForRange(range: ChartRangeId): TrafficPoint[] {
  if (range === "7d") return MOCK_TRAFFIC_7D;
  if (range === "30d") return MOCK_TRAFFIC_30D;
  return MOCK_TRAFFIC_24H;
}
