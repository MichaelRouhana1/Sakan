import type { ElectricityStatus, PowerHours, PowerSource } from "@/types/listing";

export const STATE_POWER_AR = "كهرباء الدولة";

export const POWER_SOURCE_OPTIONS: { value: PowerSource; title: string }[] = [
  { value: "state_power", title: `State power (${STATE_POWER_AR})` },
  { value: "generator", title: "Generator (ishtirak)" },
  { value: "solar", title: "Solar" },
];

export const POWER_HOURS_OPTIONS: { value: PowerHours; title: string }[] = [
  { value: "always", title: "24/7" },
  { value: "scheduled_cuts", title: "Scheduled cuts" },
];

const SOURCE_ORDER: PowerSource[] = ["state_power", "generator", "solar"];

/** Old exclusive choice becomes sources and hours. A solar backup stays a source. */
export function powerFromLegacy(input: {
  electricity?: ElectricityStatus | null;
  powerSources?: PowerSource[] | null;
  powerHours?: PowerHours | null;
  hasSolar?: boolean | null;
}): { sources: PowerSource[]; hours: PowerHours | null } {
  if (input.powerSources && input.powerSources.length > 0) {
    return { sources: input.powerSources, hours: input.powerHours ?? hoursFromElectricity(input.electricity) };
  }
  const sources: PowerSource[] = [];
  if (input.electricity === "scheduled_cuts") sources.push("state_power");
  if (input.electricity === "generator_24_7") sources.push("generator");
  if (input.electricity === "solar" || input.hasSolar) sources.push("solar");
  return { sources, hours: input.powerHours ?? hoursFromElectricity(input.electricity) };
}

function hoursFromElectricity(electricity?: ElectricityStatus | null): PowerHours | null {
  if (electricity === "scheduled_cuts") return "scheduled_cuts";
  if (electricity) return "always";
  return null;
}

/** Keep the old column so existing search filters and matchers still match. */
export function legacyElectricity(sources: PowerSource[], hours: PowerHours | null): ElectricityStatus {
  if (hours === "scheduled_cuts") return "scheduled_cuts";
  if (sources.includes("solar") && !sources.includes("generator")) return "solar";
  return "generator_24_7";
}

export function powerFactChip(input: {
  electricity?: ElectricityStatus | null;
  powerSources?: PowerSource[] | null;
  powerHours?: PowerHours | null;
  hasSolar?: boolean | null;
}): string | null {
  const { sources, hours } = powerFromLegacy(input);
  if (!sources.length || !hours) return null;
  const names = SOURCE_ORDER.filter((source) => sources.includes(source)).map((source) =>
    source === "state_power" ? `state (${STATE_POWER_AR})` : source,
  );
  return `power: ${hours === "always" ? "24/7" : "scheduled cuts"} · ${names.join(" + ")}`;
}
