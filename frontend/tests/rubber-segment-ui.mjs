// Actual control and portfolio filtering model; isolated data, no database writes.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import { chromium, expect } from '@playwright/test';

const frontend = path.resolve(import.meta.dirname, '..');
const output = path.resolve(frontend, '../artifacts/rubber-segment');
await mkdir(output, { recursive: true });
const entry = `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {RubberSegment} from './components/ui/RubberSegment';
import {listingFilters,portfolioCounts,workspaceGroups} from './components/web/host/listingsWorkspaceModel';
const now=Date.now(),day=86400000;
const units=[['live',30,'available'],['expiring',2,'available'],['expired',-1,'available'],['rented',20,'rented']].map(([id,days,availability])=>({id,title:id,area:'Hamra',status:'active',unitType:'whole_apartment',availability,expiresAt:new Date(now+days*day).toISOString()}));
function App(){const [value,setValue]=useState('All');const [extra,setExtra]=useState(0);window.selectFilter=setValue;window.changeCounts=setExtra;
const counts={...portfolioCounts(units,now),All:5+extra,Drafts:1};const items=[...listingFilters,'Drafts'].map(value=>({value,label:value,count:counts[value]}));
return <main><RubberSegment items={items} value={value} onChange={next=>{setValue(next);window.changes=(window.changes??0)+1;}}/>
<section data-testid="results">{value==='Drafts'?'draft':workspaceGroups(units,value,'','urgency',now).flatMap(group=>group.units).map(unit=>unit.id).sort().join(',')}</section></main>;}
createRoot(document.getElementById('root')).render(<App/>);`;
const bundle = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: frontend }, absWorkingDir: frontend,
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  outfile: path.join(frontend, '.expo/rubber-segment-test/bundle.js'),
  resolveExtensions: ['.web.tsx', '.tsx', '.web.ts', '.ts', '.js', '.json'],
  define: { 'process.env.NODE_ENV': '"test"' },
});
const server = createServer((req, res) => {
  const suffix = req.url === '/bundle.js' ? '.js' : req.url === '/bundle.css' ? '.css' : null;
  if (suffix) { res.setHeader('content-type', suffix === '.js' ? 'text/javascript' : 'text/css'); res.end(bundle.outputFiles.find(file => file.path.endsWith(suffix)).contents); return; }
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#F9FAFB;font-family:sans-serif}main{padding:16px}section{margin-top:16px;min-height:200px}</style><link rel="stylesheet" href="/bundle.css"><div id="root"></div><script src="/bundle.js"></script>');
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], checks = [];
try {
  const page = await browser.newPage(); page.on('pageerror', error => errors.push(error.message));
  const control = page.getByRole('group', { name: 'Listing filters' });
  const thumb = control.locator('.studently-rubber-segment__thumb');
  const button = name => page.getByRole('button', { name: 'Filter ' + name, exact: true });
  const settled = async name => {
    await expect(button(name)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => {
      const [a,b]=await Promise.all([thumb.boundingBox(),button(name).boundingBox()]);
      return Math.max(...['x','y','width','height'].map(key=>Math.abs(a[key]-b[key])));
    }).toBeLessThan(.5);
  };
  for (const width of [375,768,1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('http://127.0.0.1:' + server.address().port);
    await settled('All');
    const toolbarBefore=await control.boundingBox();
    for (const [name,expected] of [['Needs attention','expired,expiring'],['Live','expiring,live'],['Expired','expired'],['Rented','rented'],['Drafts','draft'],['All','expired,expiring,live,rented']]) {
      await button(name).click();await expect(page.getByTestId('results')).toHaveText(expected);await settled(name);
      const box=await control.boundingBox();assert.equal(box.height,toolbarBefore.height);
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await control.screenshot({ path:path.join(output,'filters-'+width+'.png') });
  }
  checks.push('all six filters keep counts/results, stable toolbar height and no overflow at 375/768/1440, including wrapped rows');
  await page.setViewportSize({width:1440,height:900});await settled('All');
  const old=await button('All').boundingBox(),dest=await button('Needs attention').boundingBox();
  await thumb.evaluate(el=>{
    window.frames=[];const started=performance.now();const sample=()=>{const r=el.getBoundingClientRect();window.frames.push({x:r.x,y:r.y,width:r.width,height:r.height});if(performance.now()-started<900)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  });
  await button('Needs attention').click();await settled('Needs attention');
  const frames=await page.evaluate(()=>window.frames);
  assert.ok(Math.max(...frames.map(frame=>frame.width))>Math.max(old.width,dest.width)+10,'thumb stretches beyond either resting slot');
  await writeFile(path.join(output,'animation-frames.json'),JSON.stringify(frames,null,2));
  checks.push('rubber thumb stretches across the gap and contracts into the selected slot');
  await button('All').click();await button('Expired').click();await button('Live').click();await button('Drafts').click();await settled('Drafts');
  await expect(page.getByTestId('results')).toHaveText('draft');
  checks.push('rapid clicks interrupt the animation and settle on the latest filter');
  await button('Drafts').focus();await page.keyboard.press('Home');await settled('All');await page.keyboard.press('ArrowRight');await settled('Needs attention');
  await expect(button('Needs attention')).toBeFocused();await page.keyboard.press('End');await settled('Drafts');
  await button('Live').focus();await page.keyboard.press('Space');await settled('Live');await button('All').focus();await page.keyboard.press('Enter');await settled('All');
  checks.push('arrows/Home/End and Enter/Space support keyboard filtering with visible focus');
  await page.evaluate(()=>window.changeCounts(100));await expect(button('All')).toContainText('105');await settled('All');
  await page.setViewportSize({width:375,height:900});await settled('All');
  await page.evaluate(()=>window.selectFilter('Drafts'));await settled('Drafts');
  checks.push('count changes, viewport resize and external filter updates keep the thumb aligned');
  await page.emulateMedia({reducedMotion:'reduce'});await button('Live').click();await settled('Live');
  const before=await thumb.boundingBox();await page.waitForTimeout(180);assert.deepEqual(await thumb.boundingBox(),before);
  checks.push('reduced motion jumps directly to the selected slot');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
