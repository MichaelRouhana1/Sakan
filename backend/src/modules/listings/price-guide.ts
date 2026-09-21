import { sql } from "drizzle-orm";
import { z } from "zod";
import { LEBANON_AREA_SET } from "../../constants/lebanonAreas.js";
import { PRICE_GUIDE_MIN_COMPS } from "../../constants/listings.js";
import { listings } from "../../db/schema/listings.js";
import {
  listingPropertyTypeEnum,
  priceBasisEnum,
  spaceTypeEnum,
} from "../../db/schema/enums.js";

export const priceGuideQuerySchema = z.object({
  area: z.string().min(1).max(128).refine((v) => LEBANON_AREA_SET.has(v), "Unknown area"),
  spaceType: z.enum(spaceTypeEnum.enumValues),
  propertyType: z.enum(listingPropertyTypeEnum.enumValues),
  priceBasis: z.enum(priceBasisEnum.enumValues),
  bedrooms: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(12)),
  excludeListingId: z.string().uuid().optional(),
});

export type PriceGuideInput = z.infer<typeof priceGuideQuerySchema>;
export type PriceGuide = {
  n: number;
  medianUsd: number;
  lowUsd: number;
  highUsd: number;
  match: "area_space_beds_basis";
};

export type PriceGuideAggregate = {
  n: number;
  lowUsd: number | null;
  medianUsd: number | null;
  highUsd: number | null;
};

/**
 * V1 has one strict tier: area + space + price basis + bedroom bucket.
 * Studio (property type or zero bedrooms), 1, and 2+ are classified identically
 * on both sides. Never widen area or mix per-bed, per-room, and per-unit prices.
 * Aggregate the full matching population, without browse limits or photo joins.
 */
export function priceGuideAggregateQuery(input: PriceGuideInput) {
  const bucket = input.propertyType === "studio" || input.bedrooms === 0
    ? 0 : Math.min(input.bedrooms, 2);
  return sql`
    SELECT count(*)::int AS n,
      percentile_cont(0.25) WITHIN GROUP (ORDER BY ${listings.monthlyRentUsd}) AS "lowUsd",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ${listings.monthlyRentUsd}) AS "medianUsd",
      percentile_cont(0.75) WITHIN GROUP (ORDER BY ${listings.monthlyRentUsd}) AS "highUsd"
    FROM ${listings}
    WHERE ${listings.status} = 'active'
      AND ${listings.monthlyRentUsd} > 0
      AND (${listings.expiresAt} IS NULL OR ${listings.expiresAt} > now())
      AND ${listings.area} = ${input.area}
      AND ${listings.spaceType} = ${input.spaceType}
      AND ${listings.priceBasis} = ${input.priceBasis}
      AND CASE
        WHEN ${listings.propertyType} = 'studio' OR ${listings.bedrooms} = 0 THEN 0
        WHEN ${listings.bedrooms} = 1 THEN 1
        ELSE 2
      END = ${bucket}
      ${input.excludeListingId ? sql`AND ${listings.id} <> ${input.excludeListingId}` : sql``}
  `;
}

export function priceGuideFromAggregate(row: PriceGuideAggregate): PriceGuide | null {
  if (row.n < PRICE_GUIDE_MIN_COMPS || row.lowUsd == null ||
      row.medianUsd == null || row.highUsd == null) return null;
  return {
    n: row.n,
    lowUsd: Math.round(row.lowUsd),
    medianUsd: Math.round(row.medianUsd),
    highUsd: Math.round(row.highUsd),
    match: "area_space_beds_basis",
  };
}
