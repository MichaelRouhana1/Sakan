import type { HotWater, WaterSource, WaterStatus } from "@/types/listing";

export const WATER_SOURCE_OPTIONS: { value: WaterSource; title: string }[] = [
  { value: "state_water", title: "State water (مي الدولة)" },
  { value: "salty_water", title: "Salty water (well)" },
  { value: "tank_delivery", title: "Tank delivery (citerne)" },
];

export const HOT_WATER_OPTIONS: { value: HotWater; title: string; body?: string }[] = [
  { value: "always", title: "Always", body: "solar, gas or on generator" },
  { value: "state_power", title: "Only with state power (كهرباء الدولة)" },
  { value: "none", title: "No" },
];

/** Old single choice becomes the matching new source. */
export function sourcesFromLegacyWater(
  water: WaterStatus | null | undefined,
  sources?: WaterSource[] | null,
): WaterSource[] {
  if (sources && sources.length > 0) return sources;
  if (water === "tank_delivery") return ["tank_delivery"];
  if (water === "state_well_24_7") return ["state_water"];
  return [];
}

/** Search still uses the old two-value water column. */
export function legacyWaterStatus(sources: WaterSource[]): WaterStatus {
  return sources.length === 1 && sources[0] === "tank_delivery"
    ? "tank_delivery"
    : "state_well_24_7";
}

export function waterFactChips(input: {
  water?: WaterStatus | null;
  waterSources?: WaterSource[] | null;
  hotWater?: HotWater | null;
  waterBillIncluded?: boolean | null;
}): string[] {
  const sources = sourcesFromLegacyWater(input.water, input.waterSources);
  const chips: string[] = [];
  if (sources.includes("state_water")) chips.push("state water (مي الدولة)");
  if (sources.includes("salty_water")) chips.push("salty water");
  if (sources.includes("tank_delivery")) chips.push("citerne");
  if (input.hotWater === "always") chips.push("hot water: always");
  if (input.hotWater === "state_power") chips.push("hot water: only with state power (كهرباء الدولة)");
  if (input.waterBillIncluded) chips.push("water bill included");
  return chips;
}
