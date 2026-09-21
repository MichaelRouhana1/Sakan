// Run from backend: node --import tsx --test tests/price-guide.test.ts
// Uses only a connection-local temporary table; never seeds real listings.
import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import postgres from "postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  priceGuideAggregateQuery, priceGuideFromAggregate, priceGuideQuerySchema,
  type PriceGuideInput, type PriceGuideAggregate,
} from "../src/modules/listings/price-guide.js";

const params = {
  area: "Hamra", spaceType: "entire_place", propertyType: "apartment",
  priceBasis: "per_unit_month", bedrooms: "1",
};
const input = priceGuideQuerySchema.parse(params);

test("validates all matching inputs without silently defaulting them", () => {
  for (const key of Object.keys(params)) {
    const missing = { ...params } as Record<string, unknown>;
    delete missing[key];
    assert.equal(priceGuideQuerySchema.safeParse(missing).success, false, key);
  }
  for (const patch of [
    { area: "Beirut-wide" }, { spaceType: "other" }, { propertyType: "other" },
    { priceBasis: "" }, { bedrooms: "" }, { bedrooms: " " }, { bedrooms: "1.5" },
    { bedrooms: "-1" }, { bedrooms: "13" }, { bedrooms: ["1", "2"] },
    { excludeListingId: "not-an-id" },
  ]) assert.equal(priceGuideQuerySchema.safeParse({ ...params, ...patch }).success, false);
});

test("SQL filters and quartiles use the complete strict population", async (t) => {
  const connection = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  assert.ok(connection, "Set DATABASE_URL or TEST_DATABASE_URL for SQL integration tests");
  const client = postgres(connection, { max: 1, connect_timeout: 5 });
  try {
    await client.begin(async (tx) => {
      await tx.unsafe(`CREATE TEMP TABLE listings (
        id uuid, status text, monthly_rent_usd integer, expires_at timestamptz,
        area text, space_type text, property_type text, bedrooms integer, price_basis text
      ) ON COMMIT DROP`);
      const dialect = new PgDialect();
      async function aggregate(query: PriceGuideInput = input) {
        const compiled = dialect.sqlToQuery(priceGuideAggregateQuery(query));
        const [row] = await tx.unsafe<PriceGuideAggregate[]>(compiled.sql, compiled.params);
        return row;
      }
      async function seed(n: number) {
        await tx.unsafe("TRUNCATE pg_temp.listings");
        await tx.unsafe(`INSERT INTO pg_temp.listings
          SELECT ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
            'active', 100*i, now() + interval '1 day', 'Hamra', 'entire_place',
            'apartment', 1, 'per_unit_month' FROM generate_series(1, $1::int) AS i`, [n]);
      }

      await t.test("0 and 9 hide; 10 and 11 have interpolated, rounded quartiles", async () => {
        for (const n of [0, 9]) {
          await seed(n);
          assert.equal(priceGuideFromAggregate(await aggregate()), null);
        }
        await seed(10);
        assert.deepEqual(priceGuideFromAggregate(await aggregate()), {
          n: 10, lowUsd: 325, medianUsd: 550, highUsd: 775, match: "area_space_beds_basis",
        });
        await tx.unsafe("UPDATE pg_temp.listings SET monthly_rent_usd = monthly_rent_usd / 100");
        assert.deepEqual(priceGuideFromAggregate(await aggregate()), {
          n: 10, lowUsd: 3, medianUsd: 6, highUsd: 8, match: "area_space_beds_basis",
        });
        await seed(11);
        assert.deepEqual(priceGuideFromAggregate(await aggregate()), {
          n: 11, lowUsd: 350, medianUsd: 600, highUsd: 850, match: "area_space_beds_basis",
        });
      });

      await t.test("one disqualified comp drops ten below the gate, with no widening", async () => {
        for (const change of [
          "status = 'draft'", "status = 'archived'", "status = 'removed'",
          "monthly_rent_usd = 0", "monthly_rent_usd = -1",
          "expires_at = now() - interval '1 second'", "expires_at = now()",
          "area = 'Verdun'", "space_type = 'private_room'", "space_type = 'shared_room'",
          "price_basis = 'per_room_month'", "price_basis = 'per_bed_month'",
          "bedrooms = 0", "bedrooms = 2", "property_type = 'studio'",
        ]) {
          await seed(10);
          await tx.unsafe(`UPDATE pg_temp.listings SET ${change} WHERE monthly_rent_usd = 100`);
          assert.equal((await aggregate()).n, 9, change);
          assert.equal(priceGuideFromAggregate(await aggregate()), null, change);
        }
        await seed(10);
        assert.equal(priceGuideFromAggregate(await aggregate({ ...input,
          excludeListingId: "00000000-0000-4000-8000-000000000001",
        })), null);
      });

      await t.test("studio OR zero-bedroom classification is symmetric; 2+ stays grouped", async () => {
        await seed(10);
        await tx.unsafe("UPDATE pg_temp.listings SET property_type = 'studio', expires_at = NULL");
        assert.equal((await aggregate({ ...input, propertyType: "studio", bedrooms: 1 })).n, 10);
        assert.equal((await aggregate({ ...input, bedrooms: 0 })).n, 10);
        await tx.unsafe("UPDATE pg_temp.listings SET property_type = 'apartment', bedrooms = 0");
        assert.equal((await aggregate({ ...input, propertyType: "studio", bedrooms: 1 })).n, 10);
        await tx.unsafe("UPDATE pg_temp.listings SET bedrooms = 3");
        assert.equal((await aggregate({ ...input, bedrooms: 2 })).n, 10);
        assert.equal((await aggregate({ ...input, bedrooms: 12 })).n, 10);
        assert.equal((await aggregate()).n, 0);
      });
    });
  } finally {
    await client.end();
  }
});

