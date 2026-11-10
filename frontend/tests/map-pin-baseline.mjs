// Capture the working checkout, including unrelated uncommitted native changes.
// Usage: node frontend/tests/map-pin-baseline.mjs capture|verify [1|2|3|4|4-zoom|5|6|6-filters|7]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const step = process.argv[3] ?? '1';
assert.ok(['1', '2', '3', '4', '4-zoom', '5', '6', '6-filters', '7'].includes(step), 'Expected a supported web map baseline step');
const output = path.join(root, '.expo/map-pin-baseline', ...(step !== '1' ? [`step${step}-checkout`] : []));
const baselinePath = path.join(output, 'checkout-before.json');
const allowed = new Set(step === '7' ? [
  'lib/webMapPinRenderer.web.ts',
  '.env.example',
] : step === '6-filters' ? [
  'components/listings/ListingBrowseMap.web.tsx',
  'components/web/FindBrowse.tsx',
  'components/web/FindMapPane.tsx',
] : step === '6' ? [
  'components/listings/ListingBrowseMap.web.tsx',
  'components/web/FindBrowseSidebar.tsx',
  'lib/webMapLayers.web.ts',
  'lib/webMapCamera.web.ts',
] : step === '5' ? [
  'components/listings/ListingBrowseMap.web.tsx',
  'lib/webMapLayers.web.ts',
  'lib/webMapPinImages.web.ts',
  'lib/studentlyMapbox.web.ts',
] : step === '4-zoom' ? ['lib/webMapLayers.web.ts'] : step === '4' ? [
  'components/listings/ListingBrowseMap.web.tsx',
  'components/web/FindBrowseSidebar.tsx',
  'lib/webMapPinRenderer.web.ts',
  'lib/webMapLayers.web.ts',
  'lib/webMapPinImages.web.ts',
  '.env.example',
] : step === '3' ? [
  'components/web/FindBrowse.tsx',
  'components/listings/ListingBrowseMap.web.tsx',
  'lib/studentlyMapbox.web.ts',
  'lib/webMapData.web.ts',
] : step === '2' ? [
  'components/web/FindBrowse.tsx',
  'components/web/FindMapPane.tsx',
  'components/listings/ListingBrowseMap.web.tsx',
  'components/listings/MobileMapSelection.web.tsx',
  'lib/studentlyMapbox.web.ts',
] : [
  '.env.example',
  'components/listings/ListingBrowseMap.web.tsx',
  'components/web/FindBrowseSidebar.tsx',
  'lib/webMapPinRenderer.web.ts',
]);
const skipped = new Set(['node_modules', '.expo', '.git', 'android', 'ios', 'dist', 'web-build', 'tests']);
const relative = file => path.relative(root, file).replaceAll('\\', '/');
async function filesIn(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && !skipped.has(entry.name)) result.push(...await filesIn(file));
    else if (entry.isFile() && (/\.(?:[cm]?js|tsx?|json|css|patch)$/.test(entry.name) || entry.name === '.env.example')) result.push(file);
  }
  return result;
}
async function hashes() {
  return Object.fromEntries(await Promise.all((await filesIn(root)).sort().map(async file => [
    relative(file), createHash('sha256').update(await readFile(file)).digest('hex'),
  ])));
}
function diagnostics() {
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  return ts.getPreEmitDiagnostics(program).map(d => `${d.file ? relative(d.file.fileName) : 'config'} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`).sort();
}
function difference(current, before) {
  const remaining = [...before];
  const added = [];
  for (const item of current) {
    const index = remaining.indexOf(item);
    if (index < 0) added.push(item);
    else remaining.splice(index, 1);
  }
  return { added, removed: remaining };
}

await mkdir(output, { recursive: true });
const command = process.argv[2];
if (command === 'capture') {
  const snapshot = { capturedAt: new Date().toISOString(), files: await hashes(), diagnostics: diagnostics() };
  // Refuse to replace the implementation-start baseline accidentally.
  await writeFile(baselinePath, JSON.stringify(snapshot, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ baselinePath, files: Object.keys(snapshot.files).length, existingDiagnostics: snapshot.diagnostics.length }));
} else if (command === 'verify') {
  const before = JSON.parse(await readFile(baselinePath, 'utf8'));
  const currentFiles = await hashes();
  const changes = [...new Set([...Object.keys(before.files), ...Object.keys(currentFiles)])].filter(file => before.files[file] !== currentFiles[file]);
  const unexpectedFileChanges = changes.filter(file => !allowed.has(file));
  const currentDiagnostics = diagnostics();
  const delta = difference(currentDiagnostics, before.diagnostics);
  const result = {
    comparedTo: before.capturedAt,
    protectedFilesUnchanged: unexpectedFileChanges.length === 0,
    changedRuntimeFiles: changes,
    unexpectedFileChanges,
    diagnostics: { before: before.diagnostics.length, after: currentDiagnostics.length, ...delta },
  };
  await writeFile(path.join(output, 'checkout-verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  assert.deepEqual(unexpectedFileChanges, [], `Runtime files outside the Step ${step} web allowlist changed; investigate rather than overwrite them.`);
  assert.deepEqual(delta.added, [], `Step ${step} introduced TypeScript diagnostics.`);
} else {
  throw new Error('Expected capture or verify');
}
