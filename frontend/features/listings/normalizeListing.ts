import { coerceCutWindows, formatWindowsSummary } from "@/lib/electricityCuts";

function normalizePhotos(row: Record<string, unknown>): ListingPhoto[] {
  const raw = row.photos;
  if (!Array.isArray(raw)) return [];

  const photos: ListingPhoto[] = [];
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") continue;
    const photo = item as Record<string, unknown>;
    const url = String(photo.url ?? "");
    if (!url) continue;
    const listingIdRaw = photo.listingId ?? photo.listing_id;
    photos.push({
      id: String(photo.id ?? `photo-${index}`),
      url,
      sortOrder: Number(photo.sortOrder ?? photo.sort_order ?? index),
      caption:
        typeof photo.caption === "string" ? photo.caption : undefined,
      ...(listingIdRaw != null ? { listingId: String(listingIdRaw) } : {}),
    });
  }
  return photos.sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Maps API rows (camelCase or snake_case / PostGIS) into Listing. */
export function normalizeListing(row: Record<string, unknown>): Listing {
  const distance =
    row.distanceMeters ?? row.distance_meters ?? row.distanceMeters;
  const nearestRaw =
    row.nearestCampusSlug ?? row.nearest_campus_slug ?? undefined;
  const photos = normalizePhotos(row);
  const coverUrl =
    (typeof row.coverUrl === "string" && row.coverUrl) ||
    (typeof row.cover_url === "string" && row.cover_url) ||
    photos[0]?.url ||
    null;

  const nearestCampusSlug =
    nearestRaw == null || nearestRaw === ""
      ? undefined
      : String(nearestRaw);

  const apiRating = parseOptionalNumber(row.rating);
  const apiReviews = parseOptionalNumber(
    row.reviewCount ?? row.review_count,
  );
  const demo =
    apiRating == null && apiReviews == null
      ? demoListingRating(String(row.id))
      : null;

  const rating = apiRating ?? demo?.rating ?? null;
  const reviewCount =
    apiReviews != null
      ? Math.max(0, Math.floor(apiReviews))
      : (demo?.reviewCount ?? 0);

  const listingType = (row.listingType ??
    row.listing_type) as Listing["listingType"];
  const isPbsa = Boolean(
    row.isPbsa ?? row.is_pbsa ?? listingType === "pbsa_building"
  );

  const electricity = (row.electricity as Listing["electricity"]) || "solar";
  const water = (row.water as Listing["water"]) || "state_well_24_7";
  const wifiIncluded = Boolean(row.wifiIncluded ?? row.wifi_included ?? true);
  const routerUps = Boolean(row.routerUps ?? row.router_ups ?? true);

  const electricityCutsStart =
    (row.electricityCutsStart as string | null | undefined) ??
    (row.electricity_cuts_start as string | null | undefined) ??
    null;
  const electricityCutsEnd =
    (row.electricityCutsEnd as string | null | undefined) ??
    (row.electricity_cuts_end as string | null | undefined) ??
    null;
  const electricityHoursOn =
    row.electricityHoursOn != null || row.electricity_hours_on != null
      ? Number(row.electricityHoursOn ?? row.electricity_hours_on)
      : null;
  const electricityCutWindows = coerceCutWindows(
    row.electricityCutWindows ?? row.electricity_cut_windows,
    electricityCutsStart,
    electricityCutsEnd,
  );
  const firstWindow = electricityCutWindows[0];
  const cutsStart = firstWindow?.start ?? electricityCutsStart;
  const cutsEnd = firstWindow?.end ?? electricityCutsEnd;

  const cutBits = [
    formatWindowsSummary(electricityCutWindows),
    electricityHoursOn != null ? `${electricityHoursOn}/24 hours with power` : null,
  ].filter(Boolean);
  const scheduledSpecs = cutBits.join(" · ");

  const infrastructure = {
    electricity: {
      status: electricity,
      ampLimit: Number(row.ampLimit ?? row.amp_limit ?? (electricity === "solar" ? 15 : 10)),
      solarBackup: electricity === "solar" || Boolean(row.solarBackup ?? row.solar_backup),
      generatorSpecs: String(
        row.generatorSpecs ??
          row.generator_specs ??
          (electricity === "scheduled_cuts"
            ? scheduledSpecs || "Scheduled EDL cuts"
            : electricity === "solar"
              ? "24/7 Solar + Automatic Generator Switch"
              : "24/7 Dedicated Building Generator (10 Amp Max)"),
      ),
      cutsStart,
      cutsEnd,
      hoursOn: electricityHoursOn,
      windows: electricityCutWindows,
    },
    water: {
      status: water,
      hasPumpUps: Boolean(row.hasPumpUps ?? row.has_pump_ups ?? true),
      tankCapacityLiters: Number(row.tankCapacityLiters ?? row.tank_capacity_liters ?? 2000),
      notes: String(row.waterNotes ?? row.water_notes ?? "24/7 Water Supply via Artesian Well + Roof Tank UPS Pump"),
    },
    internet: {
      wifiIncluded,
      hasFiber: Boolean(row.hasFiber ?? row.has_fiber ?? true),
      speedMbps: Number(row.speedMbps ?? row.speed_mbps ?? 100),
      routerUps,
      routerUpsHours: Number(row.routerUpsHours ?? row.router_ups_hours ?? 8),
    },
  };

  const pbsaBuildingName = (row.pbsaBuildingName ?? row.pbsa_building_name)
    ? String(row.pbsaBuildingName ?? row.pbsa_building_name)
    : isPbsa
    ? `${String(row.area ?? "Beirut")} Student Residence`
    : undefined;

  const rawRoomTypes = row.pbsaRoomTypes ?? row.pbsa_room_types;
  const pbsaRoomTypes = Array.isArray(rawRoomTypes)
    ? (rawRoomTypes as PbsaRoomType[])
    : isPbsa
    ? generateDemoPbsaRooms(photos, Number(row.monthlyRentUsd ?? row.monthly_rent_usd ?? 350))
    : undefined;

  const unitSpecs = isPbsa
    ? undefined
    : {
        floorLevel:
          row.floorNumber != null || row.floor_number != null
            ? String(row.floorNumber ?? row.floor_number)
            : (row.floorLevel ?? row.floor_level)
              ? String(row.floorLevel ?? row.floor_level)
              : undefined,
        roomCategory: (row.roomCategory ??
          row.room_category ??
          (listingType === "private_room"
            ? "private_room"
            : "entire_apartment")) as StandardUnitSpecs["roomCategory"],
        roommateDetails: {
          count: Number(
            row.maxOccupancy ??
              row.max_occupancy ??
              row.roommateCount ??
              row.roommate_count ??
              1,
          ),
          genders: String(
            row.roommateGenders ?? row.roommate_genders ?? "",
          ),
          occupations: String(
            row.roommateOccupations ?? row.roommate_occupations ?? "",
          ),
        },
        depositUsd: Number(
          row.securityDepositUsd ??
            row.security_deposit_usd ??
            row.depositUsd ??
            row.deposit_usd ??
            0,
        ),
        minContractMonths: Number(
          row.minContractMonths ?? row.min_contract_months ?? 0,
        ),
      };

  const smoking = String(row.smokingPolicy ?? row.smoking_policy ?? "");
  const pets = String(row.petsPolicy ?? row.pets_policy ?? "");
  const guests = String(row.guestsPolicy ?? row.guests_policy ?? "");
  const quiet = Boolean(row.quietHours ?? row.quiet_hours);
  const derivedRules: string[] = [];
  if (smoking) derivedRules.push(`Smoking: ${smoking.split("_").join(" ")}`);
  if (pets) derivedRules.push(`Pets: ${pets.split("_").join(" ")}`);
  if (guests) derivedRules.push(`Overnight guests: ${guests.split("_").join(" ")}`);
  if (quiet) derivedRules.push("Quiet study hours enforced");

  const rawAmenities = Array.isArray(row.amenities)
    ? (row.amenities as string[])
    : [];

  return {
    id: String(row.id),
    posterId: String(row.posterId ?? row.poster_id),
    status: (row.status as Listing["status"]) ?? "active",
    listingType,
    spaceType: (row.spaceType ?? row.space_type) as Listing["spaceType"],
    propertyType: (row.propertyType ??
      row.property_type) as Listing["propertyType"],
    priceBasis: (row.priceBasis ?? row.price_basis) as Listing["priceBasis"],
    targetAudience: (row.targetAudience ??
      row.target_audience) as Listing["targetAudience"],
    genderRestriction: ((row.genderRestriction ??
      row.gender_restriction) as Listing["genderRestriction"]) ?? "anyone",
    monthlyRentUsd: Number(row.monthlyRentUsd ?? row.monthly_rent_usd),
    securityDepositUsd: Number(
      row.securityDepositUsd ?? row.security_deposit_usd ?? 0,
    ),
    leaseTerm: (row.leaseTerm ?? row.lease_term) as Listing["leaseTerm"],
    availableFrom: (row.availableFrom ?? row.available_from ?? null) as
      | string
      | null,
    paymentModality: (row.paymentModality ??
      row.payment_modality) as Listing["paymentModality"],
    electricity,
    electricityCutsStart: cutsStart,
    electricityCutsEnd: cutsEnd,
    electricityHoursOn,
    electricityCutWindows,
    water,
    wifiIncluded,
    routerUps,
    elevator24_7: Boolean(row.elevator24_7 ?? row.elevator_24_7),
    hasElevator: Boolean(row.hasElevator ?? row.has_elevator),
    hasSolar: Boolean(row.hasSolar ?? row.has_solar),
    generatorAmperes:
      row.generatorAmperes != null || row.generator_amperes != null
        ? Number(row.generatorAmperes ?? row.generator_amperes)
        : null,
    generatorIncluded: Boolean(
      row.generatorIncluded ?? row.generator_included,
    ),
    conciergeIncluded: Boolean(
      row.conciergeIncluded ?? row.concierge_included,
    ),
    cookingGasIncluded: Boolean(
      row.cookingGasIncluded ?? row.cooking_gas_included,
    ),
    bedrooms: Number(row.bedrooms ?? 0),
    beds: Number(row.beds ?? 0),
    bathrooms: Number(row.bathrooms ?? 0),
    maxOccupancy: Number(row.maxOccupancy ?? row.max_occupancy ?? 0),
    furnishingType: (row.furnishingType ??
      row.furnishing_type) as Listing["furnishingType"],
    floorNumber: Number(row.floorNumber ?? row.floor_number ?? 0),
    areaSqm:
      row.areaSqm != null || row.area_sqm != null
        ? Number(row.areaSqm ?? row.area_sqm)
        : null,
    smokingPolicy: (row.smokingPolicy ??
      row.smoking_policy) as Listing["smokingPolicy"],
    petsPolicy: (row.petsPolicy ?? row.pets_policy) as Listing["petsPolicy"],
    guestsPolicy: (row.guestsPolicy ??
      row.guests_policy) as Listing["guestsPolicy"],
    quietHours: quiet,
    title: (row.title as string) || null,
    highlightTags: Array.isArray(row.highlightTags ?? row.highlight_tags)
      ? ((row.highlightTags ?? row.highlight_tags) as string[])
      : [],
    listingPosterRole: (row.listingPosterRole ??
      row.listing_poster_role) as Listing["listingPosterRole"],
    contactName: (row.contactName ?? row.contact_name ?? null) as string | null,
    contactPhone: (row.contactPhone ?? row.contact_phone ?? null) as
      | string
      | null,
    whatsappNumber: (row.whatsappNumber ?? row.whatsapp_number ?? null) as
      | string
      | null,
    contactNumbers: Array.isArray(row.contactNumbers ?? row.contact_numbers)
      ? ((row.contactNumbers ?? row.contact_numbers) as Listing["contactNumbers"])
      : [],
    addressLine: (row.addressLine ?? row.address_line ?? null) as string | null,
    buildingName: (row.buildingName ?? row.building_name ?? null) as
      | string
      | null,
    primaryCampusId: (row.primaryCampusId ??
      row.primary_campus_id ??
      null) as string | null,
    area: String(row.area ?? ""),
    landmark: (row.landmark as string | null) ?? null,
    lng: parseCoord(row.lng),
    lat: parseCoord(row.lat),
    viewCount: Number(row.viewCount ?? row.view_count ?? 0),
    rating,
    reviewCount,
    publishedAt: (row.publishedAt ?? row.published_at ?? null) as string | null,
    expiresAt: (row.expiresAt ?? row.expires_at ?? null) as string | null,
    boostedUntil: (row.boostedUntil ??
      row.boosted_until ??
      null) as string | null,
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ""),
    distanceMeters:
      distance == null || distance === ""
        ? undefined
        : Number(distance),
    nearestCampusSlug,
    photos,
    coverUrl,
    isPbsa,
    pbsaBuildingName,
    pbsaRoomTypes,
    infrastructure,
    unitSpecs,
    description: (row.description as string) || undefined,
    amenities: rawAmenities,
    houseRules:
      Array.isArray(row.houseRules) && (row.houseRules as string[]).length > 0
        ? (row.houseRules as string[])
        : derivedRules,
    cancellationPolicy: (row.cancellationPolicy as string) || undefined,
  };
}

