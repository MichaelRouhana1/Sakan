import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.expo/wizard-header-balanced');
const port = Number(process.env.PORT ?? 8085);
await stat(path.join(root, 'index.html'));
const types = { '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ttf':'font/ttf', '.woff2':'font/woff2', '.ico':'image/x-icon' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    let file;
    for (const candidate of [target, target + '.html', path.join(target, 'index.html')]) {
      if ((await stat(candidate).catch(() => null))?.isFile()) { file = candidate; break; }
    }
    // Dynamic Expo routes hydrate from the app shell; missing assets remain 404s.
    if (!file && !path.extname(pathname)) file = path.join(root, 'index.html');
    if (!file) { res.writeHead(404).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(body);
  } catch { res.writeHead(500).end('Could not load the web export.'); }
}).listen(port, '127.0.0.1', () => console.log(`Production preview: http://localhost:${port}/create`));
