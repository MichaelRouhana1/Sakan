import assert from 'node:assert/strict';
import test from 'node:test';
import { DESKTOP_DESIGN_SCALE, DesktopDesign, desktopGutter, desktopStyles, scaleDesktopStyles } from '../constants/desktopDesign.ts';

test('shared desktop tokens enlarge the design by ten percent', () => {
  assert.equal(DESKTOP_DESIGN_SCALE, 1.10);
  assert.equal(DesktopDesign.layout.contentMax, 1540);
  assert.equal(DesktopDesign.type.hero, 61.6);
  assert.equal(DesktopDesign.space.md, 17.6);
  assert.equal(DesktopDesign.cards.ideal, 264);
});

test('gutters stay bounded and continuous at desktop widths', () => {
  assert.equal(desktopGutter(900), 44);
  assert.equal(desktopGutter(1920), 88);
  assert.equal(desktopGutter(900, 1), 40);
  assert.equal(desktopGutter(1920, 1), 80);
  assert.ok(Math.abs(desktopGutter(1199) - desktopGutter(1201)) < 1);
});

test('style conversion scales lengths while preserving ratios, units and the base styles', () => {
  const base = { card: { width: 240, fontSize: 16, marginTop: -8, borderRadius: 8, flex: 1, opacity: 0.8, zIndex: 40, aspectRatio: 1.5, maxWidth: '100%', height: '100vh', transform: [{ scale: 0.98 }] } };
  const scaled = desktopStyles(base);
  assert.equal(scaled.card.width, 264);
  assert.equal(scaled.card.fontSize, 17.6);
  assert.equal(scaled.card.marginTop, -8.8);
  for (const key of ['flex', 'opacity', 'zIndex', 'aspectRatio', 'maxWidth', 'height', 'transform']) assert.deepEqual(scaled.card[key], base.card[key]);
  assert.equal(base.card.width, 240);
  assert.equal(desktopStyles(base), scaled);
});

test('shadow, clip and offset lengths use the same factor', () => {
  const base = {
    card: {
      boxShadow: '0 2px 8px rgba(18, 24, 38, 0.05)',
      clipPath: 'inset(-2px 0px -2px 0px)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      elevation: 3,
      height: '100vh',
    },
  };
  const scaled = desktopStyles(base);
  assert.equal(scaled.card.boxShadow, '0 2.2px 8.8px rgba(18, 24, 38, 0.05)');
  assert.equal(scaled.card.clipPath, 'inset(-2.2px 0px -2.2px 0px)');
  assert.deepEqual(scaled.card.shadowOffset, { width: 0, height: 3.3 });
  assert.equal(scaled.card.shadowOpacity, 0.05);
  assert.equal(scaled.card.elevation, 3);
  assert.equal(scaled.card.height, '100vh');
  assert.equal(base.card.boxShadow, '0 2px 8px rgba(18, 24, 38, 0.05)');
  assert.equal(scaleDesktopStyles(base, 1), base);
});