function generateDemoPbsaRooms(basePhotos: ListingPhoto[], basePrice: number): PbsaRoomType[] {
  const p1 = basePhotos.slice(0, 3);
  const p2 = basePhotos.slice(1, 4);
  const p3 = basePhotos.length > 2 ? basePhotos.slice(2) : basePhotos;

  return [
    {
      id: "room-studio-plus",
      name: "Deluxe Studio (Private Kitchen & Bath)",
      category: "studio",
      monthlyRentUsd: basePrice,
      availableFrom: "Available Sep 1, 2026",
      sizeSqm: 26,
      floor: "2nd - 5th Floor",
      description: "Fully furnished private studio with dedicated study desk, kitchenette, AC, and en-suite bathroom.",
      features: ["Private Kitchen", "En-suite Bathroom", "Study Desk", "Balcony", "AC 24/7"],
      photos: p1.length > 0 ? p1 : basePhotos,
      isAvailable: true,
    },
    {
      id: "room-ensuite-single",
      name: "Single En-Suite Room",
      category: "ensuite",
      monthlyRentUsd: Math.max(150, Math.round(basePrice * 0.8)),
      availableFrom: "Available Immediately",
      sizeSqm: 18,
      floor: "1st - 4th Floor",
      description: "Private bedroom with personal attached bathroom. Shared gourmet kitchen and lounge per floor.",
      features: ["En-suite Bathroom", "Shared Kitchen", "Study Desk", "UPS WiFi"],
      photos: p2.length > 0 ? p2 : basePhotos,
      isAvailable: true,
    },
    {
      id: "room-twin-shared",
      name: "Shared Twin Student Room",
      category: "shared_room",
      monthlyRentUsd: Math.max(120, Math.round(basePrice * 0.6)),
      availableFrom: "Available Sep 1, 2026",
      sizeSqm: 22,
      floor: "1st - 3rd Floor",
      description: "Shared room for two students. Includes twin single beds, two wardrobes, two study desks, and private bathroom.",
      features: ["2x Study Desks", "En-suite Bathroom", "Shared Lounge", "Weekly Housekeeping"],
      photos: p3.length > 0 ? p3 : basePhotos,
      isAvailable: true,
    },
  ];
}

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Temporary demo ratings until reviews exist in the API.
 * ~⅔ of listings get a score so Amber pills are visible in browse.
 */
