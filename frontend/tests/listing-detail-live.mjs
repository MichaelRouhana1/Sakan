// Read-only browser smoke check of existing studently_dev records. Browser
// analytics writes and route-cache requests are intercepted, not sent to the API.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
const frontend = path.resolve(import.meta.dirname, '..');
const requireBackend = createRequire(path.join(frontend, '../backend/package.json'));
const env = requireBackend('dotenv').parse(await readFile(path.join(frontend, '../backend/.env')));
const dbUrl = new URL(env.DATABASE_URL);
assert.equal(dbUrl.hostname, 'localhost'); assert.equal(dbUrl.pathname, '/studently_dev');
const sql = requireBackend('postgres')(dbUrl.toString());
const root = path.join(frontend, '.expo/detail-export'), output = path.join(frontend, '.expo/detail-ui');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let target = path.resolve(root, '.' + pathname);
  if (!target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (/^\/listing\/[^/]+$/.test(pathname)) target = path.join(root, 'listing/[id].html');
  else if (!path.extname(target)) target += pathname.endsWith('/') ? 'index.html' : '.html';
  try { res.setHeader('content-type', mime[path.extname(target)] ?? 'application/octet-stream'); res.end(await readFile(target)); }
  catch { res.writeHead(404); res.end(); }
});
const snapshot = () => sql.begin('read only', async tx => ({
  listings: await tx`SELECT * FROM listings ORDER BY id`, places: await tx`SELECT * FROM places ORDER BY id`,
  photos: await tx`SELECT * FROM listing_photos ORDER BY id`, shared: await tx`SELECT * FROM place_photos ORDER BY id`,
}));
const before = await snapshot();
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() !== 'GET' || /route|directions/.test(url.pathname)) return route.fulfill({ json: { data: [] } });
    const response = await fetch('http://localhost:3001' + url.pathname + url.search);
    return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
  });
  const rows = await sql`SELECT id,title,unit_type FROM listing_resolved WHERE status='active' AND hidden_reason IS NULL ORDER BY title`;
  const details = await Promise.all(rows.map(async row => {
    const response = await fetch('http://localhost:3001/api/listings/' + row.id);
    assert.equal(response.status, 200);
    return (await response.json()).data;
  }));
  const samples = [details.find(row => !row.placeContext.isMultiUnit), details.find(row => row.placeContext.isMultiUnit && row.placeContext.sources.electricity === 'unit'), details.find(row => row.unitType === 'shared_bed')].filter(Boolean);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const row of samples) {
      await page.goto(base + '/listing/' + row.id);
      await expect(page.getByTestId('detail-hero-image').first()).toBeVisible({ timeout: 30000 });
      if (row.placeContext.isMultiUnit) {
        await expect(page.getByTestId('unit-utilities')).toContainText('24/7 Generator');
        await expect(page.getByTestId('place-utilities')).toContainText('Solar');
        await page.getByTestId('other-place-units').scrollIntoViewIfNeeded();
      } else await expect(page.getByTestId('other-place-units')).toHaveCount(0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, `live-${row.id}-${width}.png`) });
      checks.push({ id: row.id, title: row.title, width, multiUnit: row.placeContext.isMultiUnit });
    }
  }
  assert.deepEqual(await snapshot(), before, 'live listings, places and galleries must remain unchanged');
  await writeFile(path.join(output, 'live-result.json'), JSON.stringify({ database: 'studently_dev', checks, unchanged: true }, null, 2));
  console.log(JSON.stringify({ database: 'studently_dev', checks, unchanged: true }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await sql.end(); }
