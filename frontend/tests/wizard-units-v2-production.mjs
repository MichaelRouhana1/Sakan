import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../.expo/wizard-v2-production-spa');
const output = path.resolve(import.meta.dirname, '../../artifacts/wizard-units-v2');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403); res.end(); return; }
  try {
    const file = path.extname(target) ? target : path.join(root, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', r => r.fulfill({ json: { data: [] } }));
  await page.goto(`http://127.0.0.1:${server.address().port}/create?wizard=v2&demo=three`, { timeout: 90000 });
  await expect(page.getByText('What are you listing?', { exact: true })).toBeVisible({ timeout: 90000 });
  await expect(page.getByTestId('wizard-v2')).toHaveCount(0);
  if (errors.length) throw new Error(errors.join('\n'));
  await page.screenshot({ path: path.join(output, 'production-v2-flag-ignored.png'), fullPage: true });
  const result = { passed: true, productionFlagIgnored: true, uncaughtBrowserErrors: errors };
  await writeFile(path.join(output, 'production-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
