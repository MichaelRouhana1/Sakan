import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const result = await build({ stdin: { contents: "export { WebMapCamera } from './lib/webMapCamera.web';", resolveDir: root, loader: 'ts' },
  absWorkingDir: root, bundle: true, write: false, platform: 'node', format: 'esm' });
const { WebMapCamera } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
class MapStub {
  host = new EventTarget(); listeners = new Map(); calls = []; stops = 0; data = {};
  getContainer() { return this.host; }
  on(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  off(type, listener) { this.listeners.get(type)?.delete(listener); }
  fire(type, data = {}) { for (const listener of [...this.listeners.get(type) ?? []]) listener({ type, ...data }); }
  animate(name, data) { this.calls.push(name); this.data = data; }
  stop() { this.stops++; this.fire('moveend', this.data); }
  finish() { this.fire('moveend', this.data); }
}

test('a newer intent detaches the old next-stage listener before synchronous stop/moveend', () => {
  const map = new MapStub(); const camera = new WebMapCamera(map);
  camera.begin('hover').run([data => map.animate('out', data), data => map.animate('stale-pan', data)]);
  camera.begin('selection').run([data => map.animate('pin', data)]);
  map.finish();
  assert.deepEqual(map.calls, ['out', 'pin']);
  assert.equal(map.listeners.get('moveend').size, 0);
  camera.destroy();
});

test('only the owned moveend advances a sequence and completion is called once', () => {
  const map = new MapStub(); const camera = new WebMapCamera(map); let settled = 0;
  camera.begin('focus', () => settled++).run([data => map.animate('out', data), data => map.animate('pan', data), data => map.animate('in', data)]);
  map.fire('moveend');
  assert.deepEqual(map.calls, ['out']);
  const oldStage = map.data;
  map.finish(); map.fire('moveend', oldStage);
  assert.deepEqual(map.calls, ['out', 'pan']);
  map.finish(); map.finish(); map.finish();
  assert.deepEqual(map.calls, ['out', 'pan', 'in']); assert.equal(settled, 1);
  camera.destroy();
});

test('touch, wheel and keyboard takeover cancel authored work but do not stop subsequent SDK gestures', () => {
  for (const type of ['touchstart', 'wheel', 'keydown', 'pointerdown']) {
    const map = new MapStub(); const camera = new WebMapCamera(map);
    camera.begin('hover').run([data => map.animate('out', data), data => map.animate('stale', data)]);
    map.host.dispatchEvent(new Event(type));
    map.host.dispatchEvent(new Event(type)); map.finish();
    assert.deepEqual(map.calls, ['out']); assert.equal(map.stops, 1);
    camera.destroy();
  }
});

test('delayed fit and asynchronous cluster replies cannot run after takeover or disposal', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const map = new MapStub(); const camera = new WebMapCamera(map);
  const fit = camera.begin('fit'); fit.after(80, () => fit.run([data => map.animate('fit', data)]));
  map.host.dispatchEvent(new Event('wheel')); t.mock.timers.tick(100);
  const cluster = camera.begin('cluster');
  camera.begin('selection').run([data => map.animate('pin', data)]);
  cluster.run([data => map.animate('late-cluster', data)]);
  const delayed = camera.begin('cluster'); t.mock.timers.tick(6000);
  delayed.run([data => map.animate('still-current-cluster', data)]);
  const pending = camera.begin('fit'); pending.after(80, () => map.animate('late-fit', {}));
  camera.destroy(); t.mock.timers.tick(6000);
  assert.deepEqual(map.calls, ['pin', 'still-current-cluster']);
});

test('data membership reset cancels obsolete selection without canceling a newer focus request', () => {
  const map = new MapStub(); const camera = new WebMapCamera(map);
  const focus = camera.begin('focus');
  camera.cancelKinds('hover', 'selection', 'cluster');
  assert.equal(focus.isCurrent(), true);
  focus.run([data => map.animate('campus', data)]); map.finish();
  camera.destroy();
});
