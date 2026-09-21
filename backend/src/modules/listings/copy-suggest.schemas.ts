import { z } from "zod";
import { LEBANON_AREA_SET } from "../../constants/lebanonAreas.js";

const optional = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
const count = (min: number, max: number) => optional(z.number().int().min(min).max(max));
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const copySuggestSchema = z.object({
  mode: z.enum(["title", "brief", "description", "all"]),
  facts: z.object({
    spaceType: optional(z.enum(["entire_place", "private_room", "shared_room"])),
    propertyType: optional(z.enum(["apartment", "studio", "dormitory", "house"])),
    area: optional(z.string().max(100).refine((v) => LEBANON_AREA_SET.has(v))),
    primaryCampusId: optional(z.string().uuid()),
    // The client label is never trusted; the route resolves the selected ID.
    campusName: optional(z.string().max(240)).transform(() => undefined),
    landmark: optional(z.string().trim().max(160)),
    bedrooms: count(0, 12), beds: count(1, 20), bathrooms: optional(z.number().min(0.5).max(10)),
    maxOccupancy: count(1, 20),
    furnishingType: optional(z.enum(["furnished", "semi", "unfurnished"])),
    electricity: optional(z.enum(["solar", "generator_24_7", "scheduled_cuts"])),
    electricityCutWindows: z.array(z.object({ start: clock, end: clock }).strict()).max(6).optional(),
    generatorAmperes: optional(z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)])),
    hasSolar: z.boolean().optional(), generatorIncluded: z.boolean().optional(),
    water: optional(z.enum(["state_well_24_7", "tank_delivery"])),
    wifiIncluded: z.boolean().optional(), routerUps: z.boolean().optional(),
    hasElevator: z.boolean().optional(), elevator24_7: z.boolean().optional(),
    conciergeIncluded: z.boolean().optional(), cookingGasIncluded: z.boolean().optional(),
    monthlyRentUsd: count(1, 10000000), securityDepositUsd: count(0, 20000000),
    priceBasis: optional(z.enum(["per_unit_month", "per_bed_month", "per_room_month"])),
    leaseTerm: optional(z.enum(["semester", "months_6", "months_9", "year", "flexible"])),
    paymentModality: optional(z.enum(["monthly", "semester", "quarterly"])),
    targetAudience: optional(z.enum(["anyone", "students_only", "students_professionals"])),
    genderRestriction: optional(z.enum(["anyone", "boys_only", "girls_only"])),
    amenities: z.array(z.string().min(1).max(48)).max(24).optional(),
    highlightTags: z.array(z.string().min(1).max(48)).max(8).optional(),
  }).strict(),
}).strict();