test("HTTP envelope, route precedence, authentication and first-time host access", async () => {
  const { listingsRouter } = await import("../src/modules/listings/listings.routes.js");
  const { listingsRepository } = await import("../src/modules/listings/listings.repository.js");
  const { requireAuth } = await import("../src/middleware/auth.js");
  const { errorHandler } = await import("../src/middleware/error-handler.js");
  const stack = listingsRouter.stack as any[];
  const guideRoute = stack.find((layer) => layer.route?.path === "/price-guide").route;
  assert.ok(stack.findIndex((l) => l.route?.path === "/price-guide") <
    stack.findIndex((l) => l.route?.path === "/:id"));
  assert.equal(guideRoute.stack[0].handle, requireAuth);

  // Inject verified identities only in this test; anonymous requests still run real auth.
  guideRoute.stack[0].handle = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const role = req.header("x-test-role");
    if (role === "poster" || role === "renter") {
      req.user = { id: "test-user", clerkId: "test-clerk", role };
      next();
    } else void requireAuth(req, res, next);
  };
  const original = listingsRepository.priceGuideAggregate;
  let calls = 0;
  let n = 10;
  listingsRepository.priceGuideAggregate = async (received) => {
    assert.deepEqual(received, input);
    calls++;
    return { n, medianUsd: 550, lowUsd: 325, highUsd: 775 };
  };
  const app = express();
  app.use("/api/listings", listingsRouter);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/api/listings/price-guide?${new URLSearchParams(params)}`;
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal(calls, 0);
    for (const role of ["poster", "renter"]) {
      const response = await fetch(url, { headers: { "x-test-role": role } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { data: {
        n: 10, medianUsd: 550, lowUsd: 325, highUsd: 775, match: "area_space_beds_basis",
      } });
    }
    n = 9;
    assert.deepEqual(await (await fetch(url, { headers: { "x-test-role": "renter" } })).json(), { data: null });
    const invalid = await fetch(url.replace("bedrooms=1", "bedrooms="), { headers: { "x-test-role": "poster" } });
    assert.equal(invalid.status, 400);
    assert.equal(calls, 3);
  } finally {
    listingsRepository.priceGuideAggregate = original;
    guideRoute.stack[0].handle = requireAuth;
    server.close();
    await once(server, "close");
  }
});
