import "dotenv/config";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { loadEnv } from "../../config/env.js";
import {
  hoursWithPowerFromWindows,
  resolveCutWindows,
} from "../../lib/electricityCuts.js";
import { deriveContactPhones } from "../../lib/lebanonPhone.js";
import { deriveListingType } from "../../modules/listings/deriveListingType.js";
import { db } from "../index.js";
import { listingPhotos, listings, universities, users } from "../schema/index.js";
import { listingSeeds } from "./listings.js";

const SEED_POSTER_PHONE = "+96170000001";
const env = loadEnv();

const uploadsRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR);
const photosDir = path.join(uploadsRoot, "listings");

function publicUrl(filename: string): string {
  const base = (env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`).replace(
    /\/$/,
    "",
  );
  return `${base}/uploads/listings/${filename}`;
}

async function downloadPhoto(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    headers: {
      // Unsplash is friendlier with a real UA.
      "User-Agent": "SkounSeedBot/1.0",
      Accept: "image/*",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to download ${sourceUrl}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "";
  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("webp")
      ? ".webp"
      : ".jpg";
  const filename = `${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(photosDir, filename), buf);
  return publicUrl(filename);
}

async function ensurePoster(): Promise<string> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.phone, SEED_POSTER_PHONE))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({
      phone: SEED_POSTER_PHONE,
      role: "poster",
      postCredits: 99,
      boostCredits: 10,
      freeCreditClaimed: true,
    })
    .returning({ id: users.id });

  if (!created) throw new Error("Failed to create seed poster");
  return created.id;
}

async function campusIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: universities.id })
    .from(universities)
    .where(eq(universities.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

async function clearListings() {
  // Cascade removes listing_photos + saved_listings.
  await db.delete(listings);
  fs.mkdirSync(photosDir, { recursive: true });
  for (const name of fs.readdirSync(photosDir)) {
    fs.unlinkSync(path.join(photosDir, name));
  }
  console.log("Cleared all listings and local listing photos");
}

async function main() {
  fs.mkdirSync(photosDir, { recursive: true });
  await clearListings();

  const posterId = await ensurePoster();
  console.log(`Using seed poster ${SEED_POSTER_PHONE} (${posterId})`);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let created = 0;
  for (const seed of listingSeeds) {
    const photoUrls: string[] = [];
    for (const source of seed.photoSources) {
      const url = await downloadPhoto(source);
      photoUrls.push(url);
      process.stdout.write(".");
    }

    const listingType = deriveListingType(seed.spaceType, seed.propertyType);
    const cutWindows = resolveCutWindows({
      electricity: seed.electricity,
      electricityCutWindows: seed.electricityCutWindows,
    });
    const firstCut = cutWindows[0];
    const hoursOn = hoursWithPowerFromWindows(cutWindows);
    const phones = deriveContactPhones(seed.contactNumbers);
    const primaryCampusId = await campusIdBySlug(seed.campusSlug);
    if (!primaryCampusId) {
      console.warn(
        `\nWarning: campus slug "${seed.campusSlug}" not found — seeding without primaryCampusId`,
      );
    }

    const [row] = await db
      .insert(listings)
      .values({
        posterId,
        status: "active",
        listingType,
        spaceType: seed.spaceType,
        propertyType: seed.propertyType,
        priceBasis: seed.priceBasis,
        targetAudience: seed.targetAudience,
        genderRestriction: seed.genderRestriction,
        monthlyRentUsd: seed.monthlyRentUsd,
        securityDepositUsd: seed.securityDepositUsd,
        leaseTerm: seed.leaseTerm,
        availableFrom: seed.availableFrom,
        paymentModality: seed.paymentModality,
        electricity: seed.electricity,
        electricityCutsStart: firstCut?.start ?? null,
        electricityCutsEnd: firstCut?.end ?? null,
        electricityHoursOn: hoursOn,
        electricityCutWindows: cutWindows,
        water: seed.water,
        wifiIncluded: seed.wifiIncluded,
        routerUps: seed.routerUps,
        elevator24_7: seed.elevator24_7,
        hasElevator: seed.hasElevator,
        hasSolar: seed.hasSolar,
        generatorAmperes: seed.generatorAmperes,
        generatorIncluded: seed.generatorIncluded,
        conciergeIncluded: seed.conciergeIncluded,
        cookingGasIncluded: seed.cookingGasIncluded,
        amenities: seed.amenities,
        bedrooms: seed.bedrooms,
        beds: seed.beds,
        bathrooms: seed.bathrooms,
        maxOccupancy: seed.maxOccupancy,
        furnishingType: seed.furnishingType,
        floorNumber: seed.floorNumber,
        areaSqm: seed.areaSqm,
        smokingPolicy: seed.smokingPolicy,
        petsPolicy: seed.petsPolicy,
        guestsPolicy: seed.guestsPolicy,
        quietHours: seed.quietHours,
        title: seed.title,
        description: seed.description,
        highlightTags: seed.highlightTags,
        listingPosterRole: seed.listingPosterRole,
        contactName: seed.contactName,
        contactPhone: phones.contactPhone,
        whatsappNumber: phones.whatsappNumber,
        contactNumbers: seed.contactNumbers,
        area: seed.area,
        landmark: seed.landmark,
        addressLine: seed.addressLine,
        buildingName: seed.buildingName,
        primaryCampusId,
        location: sql`ST_GeogFromText(${seed.location})`,
        publishedAt: now,
        expiresAt,
        viewCount: Math.floor(Math.random() * 40),
      })
      .returning({ id: listings.id });

    if (!row) throw new Error(`Failed to insert listing in ${seed.area}`);

    await db.insert(listingPhotos).values(
      photoUrls.map((url, index) => ({
        listingId: row.id,
        url,
        caption: seed.photoCaptions[index]?.trim() || null,
        sortOrder: index,
      })),
    );
    created += 1;
  }

  console.log(`\nSeeded ${created} listings with full upload fields + tags`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
