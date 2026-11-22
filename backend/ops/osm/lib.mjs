// Shared helpers for the offline OSM tooling (read-only against the dev DB).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import dotenv from 'dotenv';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(here, '..', '..');
export const repoRoot = path.resolve(backendRoot, '..');
export const outDir = path.join(here, 'out');
export const seedDir = path.join(backendRoot, 'src', 'db', 'seeds', 'osm');

dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });

export function connect() {
  const url = process.env.DEV_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL / DEV_DATABASE_URL not set');
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) throw new Error(`Refusing non-loopback DB host ${host}`);
  // max:1 so the pg_temp function lives on the one session we use.
  return postgres(url, { max: 1, onnotice: () => {} });
}

/** Installs normalize v2 as pg_temp.osm_normalize_v2 (no catalog side effects). */
export async function installTempNormalize(tx) {
  const body = fs.readFileSync(path.join(here, 'normalize_v2.sql'), 'utf8').replace('{{FN}}', 'pg_temp.osm_normalize_v2');
  await tx.unsafe(body);
  return 'pg_temp.osm_normalize_v2';
}

export const GOLDEN = [
  ['الحمراء', 'الحمرا'], ['الحمرا', 'الحمرا'],
  ['Bliss Street', 'bliss'], ['Rue Bliss', 'bliss'], ['شارع بليس', 'بليس'], ['Bliss St', 'bliss st'],
  ['st joseph', 'st joseph'], ['St. Joseph', 'st joseph'], ['St Nicolas', 'st nicolas'],
  ['street', 'street'], ['Rue', 'rue'], ['Hamra Street', 'hamra'], ['Avenue de Paris', 'de paris'],
  ['Achrafié', 'achrafie'], ['Zahlé', 'zahle'], ['مدرسة', 'مدرسه'], ['أشرفية', 'اشرفيه'],
];
