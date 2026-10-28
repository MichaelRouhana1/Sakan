import { placePhotos, places } from '../../db/schema/places.js';
import { listingResolved } from '../../db/schema/listing-resolved.js';
import { ConflictError } from '../../lib/errors.js';
import { normalizedShared, sharedFields, sharedSqlValues } from './place-fields.js';
import type { PromotionWalletTransaction } from '../credits/promotion-wallet.js';
import { ValidationError } from '../../lib/errors.js';
import { chargeUnit } from './listing-charges.service.js';
import { lockInventory, changeUnitInventory, settlePlaceInventory } from './inventory.service.js';
import { promotionLock, stopListingPromotions } from '../promotions/promotions.service.js';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { campusHousingRadiusMeters } from "../campus/campus.repository.js";
import { db } from "../../db/index.js";
import { listingPhotos, listings } from "../../db/schema/index.js";
import { deriveGenderRule, deriveUnitType } from "./deriveListingType.js";
import {
  deriveContactPhones,
  resolveContactNumbers,
} from "../../lib/lebanonPhone.js";
import type { AuditActor } from "../admin/admin.audit.js";
import { recordListingUpdateAudit } from "./listing-update-audit.js";
import type { ListingUpdateSnapshot } from "./listing-edit-fields.js";
import { listingWriteFromInput } from "./listing-update-snapshot.js";
import type {
  CreateListingInput,
  ListingPhotoDto,
  ListingPropertyFilters,
  ListingSort,
  UpdateListingInput,
} from "./listings.schemas.js";
import { EMPTY_PROPERTY_FILTERS } from "./listings.schemas.js";
import { priceGuideAggregateQuery, type PriceGuideAggregate, type PriceGuideInput } from "./price-guide.js";

export type ListingWithPhotos = Record<string, unknown> & {
  photos: ListingPhotoDto[];
  coverUrl: string | null;
  lng: number | null;
  lat: number | null;
  distanceMeters?: number;
  nearestCampusSlug?: string;
};

/** Explicit listing columns — never select raw geography/location. */
export const listingPublicColumns = {
  id: listingResolved.id,
  contactTapCount: listingResolved.contactTapCount,
  placeId: listingResolved.placeId,
  unitType: listingResolved.unitType,
  bathroomPrivacy: listingResolved.bathroomPrivacy,
  placeKind: listingResolved.placeKind,
  hidden: listingResolved.hidden,
  hiddenReason: listingResolved.hiddenReason,
  bedsTotal: listingResolved.bedsTotal,
  bedsAvailable: listingResolved.bedsAvailable,
  inventoryNeedsConfirmation: listingResolved.inventoryNeedsConfirmation,
  inventoryVersion: listingResolved.inventoryVersion,
  posterId: listingResolved.posterId,
  status: listingResolved.status,
  availability: listingResolved.availability,
  listingType: listingResolved.listingType,
  spaceType: listingResolved.spaceType,
  propertyType: listingResolved.propertyType,
  priceBasis: listingResolved.priceBasis,
  targetAudience: listingResolved.targetAudience,
  genderRestriction: listingResolved.genderRestriction,
  monthlyRentUsd: listingResolved.monthlyRentUsd,
  securityDepositUsd: listingResolved.securityDepositUsd,
  leaseTerm: listingResolved.leaseTerm,
  availableFrom: listingResolved.availableFrom,
  paymentModality: listingResolved.paymentModality,
  electricity: listingResolved.electricity,
  electricityCutsStart: listingResolved.electricityCutsStart,
  electricityCutsEnd: listingResolved.electricityCutsEnd,
  electricityHoursOn: listingResolved.electricityHoursOn,
  electricityCutWindows: listingResolved.electricityCutWindows,
  water: listingResolved.water,
  wifiIncluded: listingResolved.wifiIncluded,
  routerUps: listingResolved.routerUps,
  elevator24_7: listingResolved.elevator24_7,
  hasElevator: listingResolved.hasElevator,
  hasSolar: listingResolved.hasSolar,
  generatorAmperes: listingResolved.generatorAmperes,
  generatorIncluded: listingResolved.generatorIncluded,
  conciergeIncluded: listingResolved.conciergeIncluded,
  cookingGasIncluded: listingResolved.cookingGasIncluded,
  waterBillIncluded: listingResolved.waterBillIncluded,
  buildingFeesIncluded: listingResolved.buildingFeesIncluded,
  parkingIncludedInRent: listingResolved.parkingIncludedInRent,
  amenities: listingResolved.amenities,
  bedrooms: listingResolved.bedrooms,
  beds: listingResolved.beds,
  bathrooms: listingResolved.bathrooms,
  maxOccupancy: listingResolved.maxOccupancy,
  furnishingType: listingResolved.furnishingType,
  floorNumber: listingResolved.floorNumber,
  areaSqm: listingResolved.areaSqm,
  smokingPolicy: listingResolved.smokingPolicy,
  petsPolicy: listingResolved.petsPolicy,
  guestsPolicy: listingResolved.guestsPolicy,
  quietHours: listingResolved.quietHours,
  title: listingResolved.title,
  description: listingResolved.description,
  highlightTags: listingResolved.highlightTags,
  cardBadges: listingResolved.cardBadges,
  listingPosterRole: listingResolved.listingPosterRole,
  contactName: listingResolved.contactName,
  contactPhone: listingResolved.contactPhone,
  whatsappNumber: listingResolved.whatsappNumber,
  contactNumbers: listingResolved.contactNumbers,
  area: listingResolved.area,
  landmark: listingResolved.landmark,
  addressLine: listingResolved.addressLine,
  buildingName: listingResolved.buildingName,
  primaryCampusId: listingResolved.primaryCampusId,
  viewCount: listingResolved.viewCount,
  publishedAt: listingResolved.publishedAt,
  expiresAt: listingResolved.expiresAt,
  boostedUntil: listingResolved.boostedUntil,
  createdAt: listingResolved.createdAt,
  updatedAt: listingResolved.updatedAt,
  lng: sql<number | null>`ST_X(${listingResolved.location}::geometry)`.as("lng"),
  lat: sql<number | null>`ST_Y(${listingResolved.location}::geometry)`.as("lat"),
};

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseJsonStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

