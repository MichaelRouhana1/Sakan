// Creates, migrates, and drops a uniquely named disposable loopback database.
import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import postgres from "postgres";
import { exposeCurrentRuntimeView } from "./current-runtime-view.mjs";

const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error("Loopback DATABASE_URL required");
}
const dbName = "studently_similar_test_" + randomUUID().replaceAll("-", "");
const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
let client;
let server;
let passed = 0;

const check = async (name, fn) => {
  await fn();
  passed++;
  console.log("PASS " + name);
};

try {
  await admin.unsafe(`CREATE DATABASE "${dbName}"`);
  url.pathname = "/" + dbName;
  process.env.DATABASE_URL = url.toString();
  client = postgres(url.toString(), { max: 1, onnotice: () => {} });

  await client.unsafe(
    "CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)",
  );
  const journal = JSON.parse(
    await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
  );
  for (const entry of journal.entries.filter((entry) => entry.idx < 38)) {
    const body = await readFile(
      new URL("../drizzle/" + entry.tag + ".sql", import.meta.url),
      "utf8",
    );
    for (const part of body.split("--> statement-breakpoint")) {
      await client.unsafe(part);
    }
    await client`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${createHash("sha256").update(body).digest("hex")},${entry.when})`;
  }
  await exposeCurrentRuntimeView(client);

  const { createApp } = await import("../dist/app.js");
  const app = createApp();
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const getJson = async (path) => {
    const res = await fetch(`${baseUrl}${path}`);
    const body = await res.json();
    return { status: res.status, body };
  };

  const [owner] = await client`INSERT INTO users(role,post_credits) VALUES ('poster',100) RETURNING id`;
  const [campus] = await client`INSERT INTO universities(name,slug,active,location) VALUES ('AUB','aub',true,ST_GeogFromText('POINT(35.4835 33.8975)')) RETURNING id`;

  const makePlace = async ({
    area,
    city = "Beirut",
    lng = 35.4835,
    lat = 33.8975,
    primaryCampusId = null,
    hidden = false,
  }) => {
    const [p] = await client`
      INSERT INTO places(owner_id,area,city,location,primary_campus_id,hidden,electricity,water,wifi_included)
      VALUES (${owner.id},${area},${city},ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography,${primaryCampusId},${hidden},'solar','state_well_24_7',true)
      RETURNING id`;
    return p.id;
  };

  const makeUnit = async ({
    placeId,
    title,
    rent = 450,
    unitType = "private_room",
    spaceType = "private_room",
    propertyType = "apartment",
    genderRule = "any",
    status = "active",
    availability = "available",
    hidden = false,
    expiresInDays = 30,
    photos = 3,
    bedsTotal = null,
    bedsAvailable = null,
    inventoryNeedsConfirmation = false,
  }) => {
    const [row] = await client`
      INSERT INTO listings(
        poster_id,place_id,unit_type,gender_rule,space_type,property_type,
        status,availability,hidden,monthly_rent_usd,title,
        beds_total,beds_available,inventory_needs_confirmation,
        published_at,expires_at
      ) VALUES (
        ${owner.id},${placeId},${unitType},${genderRule},${spaceType},${propertyType},
        ${status},${availability},${hidden},${rent},${title},
        ${bedsTotal},${bedsAvailable},${inventoryNeedsConfirmation},
        now(),now()+${`${expiresInDays} days`}::interval
      ) RETURNING id`;
    for (let i = 0; i < photos; i++) {
      await client`INSERT INTO listing_photos(listing_id,url,sort_order) VALUES (${row.id},${`/uploads/${row.id}-${i}.jpg`},${i})`;
    }
    return row.id;
  };

  // Source listing in Hamra, girls_only, $450 private room near AUB
  const srcPlace = await makePlace({ area: "Hamra", city: "Beirut", lng: 35.4835, lat: 33.8975, primaryCampusId: campus.id });
  const srcId = await makeUnit({ placeId: srcPlace, title: "Source Hamra room", rent: 450, genderRule: "female_only" });
  // Same-place sibling (MUST be excluded)
  const siblingId = await makeUnit({ placeId: srcPlace, title: "Same building sibling", rent: 450, genderRule: "female_only" });

  // Place 1 (Hamra, 2 units — only best unit should appear)
  const p1 = await makePlace({ area: "Hamra", city: "Beirut", lng: 35.4840, lat: 33.8978, primaryCampusId: campus.id });
  const p1Best = await makeUnit({ placeId: p1, title: "Hamra ideal match", rent: 445, genderRule: "female_only" });
  const p1Worse = await makeUnit({ placeId: p1, title: "Hamra expensive whole apt", rent: 1200, unitType: "whole_apartment", spaceType: "entire_place", genderRule: "female_only" });

  // Place 2 (Boys-only in Hamra — MUST be excluded by gender safety)
  const pBoys = await makePlace({ area: "Hamra", city: "Beirut", lng: 35.4838, lat: 33.8976 });
  const boysId = await makeUnit({ placeId: pBoys, title: "Boys only dorm", rent: 450, genderRule: "male_only" });

  // Place 3 (Verdun, 1.5km away, similar price)
  const p2 = await makePlace({ area: "Verdun", city: "Beirut", lng: 35.4850, lat: 33.8840 });
  const verdunId = await makeUnit({ placeId: p2, title: "Verdun private room", rent: 460 });

  // Place 4 (Ras Beirut, same campus)
  const p3 = await makePlace({ area: "Ras Beirut", city: "Beirut", lng: 35.4750, lat: 33.8990, primaryCampusId: campus.id });
  const rasBeirutId = await makeUnit({ placeId: p3, title: "Ras Beirut room", rent: 480 });

  // Place 5 (Achrafieh, ~3.8km away — inside 5km local pool)
  const p4 = await makePlace({ area: "Achrafieh", city: "Beirut", lng: 35.5200, lat: 33.8880 });
  const achrafiehId = await makeUnit({ placeId: p4, title: "Achrafieh room", rent: 500 });

  // Place 6 (Rented & hidden & expired & 0-bed — MUST be excluded from both similar & batch)
  const pRented = await makePlace({ area: "Hamra", city: "Beirut", lng: 35.4836, lat: 33.8975 });
  const rentedId = await makeUnit({ placeId: pRented, title: "Rented room", availability: "rented" });
  const pHidden = await makePlace({ area: "Hamra", city: "Beirut", lng: 35.4836, lat: 33.8975, hidden: true });
  const hiddenId = await makeUnit({ placeId: pHidden, title: "Hidden place room" });
  const pExpired = await makePlace({ area: "Hamra", city: "Beirut", lng: 35.4836, lat: 33.8975 });
  const expiredId = await makeUnit({ placeId: pExpired, title: "Expired room", expiresInDays: -2 });
  const pZeroBeds = await makePlace({ area: "Hamra", city: "Beirut", lng: 35.4836, lat: 33.8975 });
  const zeroBedsId = await makeUnit({ placeId: pZeroBeds, title: "Full shared room", unitType: "shared_bed", spaceType: "shared_room", bedsTotal: 2, bedsAvailable: 0 });

  // Place 7 (Byblos — far nationwide listing, should NOT enter Tier 1 when >= 4 local places exist)
  const pByblos = await makePlace({ area: "Byblos", city: "Byblos", lng: 35.6510, lat: 34.1230 });
  const byblosId = await makeUnit({ placeId: pByblos, title: "Byblos far listing", rent: 450 });

  await check("GET /api/listings/:id/similar filters hard exclusions, dedupes per place, stays local at >=4 places, returns similarityReason", async () => {
    const { status, body } = await getJson(`/api/listings/${srcId}/similar`);
    assert.equal(status, 200);
    const ids = body.data.map((r) => r.id);
    assert.equal(ids.length, 4);
    assert.equal(ids[0], p1Best);
    assert.ok(!ids.includes(srcId), "must exclude self");
    assert.ok(!ids.includes(siblingId), "must exclude same place sibling");
    assert.ok(!ids.includes(p1Worse), "must keep only 1 best unit per place");
    assert.ok(!ids.includes(boysId), "must exclude opposite gender");
    assert.ok(!ids.includes(rentedId), "must exclude rented");
    assert.ok(!ids.includes(hiddenId), "must exclude hidden place");
    assert.ok(!ids.includes(expiredId), "must exclude expired");
    assert.ok(!ids.includes(zeroBedsId), "must exclude 0-bed shared room");
    assert.ok(!ids.includes(byblosId), "must stay in local pool when >= 4 local places exist");

    assert.deepEqual(new Set(ids), new Set([p1Best, verdunId, rasBeirutId, achrafiehId]));
    assert.equal(body.data[0].similarityReason, "Same area");
    assert.equal(body.data[0].distanceMeters, undefined, "must not pollute campus distanceMeters");
    assert.equal(body.data[0].photos.length, 3);
  });

  await check("GET /api/listings/:id/similar widens to nationwide when local + city have < 4 places", async () => {
    const { status, body } = await getJson(`/api/listings/${byblosId}/similar`);
    assert.equal(status, 200);
    assert.ok(body.data.length >= 4, "widens nationwide when Byblos has 0 other local places");
    assert.ok(body.data.every((r) => typeof r.similarityReason === "string" && r.similarityReason.length > 0));
  });

  await check("GET /api/listings/:id/similar validates UUID and limit", async () => {
    assert.equal((await getJson("/api/listings/not-a-uuid/similar")).status, 400);
    assert.equal((await getJson(`/api/listings/${srcId}/similar?limit=99`)).status, 400);
    assert.equal((await getJson(`/api/listings/${randomUUID()}/similar`)).status, 404);
    const limited = await getJson(`/api/listings/${srcId}/similar?limit=2`);
    assert.equal(limited.status, 200);
    assert.equal(limited.body.data.length, 2);
  });

  await check("GET /api/listings/batch preserves requested order and filters inactive/rented/hidden/expired", async () => {
    const requested = [achrafiehId, rentedId, p1Best, hiddenId, expiredId, zeroBedsId, verdunId];
    const { status, body } = await getJson(`/api/listings/batch?ids=${requested.join(",")}`);
    assert.equal(status, 200);
    assert.deepEqual(
      body.data.map((r) => r.id),
      [achrafiehId, p1Best, verdunId],
    );
    assert.equal(body.data[0].photos.length, 3);
  });

  await check("GET /api/listings/batch handles empty, invalid UUIDs, and > 12 cap", async () => {
    const empty = await getJson("/api/listings/batch");
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.data, []);

    assert.equal((await getJson("/api/listings/batch?ids=bad-uuid")).status, 400);
    const thirteen = Array.from({ length: 13 }, () => randomUUID()).join(",");
    assert.equal((await getJson(`/api/listings/batch?ids=${thirteen}`)).status, 400);
  });

  console.log(`ALL ${passed} INTEGRATION CHECKS PASSED`);
} finally {
  if (server) server.close();
  if (client) await client.end({ timeout: 5 });
  await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.end({ timeout: 5 });
}