function demoListingRating(
  id: string,
): { rating: number; reviewCount: number } | null {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  if (h % 3 === 0) return null;
  const rating = Math.round((3.6 + (h % 14) / 10) * 10) / 10;
  const reviewCount = 1 + (h % 18);
  return { rating, reviewCount };
}

export function normalizeListingsPayload(data: unknown): Listing[] {
  if (Array.isArray(data)) {
    return data.map((row) =>
      normalizeListing(row as Record<string, unknown>),
    );
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { rows?: unknown }).rows)
  ) {
    return ((data as { rows: Record<string, unknown>[] }).rows).map(
      normalizeListing,
    );
  }
  return [];
}

export function normalizeCampusMeta(raw: unknown): CampusMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const lng = parseCoord(row.lng);
  const lat = parseCoord(row.lat);
  const slug = String(row.slug ?? "");
  const name = String(row.name ?? "");
  const mapLabel =
    typeof row.mapLabel === "string" && row.mapLabel.trim()
      ? row.mapLabel.trim()
      : undefined;
  if (!slug || lng == null || lat == null) return null;
  return { slug, name, mapLabel, lng, lat };
}

function normalizeCampuses(raw: unknown): CampusMeta[] {
  if (!Array.isArray(raw)) return [];
  const out: CampusMeta[] = [];
  for (const item of raw) {
    const meta = normalizeCampusMeta(item);
    if (meta) out.push(meta);
  }
  return out;
}

/**
 * Parse list envelope. Prefers `campuses`; dual-reads legacy `campus`
 * until the client is fully cut over.
 */
export function normalizeListingsEnvelope(payload: unknown): {
  listings: Listing[];
  campuses: CampusMeta[];
} {
  if (!payload || typeof payload !== "object") {
    return { listings: [], campuses: [] };
  }
  const body = payload as {
    data?: unknown;
    campuses?: unknown;
    campus?: unknown;
  };

  let campuses = normalizeCampuses(body.campuses);
  if (campuses.length === 0 && body.campus != null) {
    const legacy = normalizeCampusMeta(body.campus);
    if (legacy) campuses = [legacy];
  }

  const nameBySlug = new Map(campuses.map((c) => [c.slug, c.name]));
  const listings = normalizeListingsPayload(body.data).map((listing) => {
    if (!listing.nearestCampusSlug) return listing;
    const name = nameBySlug.get(listing.nearestCampusSlug);
    return name ? { ...listing, nearestCampusName: name } : listing;
  });

  return { listings, campuses };
}
