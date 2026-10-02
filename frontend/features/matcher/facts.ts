import type { MatchFacts } from "./types";

export function enumFact<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}
export function numberFact(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (value === "" || (typeof value === "string" && !value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function extractMatchFacts(row: Record<string, unknown>): MatchFacts {
  const rent = numberFact(row.monthlyRentUsd ?? row.monthly_rent_usd);
  const lat = numberFact(row.lat);
  const lng = numberFact(row.lng);
  const wifi = row.wifiIncluded ?? row.wifi_included;
  return {
    reportedUtilityKeys: [
      row.electricity === "solar"
        ? "solar"
        : row.electricity === "generator_24_7"
          ? "power_24"
          : row.electricity === "scheduled_cuts"
            ? "cuts"
            : "",
      wifi === true ? "wifi" : "",
      (row.routerUps ?? row.router_ups) === true ? "ups_wifi" : "",
      row.water === "state_well_24_7"
        ? "water_24"
        : row.water === "tank_delivery"
          ? "tank"
          : "",
      (row.elevator24_7 ?? row.elevator_24_7) === true ? "elevator" : "",
    ].filter(Boolean),
    rent: rent != null && rent > 0 ? rent : null,
    type: enumFact(row.listingType ?? row.listing_type, [
      "studio",
      "entire_apartment",
      "private_room",
      "shared_dorm_bed",
      "pbsa_building",
    ]),
    gender: enumFact(row.genderRestriction ?? row.gender_restriction, [
      "anyone",
      "boys_only",
      "girls_only",
    ]),
    power: enumFact(row.electricity, [
      "solar",
      "generator_24_7",
      "scheduled_cuts",
    ]),
    wifi: typeof wifi === "boolean" ? wifi : null,
    area: typeof row.area === "string" && row.area.trim() ? row.area : null,
    lat: lat != null && Math.abs(lat) <= 90 ? lat : null,
    lng: lng != null && Math.abs(lng) <= 180 ? lng : null,
    priceBasis: enumFact(row.priceBasis ?? row.price_basis, [
      "per_unit_month",
      "per_bed_month",
      "per_room_month",
    ]),
  };
}
