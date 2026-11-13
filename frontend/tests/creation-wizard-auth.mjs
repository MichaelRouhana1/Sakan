import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { adminEmail } from '../../backend/ops/places/seed-admin.mjs';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
export const env = require('dotenv').parse(await readFile(new URL('../../backend/.env', import.meta.url), 'utf8'));
export const postgres = require('postgres');
export async function signIn(page, base) {
  const headers = { authorization: `Bearer ${env.CLERK_SECRET_KEY}`, 'content-type': 'application/json' };
  const response = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(adminEmail)}`, { headers });
  if (!response.ok) throw new Error(`Test host lookup failed (${response.status})`);
  const users = await response.json();
  const user = users.find(u => u.email_addresses?.some(e => e.email_address.toLowerCase() === adminEmail));
  if (!user) throw new Error('Seed the development admin account first');
  const signed = await fetch('https://api.clerk.com/v1/sign_in_tokens', { method: 'POST', headers, body: JSON.stringify({ user_id: user.id, expires_in_seconds: 600 }) });
  if (!signed.ok) throw new Error(`Test sign-in token failed (${signed.status})`);
  const { token } = await signed.json();
  await page.goto(`${base}/create`, { timeout: 180000 });
  await page.waitForFunction(() => window.Clerk?.loaded, undefined, { timeout: 60000 });
  await page.evaluate(async ticket => {
    const attempt = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket });
    if (attempt.status !== 'complete') throw new Error('Test sign-in incomplete');
    await window.Clerk.setActive({ session: attempt.createdSessionId });
  }, token);
  await page.getByTestId('creation-wizard').waitFor({ timeout: 60000 });
  return user.id;
}
export async function apiRequest(page, api, route, method = 'GET', body) {
  await page.waitForFunction(() => Boolean(window.Clerk?.session), undefined, { timeout: 60000 });
  const token = await page.evaluate(() => window.Clerk.session.getToken({ skipCache: true }));
  const response = await page.request.fetch(api + route, { method, headers: { authorization: `Bearer ${token}` }, ...(body ? { data: body } : {}) });
  const text = await response.text();
  if (!response.ok()) throw new Error(`Test API ${method} ${route}: ${response.status()} ${text}`);
  return text ? JSON.parse(text).data : null;
}
