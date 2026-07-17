import type { ElectricityStatus, WaterStatus } from "@/types/listing";

export const ELECTRICITY_LABELS: Record<ElectricityStatus, string> = {
  solar: "Solar Power",
  generator_24_7: "24/7 Generator (Ishtirak)",
  scheduled_cuts: "Scheduled Cuts",
};

export const WATER_LABELS: Record<WaterStatus, string> = {
  state_well_24_7: "24/7 State/Well Water",
  tank_delivery: "Tank Delivery Required",
};

export const UTILITY_BADGE_KEYS = [
  "electricity",
  "water",
  "wifi",
  "routerUps",
  "elevator",
] as const;
