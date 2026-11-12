// Audit actual Metro Android/iOS map-component graphs, without a simulator/device.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.expo/map-pin-baseline', process.env.MAP_PIN_NATIVE_BASELINE_PHASE ?? '');
const origin = process.env.STUDENTLY_TEST_URL ?? 'http://127.0.0.1:8085';
function entries(map) {
  if (map.sections) return map.sections.flatMap(section => entries(section.map));
  return (map.sources ?? []).map((source, index) => [source, map.sourcesContent?.[index] ?? '']);
}
const graphs = {};
for (const platform of ['android', 'ios']) {
  const response = await fetch(`${origin}/components/listings/ListingBrowseMap.map?platform=${platform}&dev=true&minify=false&lazy=false&transform.engine=hermes`);
  assert.ok(response.ok, `${platform} Metro dependency map failed: ${response.status}`);
  const modules = entries(await response.json());
  const local = modules.filter(([file]) => file.startsWith(root) && !file.includes('node_modules')).map(([file, source]) => ({
    file: path.relative(root, file).replaceAll('\\', '/'),
    sha256: createHash('sha256').update(source).digest('hex'),
  })).sort((a, b) => a.file.localeCompare(b.file));
  assert.ok(local.some(module => module.file === 'components/listings/ListingBrowseMap.tsx'), `${platform} did not select the native map.`);
  assert.ok(!local.some(module => /ListingBrowseMap\.web|FindBrowseSidebar|MobileMapSelection\.web|webMapData\.web|webMapPinRenderer\.web|webMapLayers\.web|webMapPinImages\.web|webMapCamera\.web|webMapDisplayGroups\.web|webMapPopup\.web|browseMapLayers\.web/.test(module.file)), `${platform} imported the web renderer.`);
  graphs[platform] = { moduleCount: modules.length, local };
}
await mkdir(output, { recursive: true });
if (process.argv[2] === 'capture') {
  await writeFile(path.join(output, 'native-before.json'), JSON.stringify(graphs, null, 2), { flag: 'wx' });
} else if (process.argv[2] === 'verify') {
  const before = JSON.parse(await readFile(path.join(output, 'native-before.json'), 'utf8'));
  await writeFile(path.join(output, 'native-after.json'), JSON.stringify(graphs, null, 2));
  assert.deepEqual(graphs, before, 'Native dependency modules or transformed local code changed.');
} else throw new Error('Expected capture or verify');
console.log(JSON.stringify(Object.fromEntries(Object.entries(graphs).map(([platform, graph]) => [platform, {
  modules: graph.moduleCount, localModules: graph.local.length, nativeMapSelected: true, webRendererAbsent: true,
}]))));
