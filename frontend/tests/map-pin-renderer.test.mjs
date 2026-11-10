import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../lib/webMapPinRenderer.web.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(configured, search) {
  const exports = {};
  const context = { exports, process: { env: { EXPO_PUBLIC_WEB_MAP_PIN_RENDERER: configured } }, URLSearchParams,
    ...(search === undefined ? {} : { window: { location: { search } } }) };
  vm.runInNewContext(compiled, context);
  return { api: exports, context };
}

test('defaults to layers and retains an explicit unavailable fallback', () => {
  const { api } = load();
  for (const configured of [undefined, '', 'invalid']) {
    const normal = api.resolveWebMapPinRenderer(configured);
    assert.equal(normal.renderer, 'layers');
    assert.equal(normal.requested, 'layers');
    assert.equal(normal.source, 'default');
  }
  const requested = api.resolveWebMapPinRenderer('layers');
  assert.equal(requested.requested, 'layers');
  assert.equal(requested.renderer, 'layers');
  assert.equal(requested.fallbackReason, null);
  assert.equal(api.resolveWebMapPinRenderer('layers', '', false).fallbackReason, 'layers-not-available');
  assert.equal(api.resolveWebMapPinRenderer('layers', '', true).renderer, 'layers');
  assert.equal(api.resolveWebMapPinRenderer(undefined, '', false).renderer, 'markers');
});

test('valid URL overrides environment; invalid/absent URL preserves environment', () => {
  const { api } = load();
  assert.equal(api.resolveWebMapPinRenderer('layers', '?mapPins=markers', true).renderer, 'markers');
  assert.equal(api.resolveWebMapPinRenderer('markers', '?mapPins=layers', true).renderer, 'layers');
  assert.equal(api.resolveWebMapPinRenderer('layers', '?mapPins=invalid', true).source, 'environment');
  assert.equal(api.resolveWebMapPinRenderer('markers', '?mapPins=invalid', true).renderer, 'markers');
  assert.equal(api.resolveWebMapPinRenderer('markers').source, 'environment');
  assert.equal(api.resolveWebMapPinRenderer('invalid', '?areas=Hamra').source, 'default');
});

test('SSR does not freeze a client choice; both browser maps share one immutable selection', () => {
  const { api, context } = load('markers');
  assert.equal(api.getWebMapPinRendererSelection().requested, 'markers');
  context.window = { location: { search: '?mapPins=layers' } };
  const browse = api.getWebMapPinRendererSelection();
  context.window.location.search = '?mapPins=markers';
  assert.equal(api.getWebMapPinRendererSelection(), browse);
  assert.equal(browse.requested, 'layers');
  assert.equal(browse.renderer, 'layers');
  assert.ok(Object.isFrozen(browse));
  const defaultPage = load(undefined, '');
  assert.equal(defaultPage.api.getWebMapPinRendererSelection().renderer, 'layers');
  const rollbackPage = load(undefined, '?mapPins=markers');
  assert.equal(rollbackPage.api.getWebMapPinRendererSelection().renderer, 'markers');
});

test('diagnostic attributes accurately report the active renderer and fallback', () => {
  const { api } = load('layers', '?mapPins=layers');
  const host = { dataset: {} };
  api.markWebMapPinRenderer(host);
  assert.equal(host.dataset.mapPinRenderer, 'layers');
  assert.equal(host.dataset.mapPinRendererRequested, 'layers');
  assert.equal(host.dataset.mapPinRendererFallback, undefined);
  const normal = load('markers', '').api;
  normal.markWebMapPinRenderer(host);
  assert.equal(host.dataset.mapPinRendererFallback, undefined);
});
