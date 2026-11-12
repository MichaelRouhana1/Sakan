import 'dotenv/config';
import postgres from 'postgres';
import { seedTarget, assertSeedMarker } from './seed-guard.mjs';
import { fixtureId } from './seed-housing.mjs';
import { adminEmail, ensureClerkAdmin, localAdminPassword, seedAdminUser } from './seed-admin.mjs';

const raw = process.env;
const target = seedTarget(raw);
const clerk = await ensureClerkAdmin(raw);
const client = postgres(target.url.toString(), { max: 1, onnotice: () => {} });
try {
  const seeded = await client.begin(async (tx) => {
    await assertSeedMarker(tx, target);
    return seedAdminUser(tx, fixtureId('admin'), clerk.clerkId);
  });
  const customPassword = Boolean(raw.SEED_ADMIN_PASSWORD?.trim());
  console.log(JSON.stringify({
    database: target.name,
    email: adminEmail,
    password: clerk.clerkId ? (customPassword ? 'SEED_ADMIN_PASSWORD' : localAdminPassword) : null,
    clerk: clerk.status,
    ...seeded,
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