function parseNullableJsonStringArray(value: unknown): string[] | null {
  if (value == null) return null;
  return parseJsonStringArray(value);
}

function searchTokens(q: string | undefined): string[] {
  if (!q || q.trim().length === 0) return [];
  return q.trim().split(/\s+/).filter(Boolean).slice(0, 12);
}

function likePattern(token: string): string {
  return `%${token.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/** Each word must match somewhere in the title, place name, or area (any order). */
function textSearchDrizzleConditions(q: string | undefined): SQL[] {
  return searchTokens(q).map((token) => {
    const like = likePattern(token);
    return or(
      ilike(listingResolved.title, like),
      ilike(listingResolved.buildingName, like),
      ilike(listingResolved.area, like),
      ilike(listingResolved.description, like),
      ilike(listingResolved.landmark, like),
      ilike(listingResolved.addressLine, like),
    )!;
  });
}

/** Raw-SQL text search: AND across tokens, OR across title, place name, and area (alias `l`). */
function textSearchSqlFragment(q: string | undefined): SQL {
  const tokens = searchTokens(q);
  if (tokens.length === 0) return sql``;
  return sql.join(
    tokens.map((token) => {
      const like = likePattern(token);
      return sql`AND (
        l.title ILIKE ${like}
        OR COALESCE(l.building_name, '') ILIKE ${like}
        OR l.area ILIKE ${like}
        OR COALESCE(l.description, '') ILIKE ${like}
        OR COALESCE(l.landmark, '') ILIKE ${like}
        OR COALESCE(l.address_line, '') ILIKE ${like}
      )`;
    }),
    sql` `,
  );
}

/** Drizzle AND fragments for property browse filters. */
function propertyDrizzleConditions(
  filters: ListingPropertyFilters,
): SQL[] {
  const out: SQL[] = [];
  if (filters.electricity.length > 0) {
    out.push(inArray(listingResolved.electricity, filters.electricity));
  }
  if (filters.water.length > 0) {
    out.push(inArray(listingResolved.water, filters.water));
  }
  if (filters.listingTypes.length > 0) {
    out.push(inArray(listingResolved.listingType, filters.listingTypes));
  }
  if (filters.wifiIncluded) {
    out.push(eq(listingResolved.wifiIncluded, true));
  }
  if (filters.minRentUsd != null) {
    out.push(gte(listingResolved.monthlyRentUsd, filters.minRentUsd));
  }
  if (filters.maxRentUsd != null) {
    out.push(lte(listingResolved.monthlyRentUsd, filters.maxRentUsd));
  }
  if (filters.studentsOnly) {
    out.push(eq(listingResolved.targetAudience, "students_only"));
  }
  if (filters.genderRestrictions.length > 0) {
    out.push(inArray(listingResolved.genderRestriction, filters.genderRestrictions));
  }
  return out;
}

/** Raw-SQL AND fragments for the hub distance query (alias `l`). */
function propertySqlFragments(filters: ListingPropertyFilters): SQL {
  const parts: SQL[] = [];
  if (filters.electricity.length > 0) {
    parts.push(
      sql`AND l.electricity IN (${sql.join(
        filters.electricity.map((e) => sql`${e}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.water.length > 0) {
    parts.push(
      sql`AND l.water IN (${sql.join(
        filters.water.map((w) => sql`${w}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.listingTypes.length > 0) {
    parts.push(
      sql`AND l.listing_type IN (${sql.join(
        filters.listingTypes.map((t) => sql`${t}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.wifiIncluded) {
    parts.push(sql`AND l.wifi_included = true`);
  }
  if (filters.minRentUsd != null) {
    parts.push(sql`AND l.monthly_rent_usd >= ${filters.minRentUsd}`);
  }
  if (filters.maxRentUsd != null) {
    parts.push(sql`AND l.monthly_rent_usd <= ${filters.maxRentUsd}`);
  }
  if (filters.studentsOnly) {
    parts.push(sql`AND l.target_audience = 'students_only'`);
  }
  if (filters.genderRestrictions.length > 0) {
    parts.push(
      sql`AND l.gender_restriction IN (${sql.join(
        filters.genderRestrictions.map((g) => sql`${g}`),
        sql`, `,
      )})`,
    );
  }
  if (parts.length === 0) return sql``;
  return sql.join(parts, sql` `);
}

function attachPhotos<T extends { id: string }>(
  rows: T[],
  photosByListing: Map<string, ListingPhotoDto[]>,
): (T & { photos: ListingPhotoDto[]; coverUrl: string | null })[] {
  return rows.map((row) => {
    const photos = photosByListing.get(row.id) ?? [];
    return {
      ...row,
      photos,
      coverUrl: photos[0]?.url ?? null,
    };
  });
}

export class ListingsRepository {
  async priceGuideAggregate(input: PriceGuideInput): Promise<PriceGuideAggregate> {
    const [row] = await db.execute<PriceGuideAggregate>(priceGuideAggregateQuery(input));
    return row;
  }

  async findPhotosByListingIds(
    listingIds: string[],
  ): Promise<Map<string, ListingPhotoDto[]>> {
    const map = new Map<string, ListingPhotoDto[]>();
    if (listingIds.length === 0) return map;

    const rows = await db
      .select({
        id: listingPhotos.id,
        listingId: listingPhotos.listingId,
        url: listingPhotos.url,
        caption: listingPhotos.caption,
        sortOrder: listingPhotos.sortOrder,
      })
      .from(listingPhotos)
      .where(inArray(listingPhotos.listingId, listingIds))
      .orderBy(asc(listingPhotos.sortOrder), asc(listingPhotos.createdAt));

    for (const row of rows) {
      const list = map.get(row.listingId) ?? [];
      list.push({
        id: row.id,
        url: row.url,
        sortOrder: row.sortOrder,
        caption: row.caption ?? null,
      });
      map.set(row.listingId, list);
    }
    return map;
  }

  async withPhotos<T extends { id: string }>(
    rows: T[],
  ): Promise<(T & { photos: ListingPhotoDto[]; coverUrl: string | null })[]> {
    const photosByListing = await this.findPhotosByListingIds(
      rows.map((r) => r.id),
    );
    return attachPhotos(rows, photosByListing);
  }

  async findById(id: string) {
    const [row] = await db
      .select(listingPublicColumns)
      .from(listingResolved)
      .where(eq(listingResolved.id, id))
      .limit(1);
    if (!row) return null;
    const normalized = {
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    };
    const [withPhotos] = await this.withPhotos([normalized]);
    if (!withPhotos) return null;
    const sharedPhotos = await db.select({id:placePhotos.id,url:placePhotos.url,caption:placePhotos.caption,sortOrder:placePhotos.sortOrder})
      .from(placePhotos).where(eq(placePhotos.placeId,row.placeId)).orderBy(asc(placePhotos.sortOrder));
    return {...withPhotos,sharedPhotos};
  }

  /** Public siblings are explicit place members, never proximity matches. */
  async findNearbyActive(listingId: string) {
    const [origin] = await db.select({ placeId: listings.placeId }).from(listings)
      .where(eq(listings.id, listingId)).limit(1);
    if (!origin) return null;
    const rows = await db.select(listingPublicColumns).from(listingResolved).where(and(
      eq(listingResolved.placeId, origin.placeId), ne(listingResolved.id, listingId),
      eq(listingResolved.status, "active"), ne(listingResolved.availability, "rented"),
      sql`${listingResolved.hiddenReason} IS NULL`, sql`${listingResolved.expiresAt} > now()`,
    )).orderBy(asc(listingResolved.monthlyRentUsd), asc(listingResolved.id));
    return this.withPhotos(rows.map(row => ({ ...row, lng: parseCoord(row.lng), lat: parseCoord(row.lat) })));
  }

  async listActiveByArea(area?: string, sort: ListingSort = "newest") {
    return this.listActiveByAreas(area ? [area] : [], sort);
  }

  async listActiveByAreas(
    areas: string[] = [],
    sort: ListingSort = "newest",
    property: ListingPropertyFilters = EMPTY_PROPERTY_FILTERS,
    q?: string,
  ) {
    const conditions = [
      eq(listingResolved.status, "active"),
      ne(listingResolved.availability, "rented"),
      sql`${listingResolved.hiddenReason} IS NULL`,
      sql`${listingResolved.expiresAt} > now()`,
      ...propertyDrizzleConditions(property),
      ...textSearchDrizzleConditions(q),
    ];
    if (areas.length > 0) {
      conditions.push(inArray(listingResolved.area, areas));
    }

    const boostFirst = sort === 'newest' && process.env.PROMOTION_PLACEMENT_ENABLED !== 'true'
      ? sql`CASE WHEN ${listingResolved.availability}='available' AND ${listingResolved.boostedUntil}>now() THEN ${listingResolved.boostedUntil} END DESC NULLS LAST`
      : sql`CASE WHEN false THEN 1 END`;
    const secondary =
      sort === "price_asc"
        ? asc(listingResolved.monthlyRentUsd)
        : sql`COALESCE(${listingResolved.publishedAt}, ${listingResolved.createdAt}) DESC`;

    const rows = await db
      .select(listingPublicColumns)
      .from(listingResolved)
      .where(and(...conditions))
      .orderBy(boostFirst, secondary, desc(listingResolved.createdAt));

    const normalized = rows.map((row) => ({
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    }));

    return this.withPhotos(normalized);
  }

  /**
   * Hub distance = nearest of selected campuses; `nearest_campus_slug` is the campus that won.
   * Optional `areas` further filters listing.area IN (...).
   * Optional `radiusMeters` caps with ST_DWithin (default none / unlimited when undefined).
   */
  async listActiveNearUniversities(
    universitySlugs: string[],
    areas: string[] = [],
    property: ListingPropertyFilters = EMPTY_PROPERTY_FILTERS,
    opts?: { radiusMeters?: number; q?: string },
  ) {
    if (universitySlugs.length === 0) return [];

    const slugList = sql.join(
      universitySlugs.map((s) => sql`${s}`),
      sql`, `,
    );
    const areaFilter =
      areas.length > 0
        ? sql`AND l.area IN (${sql.join(
            areas.map((a) => sql`${a}`),
            sql`, `,
          )})`
        : sql``;
    const propertyFilter = propertySqlFragments(property);
    const textFilter = textSearchSqlFragment(opts?.q);
    const radiusMeters = opts?.radiusMeters;
    const radiusFilter =
      radiusMeters != null && Number.isFinite(radiusMeters) && radiusMeters > 0
        ? sql`AND ST_DWithin(l.location, d.campus_location, ${radiusMeters})`
        : sql``;

    const result = await db.execute(sql`
      WITH campus_set AS (
        SELECT id, slug, name, location
        FROM universities
        WHERE slug IN (${slugList})
      ),
      nearest AS (
        SELECT
          l.id AS listing_id,
          d.distance_meters,
          d.campus_slug AS nearest_campus_slug
        FROM listing_resolved l
        CROSS JOIN LATERAL (
          SELECT
            ST_Distance(l.location, c.location) AS distance_meters,
            c.slug AS campus_slug,
            c.location AS campus_location
          FROM campus_set c
          ORDER BY ST_Distance(l.location, c.location) ASC
          LIMIT 1
        ) d
        WHERE l.status = 'active'
          AND l.availability <> 'rented' AND l.hidden_reason IS NULL AND l.expires_at > now()
          AND l.location IS NOT NULL
          ${areaFilter}
          ${propertyFilter}
          ${textFilter}
          ${radiusFilter}
      )
      SELECT
        l.id,
        l.place_id,
        l.beds_available,
        l.inventory_needs_confirmation,
        l.poster_id,
        l.status,
        l.availability,
        l.listing_type,
        l.space_type,
        l.property_type,
        l.price_basis,
        l.target_audience,
        l.gender_restriction,
        l.monthly_rent_usd,
        l.security_deposit_usd,
        l.lease_term,
        l.available_from,
        l.payment_modality,
        l.electricity,
        l.electricity_cuts_start,
        l.electricity_cuts_end,
        l.electricity_hours_on,
        l.electricity_cut_windows,
        l.water,
        l.wifi_included,
        l.router_ups,
        l.elevator_24_7,
        l.has_elevator,
        l.has_solar,
        l.generator_amperes,
        l.generator_included,
        l.concierge_included,
        l.cooking_gas_included,
        l.water_bill_included,
        l.building_fees_included,
        l.parking_included_in_rent,
        l.amenities,
        l.bedrooms,
        l.beds,
        l.bathrooms,
        l.max_occupancy,
        l.furnishing_type,
        l.floor_number,
        l.area_sqm,
        l.smoking_policy,
        l.pets_policy,
        l.guests_policy,
        l.quiet_hours,
        l.title,
        l.description,
        l.highlight_tags,
        l.card_badges,
        l.listing_poster_role,
        l.contact_name,
        l.contact_phone,
        l.whatsapp_number,
        l.contact_numbers,
        l.area,
        l.landmark,
        l.address_line,
        l.building_name,
        l.primary_campus_id,
        l.view_count,
        l.published_at,
        l.expires_at,
        l.boosted_until,
        l.created_at,
        l.updated_at,
        n.distance_meters,
        n.nearest_campus_slug,
        ST_X(l.location::geometry) AS lng,
        ST_Y(l.location::geometry) AS lat
      FROM listing_resolved l
      INNER JOIN nearest n ON n.listing_id = l.id
      ORDER BY n.distance_meters ASC, l.id ASC
    `);

    return this.mapHubRows(result);
  }

  /** Active listings within radiusKm of an arbitrary WGS84 point. */
  async listActiveNearPoint(
    lat: number,
    lng: number,
    radiusKm: number,
    areas: string[] = [],
    property: ListingPropertyFilters = EMPTY_PROPERTY_FILTERS,
    q?: string,
  ) {
    const meters = radiusKm * 1000;
    const conditions = [
      eq(listingResolved.status, "active"),
      ne(listingResolved.availability, "rented"),
      sql`${listingResolved.hiddenReason} IS NULL`,
      sql`${listingResolved.expiresAt} > now()`,
      isNotNull(listingResolved.location),
      sql`ST_DWithin(
        ${listingResolved.location},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${meters}
      )`,
      ...propertyDrizzleConditions(property),
      ...textSearchDrizzleConditions(q),
    ];
    if (areas.length > 0) {
      conditions.push(inArray(listingResolved.area, areas));
    }

    const distanceSql = sql<number>`ST_Distance(
      ${listingResolved.location},
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    )`;

    const rows = await db
      .select({
        ...listingPublicColumns,
        distanceMeters: distanceSql.as("distance_meters"),
      })
      .from(listingResolved)
      .where(and(...conditions))
      .orderBy(
        sql`CASE WHEN ${process.env.PROMOTION_PLACEMENT_ENABLED !== "true"} AND ${listingResolved.availability}='available' AND ${listingResolved.boostedUntil}>now() THEN ${listingResolved.boostedUntil} END DESC NULLS LAST`,
        asc(distanceSql),
      );

    const normalized = rows.map((row) => ({
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
      distanceMeters: Number(row.distanceMeters),
    }));

    return this.withPhotos(normalized);
  }

  private mapHubRows(result: unknown) {
    const rows = Array.isArray(result)
      ? result
      : ((result as { rows?: Record<string, unknown>[] }).rows ?? []);

    const mapped = rows.map((row) => ({
      id: String(row.id),
      placeId: String(row.place_id),
      bedsAvailable: row.beds_available == null ? null : Number(row.beds_available),
      inventoryNeedsConfirmation: Boolean(row.inventory_needs_confirmation),
      posterId: String(row.poster_id),
      status: row.status as "active",
      availability: (row.availability as string) ?? "available",
      listingType: row.listing_type,
      spaceType: row.space_type,
      propertyType: row.property_type,
      priceBasis: row.price_basis,
      targetAudience: row.target_audience,
      genderRestriction: row.gender_restriction,
      monthlyRentUsd: Number(row.monthly_rent_usd),
      securityDepositUsd: Number(row.security_deposit_usd ?? 0),
      leaseTerm: row.lease_term,
      availableFrom: row.available_from ?? null,
      paymentModality: row.payment_modality,
      electricity: row.electricity,
      electricityCutsStart: (row.electricity_cuts_start as string | null) ?? null,
      electricityCutsEnd: (row.electricity_cuts_end as string | null) ?? null,
      electricityHoursOn:
        row.electricity_hours_on == null
          ? null
          : Number(row.electricity_hours_on),
      electricityCutWindows: row.electricity_cut_windows ?? [],
      water: row.water,
      wifiIncluded: Boolean(row.wifi_included),
      routerUps: Boolean(row.router_ups),
      elevator24_7: Boolean(row.elevator_24_7),
      hasElevator: Boolean(row.has_elevator),
      hasSolar: Boolean(row.has_solar),
      generatorAmperes:
        row.generator_amperes == null ? null : Number(row.generator_amperes),
      generatorIncluded: Boolean(row.generator_included),
      conciergeIncluded: Boolean(row.concierge_included),
      cookingGasIncluded: Boolean(row.cooking_gas_included),
      waterBillIncluded: Boolean(row.water_bill_included),
      buildingFeesIncluded: Boolean(row.building_fees_included),
      parkingIncludedInRent: Boolean(row.parking_included_in_rent),
      amenities: parseJsonStringArray(row.amenities),
      bedrooms: Number(row.bedrooms ?? 1),
      beds: Number(row.beds ?? 1),
      bathrooms: Number(row.bathrooms ?? 1),
      maxOccupancy: Number(row.max_occupancy ?? 1),
      furnishingType: row.furnishing_type,
      floorNumber: Number(row.floor_number ?? 0),
      areaSqm: row.area_sqm == null ? null : Number(row.area_sqm),
      smokingPolicy: row.smoking_policy,
      petsPolicy: row.pets_policy,
      guestsPolicy: row.guests_policy,
      quietHours: Boolean(row.quiet_hours),
      title: String(row.title ?? ""),
      description: String(row.description ?? ""),
      highlightTags: parseJsonStringArray(row.highlight_tags),
      cardBadges: parseNullableJsonStringArray(row.card_badges),
      listingPosterRole: row.listing_poster_role,
      contactName: String(row.contact_name ?? ""),
      contactPhone: (row.contact_phone as string | null) ?? null,
      whatsappNumber: (row.whatsapp_number as string | null) ?? null,
      contactNumbers: row.contact_numbers ?? [],
      area: String(row.area),
      landmark: (row.landmark as string | null) ?? null,
      addressLine: (row.address_line as string | null) ?? null,
      buildingName: (row.building_name as string | null) ?? null,
      primaryCampusId: (row.primary_campus_id as string | null) ?? null,
      viewCount: Number(row.view_count ?? 0),
      publishedAt: row.published_at ?? null,
      expiresAt: row.expires_at ?? null,
      boostedUntil: row.boosted_until ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      distanceMeters: Number(row.distance_meters),
      nearestCampusSlug: String(row.nearest_campus_slug),
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    }));

    return this.withPhotos(mapped);
  }

  /** @deprecated Prefer listActiveNearUniversities — kept for one-slug callers. */
  async listActiveNearUniversity(universitySlug: string) {
    return this.listActiveNearUniversities([universitySlug]);
  }

  async listByPoster(posterId: string) {
    const rows = await db
      .select(listingPublicColumns)
      .from(listingResolved)
      .where(eq(listingResolved.posterId, posterId));

    const normalized = rows.map((row) => ({
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    }));

    return this.withPhotos(normalized);
  }

  async create(posterId: string, input: CreateListingInput) {
    const id = await db.transaction(async tx => {
      await promotionLock(tx);
      return this.insertUnit(tx, posterId, input);
    });
    return id ? this.findById(id) : null;
  }

  async insertUnit(tx: PromotionWalletTransaction, posterId: string, input: CreateListingInput,
    membership: Partial<typeof listings.$inferInsert> = {}) {
    const publishNow = input.publishNow !== false;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const captions = input.photoCaptions ?? [];
    const contactNumbers = resolveContactNumbers(input);
    const phones = deriveContactPhones(contactNumbers);
    const shared = normalizedShared(input);
    let placeId = membership.placeId;
    if (!placeId) {
      const [place] = await tx.insert(places).values({
        ownerId: posterId,
        kind: input.propertyType === "dormitory" ? "building" : "apartment",
        area: input.area,
        landmark: input.landmark,
        addressLine: input.addressLine ?? null,
        buildingName: input.buildingName ?? null,
        primaryCampusId: input.primaryCampusId ?? null,
        location: sql`ST_GeogFromText(${input.locationWkt})`,
        electricity: shared.electricity,
        electricityCutsStart: shared.electricityCutsStart,
        electricityCutsEnd: shared.electricityCutsEnd,
        electricityHoursOn: shared.electricityHoursOn,
        electricityCutWindows: shared.electricityCutWindows,
        water: shared.water,
        wifiIncluded: shared.wifiIncluded,
        routerUps: shared.routerUps,
        elevator247: shared.elevator24_7,
        hasElevator: shared.hasElevator,
        hasSolar: shared.hasSolar,
        generatorAmperes: shared.generatorAmperes ?? null,
        generatorIncluded: shared.generatorIncluded,
        conciergeIncluded: shared.conciergeIncluded,
        cookingGasIncluded: shared.cookingGasIncluded,
        waterBillIncluded: shared.waterBillIncluded,
        buildingFeesIncluded: shared.buildingFeesIncluded,
        parkingIncludedInRent: shared.parkingIncludedInRent,
        amenities: input.amenities,
        smokingPolicy: shared.smokingPolicy,
        petsPolicy: shared.petsPolicy,
        guestsPolicy: shared.guestsPolicy,
        quietHours: shared.quietHours,
        targetAudience: shared.targetAudience,
      }).returning({ id: places.id });
      if (!place) return null;
      placeId = place.id;
    }

    const unitType = deriveUnitType(input.spaceType);

    const [row] = await tx
      .insert(listings)
      .values({
        ...membership,
        placeId: placeId!,
        posterId,
        unitType,
        genderRule: deriveGenderRule(input.genderRestriction),
        bedsTotal: unitType === "shared_bed" ? (membership.bedsTotal ?? input.beds) : null,
        bedsAvailable: unitType === "shared_bed" ? (membership.bedsAvailable ?? null) : null,
        inventoryNeedsConfirmation: unitType === "shared_bed"
          ? (membership.inventoryNeedsConfirmation ?? membership.bedsAvailable == null)
          : false,
        spaceType: input.spaceType,
        propertyType: input.propertyType,
        priceBasis: input.priceBasis,
        monthlyRentUsd: input.monthlyRentUsd,
        securityDepositUsd: input.securityDepositUsd,
        leaseTerm: input.leaseTerm,
        availableFrom: input.availableFrom ?? null,
        paymentModality: input.paymentModality,
        bedrooms: input.bedrooms,
        beds: input.beds,
        bathrooms: input.bathrooms,
        maxOccupancy: input.maxOccupancy,
        furnishingType: input.furnishingType,
        floorNumber: input.floorNumber,
        areaSqm: input.areaSqm ?? null,
        title: input.title,
        description: input.description,
        highlightTags: input.highlightTags,
        cardBadges: input.cardBadges ?? null,
        listingPosterRole: input.listingPosterRole,
        contactName: input.contactName,
        contactPhone: phones.contactPhone ?? input.contactPhone ?? null,
        whatsappNumber: phones.whatsappNumber ?? input.whatsappNumber ?? null,
        contactNumbers,
        status: publishNow ? "active" : "draft",
        availability: "available",
        publishedAt: publishNow ? now : null,
        expiresAt: publishNow ? expiresAt : null,
      })
      .returning({ id: listings.id });

    if (!row) {
      return null;
    }

    await tx.insert(listingPhotos).values(
      input.photoUrls.map((url, index) => ({
        listingId: row.id,
        url,
        caption: captions[index]?.trim() ? captions[index].trim() : null,
        sortOrder: index,
      })),
    );

    if (publishNow) await chargeUnit(tx,posterId,row.id,'publish','publish:'+row.id);
    return row.id;
  }

  async incrementViewCount(id: string) {
    const [row] = await db
      .update(listings)
      .set({
        viewCount: sql`${listings.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id))
      .returning({
        id: listings.id,
        viewCount: listings.viewCount,
        posterId: listings.posterId,
      });
    return row ?? null;
  }

  async contactTapCountsForPoster(posterId: string) {
    const rows = await db
      .select({
        id: listings.id,
        contactTapCount: listings.contactTapCount,
      })
      .from(listings)
      .where(eq(listings.posterId, posterId));
    return new Map(
      rows.map((row) => [row.id, Number(row.contactTapCount ?? 0)]),
    );
  }

  async findContactTap(id: string) {
    const [row] = await db
      .select({
        id: listings.id,
        status: listings.status,
        contactTapCount: listings.contactTapCount,
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      status: String(row.status),
      contactTapCount: Number(row.contactTapCount ?? 0),
    };
  }

  /** Adds one WhatsApp tap. Does not touch updatedAt, views, or expiry. */
  async incrementContactTapCount(id: string) {
    const [row] = await db
      .update(listings)
      .set({
        contactTapCount: sql`${listings.contactTapCount} + 1`,
      })
      .where(and(eq(listings.id, id), eq(listings.status, "active")))
      .returning({
        id: listings.id,
        contactTapCount: listings.contactTapCount,
      });
    if (!row) return null;
    return {
      id: row.id,
      contactTapCount: Number(row.contactTapCount ?? 0),
    };
  }

  async countActiveByPoster(posterId: string) {
    const rows = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(eq(listings.posterId, posterId), eq(listings.status, "active")),
      );
    return rows.length;
  }

  /** Top areas by active listing pin count (home discover grid). */
  async topAreasByPinCount(limit = 10) {
    const rows = await db
      .select({
        name: listingResolved.area,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(listingResolved)
      .where(
        and(eq(listingResolved.status, "active"), ne(listingResolved.availability, "rented"), sql`${listingResolved.hiddenReason} IS NULL`),
      )
      .groupBy(listingResolved.area)
      .orderBy(desc(sql`count(*)`), asc(listingResolved.area))
      .limit(limit);
    return rows.map((r) => ({
      name: String(r.name),
      count: Number(r.count ?? 0),
    }));
  }

  /**
   * Top campuses by active listings within housing radius.
   * Excludes Lebanese University (public) — same filter as public uni catalog.
   */
  async topCampusesByNearbyPins(limit = 10) {
    const result = await db.execute(sql`
      SELECT
        u.id,
        u.slug,
        u.name,
        u.city,
        u.is_main AS "isMain",
        i.short_name AS "institutionShortName",
        i.slug AS "institutionSlug",
        i.logo_url AS "logoUrl",
        COUNT(l.id)::int AS count
      FROM universities u
      LEFT JOIN institutions i ON i.id = u.institution_id
      LEFT JOIN listing_resolved l
        ON l.status = 'active'
        AND l.availability <> 'rented' AND l.hidden_reason IS NULL AND l.expires_at > now()
        AND l.location IS NOT NULL
        AND u.location IS NOT NULL
        AND ST_DWithin(l.location, u.location, ${campusHousingRadiusMeters})
      WHERE u.active = true
        AND COALESCE(LOWER(u.slug), '') NOT IN ('lu', 'lu-fanar')
        AND COALESCE(LOWER(i.slug), '') NOT IN ('lu')
        AND COALESCE(LOWER(u.name), '') NOT LIKE '%lebanese university%'
        AND COALESCE(LOWER(i.name), '') NOT LIKE '%lebanese university%'
      GROUP BY
        u.id, u.slug, u.name, u.city, u.is_main,
        i.short_name, i.slug, i.logo_url
      HAVING COUNT(l.id) > 0
      ORDER BY COUNT(l.id) DESC, u.is_main DESC, i.short_name ASC NULLS LAST, u.name ASC
      LIMIT ${limit}
    `);
    const rows = Array.isArray(result)
      ? result
      : ((result as { rows?: Record<string, unknown>[] }).rows ?? []);
    return rows.map((row) => {
      const shortName =
        row.institutionShortName != null
          ? String(row.institutionShortName)
          : null;
      const name = String(row.name);
      return {
        id: String(row.id),
        slug: String(row.slug),
        name,
        city: row.city != null ? String(row.city) : null,
        isMain: Boolean(row.isMain),
        institutionShortName: shortName,
        institutionSlug:
          row.institutionSlug != null ? String(row.institutionSlug) : null,
        logoUrl: row.logoUrl != null ? String(row.logoUrl) : null,
        displayName: shortName ? `${shortName} — ${name}` : name,
        count: Number(row.count ?? 0),
      };
    });
  }

  /**
   * Owner live edit. Does not touch status, publishedAt, expiresAt,
   * boostedUntil, viewCount, contactTapCount, or post credits.
   * Location is rewritten only inside the structural window.
   */
  async updateLive(
    id: string,
    input: UpdateListingInput,
    options: {
      writeLocation: boolean;
      audit: {
        actor: AuditActor;
        before: ListingUpdateSnapshot;
        after: ListingUpdateSnapshot;
        publishedAt: Date | string | null;
        now: Date;
      };
    },
  ) {
    const write = listingWriteFromInput(input);
    const now = options.audit.now;
    return db.transaction(async (tx) => {
      await promotionLock(tx);
      const original = await lockInventory(tx,id);
      const nextUnitType = deriveUnitType(write.spaceType);
      if(input.expectedPlaceUpdatedAt){
        const [place]=await tx.execute(sql`SELECT updated_at FROM places WHERE id=${String(original.place_id)}::uuid FOR UPDATE`);
        if(!place || new Date(String(place.updated_at)).toISOString()!==input.expectedPlaceUpdatedAt)throw new ConflictError('Shared details changed. Refresh before saving.');
      }
      if (original.unit_type === 'shared_bed' && (write.beds !== original.beds || nextUnitType !== original.unit_type)) throw new ValidationError('Change shared-bed inventory using the inventory controls');
      if (original.availability === 'rented' && nextUnitType !== original.unit_type) throw new ValidationError('Confirm vacancy before changing the unit type');
      const values=sharedSqlValues(input);
      let overrides: Record<string, unknown> = {};
      let unitAmenities: string[] = [];
      let amenityOverrides: Record<string, boolean> = {};
      if(input.differentFields){
        overrides=Object.fromEntries(Object.entries(sharedFields).filter(([key])=>input.differentFields!.includes(key)).map(([,col])=>[col,values[col]]));
        const [place]=await tx.execute(sql`SELECT amenities FROM places WHERE id=${String(original.place_id)}::uuid`);
        const custom=input.differentFields.includes('amenities');
        unitAmenities=custom?input.amenities:[];
        amenityOverrides=custom?Object.fromEntries((place!.amenities as string[]).filter(a=>!input.amenities.includes(a)).map(a=>[a,false])):{};
      }
      await tx
        .update(listings)
        .set({
          ...(input.bathroomPrivacy ? {bathroomPrivacy:input.bathroomPrivacy}:{}),
          unitType: nextUnitType,
          genderRule: deriveGenderRule(write.genderRestriction),
          bedsTotal: nextUnitType === 'shared_bed' ? (original.unit_type === 'shared_bed' ? Number(original.beds_total) : write.beds) : null,
          bedsAvailable: nextUnitType === 'shared_bed' && original.unit_type === 'shared_bed' ? Number(original.beds_available) : null,
          inventoryNeedsConfirmation: nextUnitType === 'shared_bed' ? (original.unit_type === 'shared_bed' ? Boolean(original.inventory_needs_confirmation) : true) : false,
          spaceType: write.spaceType,
          propertyType: write.propertyType,
          priceBasis: write.priceBasis,
          monthlyRentUsd: write.monthlyRentUsd,
          securityDepositUsd: write.securityDepositUsd,
          leaseTerm: write.leaseTerm,
          availableFrom: write.availableFrom,
          paymentModality: write.paymentModality,
          bedrooms: write.bedrooms,
          beds: write.beds,
          bathrooms: write.bathrooms,
          maxOccupancy: write.maxOccupancy,
          furnishingType: write.furnishingType,
          floorNumber: write.floorNumber,
          areaSqm: write.areaSqm,
          title: write.title,
          description: write.description,
          highlightTags: write.highlightTags,
          cardBadges: write.cardBadges,
          listingPosterRole: write.listingPosterRole,
          contactName: write.contactName,
          contactPhone: write.contactPhone,
          whatsappNumber: write.whatsappNumber,
          contactNumbers: write.contactNumbers,
          placeOverrides: overrides,
          unitAmenities,
          amenityOverrides,
          updatedAt: now,
        })
        .where(eq(listings.id, id));

      if(!input.differentFields){
        const shared=normalizedShared(input);
        await tx.update(places).set({
          area:write.area, landmark:write.landmark, addressLine:write.addressLine,
          buildingName:write.buildingName, primaryCampusId:write.primaryCampusId,
          ...(options.writeLocation?{location:sql`ST_GeogFromText(${write.locationWkt})`}:{}),
          electricity:shared.electricity, electricityCutsStart:shared.electricityCutsStart,
          electricityCutsEnd:shared.electricityCutsEnd, electricityHoursOn:shared.electricityHoursOn,
          electricityCutWindows:shared.electricityCutWindows, water:shared.water,
          wifiIncluded:shared.wifiIncluded, routerUps:shared.routerUps, elevator247:shared.elevator24_7,
          hasElevator:shared.hasElevator, hasSolar:shared.hasSolar,
          generatorAmperes:shared.generatorAmperes, generatorIncluded:shared.generatorIncluded,
          conciergeIncluded:shared.conciergeIncluded, cookingGasIncluded:shared.cookingGasIncluded,
          waterBillIncluded:shared.waterBillIncluded, buildingFeesIncluded:shared.buildingFeesIncluded,
          parkingIncludedInRent:shared.parkingIncludedInRent, amenities:input.amenities,
          smokingPolicy:shared.smokingPolicy, petsPolicy:shared.petsPolicy,
          guestsPolicy:shared.guestsPolicy, quietHours:shared.quietHours,
          targetAudience:shared.targetAudience, updatedAt:now,
        }).where(eq(places.id,String(original.place_id)));
      }
      await tx.delete(listingPhotos).where(eq(listingPhotos.listingId, id));
      if (write.photos.length > 0) {
        await tx.insert(listingPhotos).values(
          write.photos.map((photo, index) => ({
            listingId: id,
            url: photo.url,
            caption: photo.caption,
            sortOrder: index,
          })),
        );
      }

      await recordListingUpdateAudit(
        {
          actor: options.audit.actor,
          listingId: id,
          channel: "host_patch",
          publishedAt: options.audit.publishedAt,
          before: options.audit.before,
          after: options.audit.after,
          now,
        },
        tx,
      );

      const current = await lockInventory(tx,id);
      await settlePlaceInventory(tx,String(current.place_id));
      return id;
    });
  }

  async archiveById(id: string, posterId: string) {
    return db.transaction(async tx => {
      await promotionLock(tx);
      const [row] = await tx.update(listings).set({status:'archived',updatedAt:new Date()}).where(and(eq(listings.id,id),eq(listings.posterId,posterId),eq(listings.status,'active'))).returning({id:listings.id});
      if(row) await stopListingPromotions(tx,id,'listing_archived');
      return row ?? null;
    });
  }
  async deleteByOwner(id: string, posterId: string) {
    return db.transaction(async tx => {
      await promotionLock(tx);
      const [row] = await tx.select({id:listings.id}).from(listings).where(and(eq(listings.id,id),eq(listings.posterId,posterId),eq(listings.status,'active'))).for('update');
      if(!row) return null;
      const occupied = await tx.execute(sql`SELECT id FROM listings WHERE id=${id}::uuid AND (unit_occupied(listings) OR inventory_needs_confirmation)`);
      if (occupied.length) throw new ValidationError('Confirm vacancy before deleting this unit, or archive it to keep its inventory');
      await stopListingPromotions(tx,id,'listing_deleted');
      await tx.delete(listings).where(eq(listings.id,id));
      return row;
    });
  }
  async archiveExpired() {
    return db.transaction(async tx => {
      await promotionLock(tx);
      const rows = await tx.update(listings).set({status:'archived',updatedAt:new Date()}).where(and(eq(listings.status,'active'),sql`${listings.expiresAt} <= now()`)).returning({id:listings.id,expiresAt:listings.expiresAt});
      for(const row of rows) await stopListingPromotions(tx,row.id,'listing_expired',row.expiresAt ?? new Date());
      return rows;
    });
  }
  async adminSetStatus(id: string, next: 'archived'|'removed'|'active') {
    return db.transaction(async tx => {
      await promotionLock(tx);
      const existing = await lockInventory(tx,id);
      if(!existing) return null;
      if(next==='archived' && existing.status!=='active') return null;
      if(next==='removed' && existing.status==='removed') return existing;
      if(next==='removed' && existing.status==='draft') return null;
      if(next==='active' && existing.status!=='archived') return null;
      const [row]=await tx.update(listings).set({status:next,updatedAt:new Date()}).where(eq(listings.id,id)).returning({id:listings.id,status:listings.status});
      if(next!=='active') await stopListingPromotions(tx,id,`listing_${next}`);
      return row ?? null;
    });
  }
  async setAvailability(id:string,posterId:string,availability:'available'|'pending'|'rented') {
    return db.transaction(async tx => {
      await promotionLock(tx);
      const unit = await lockInventory(tx,id,posterId);
      return changeUnitInventory(tx,id,{expectedVersion:Number(unit.inventory_version),availability},posterId);
    });
  }
  async adminRemoveActiveByPoster(posterId:string) {
    return db.transaction(async tx => {
      await promotionLock(tx);
      const rows=await tx.update(listings).set({status:'removed',updatedAt:new Date()}).where(and(eq(listings.posterId,posterId),eq(listings.status,'active'))).returning({id:listings.id});
      for(const row of rows) await stopListingPromotions(tx,row.id,'account_removed');
      return rows;
    });
  }
}
export const listingsRepository = new ListingsRepository();
