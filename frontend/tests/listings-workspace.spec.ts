import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
const require=createRequire(path.resolve('../backend/ops/places/seed-admin.mjs'));
const {adminEmail}=require('./seed-admin.mjs');
const postgres=createRequire(path.resolve('../backend/node_modules/postgres/package.json'))('postgres');
const OWNER='626bf397-4751-40ba-8d5e-6aadfe5545e6';
const output=path.resolve('../artifacts/listings-workspace');
let sql:any,page:Page,wallet:any;
let units:any[]=[],places:string[]=[];
let limit=24, hold=false,release:(()=>void)|undefined;
function releaseLoading(){ release?.(); }
let perRowGets:string[]=[],timings:any[]=[];
async function clerkTicket(): Promise<string> {
  const env = require("node:fs").readFileSync(
    path.resolve('../backend/.env'),
    "utf8",
  ) as string;
  const key = env.match(/^CLERK_SECRET_KEY="?([^"\r\n]+)"?/m)?.[1];
  if (!key) throw new Error("CLERK_SECRET_KEY is missing");
  const headers = { authorization: `Bearer ${key}`, "content-type": "application/json" };
  const listed = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(adminEmail)}`,
    { headers },
  );
  if (!listed.ok) throw new Error(`Clerk user lookup failed (${listed.status})`);
  const users = (await listed.json()) as { id: string; email_addresses?: { email_address?: string }[] }[];
  const user = users.find((entry) =>
    entry.email_addresses?.some((email) => email.email_address?.toLowerCase() === adminEmail),
  );
  if (!user) throw new Error("Clerk test host was not found");
  const created = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers,
    body: JSON.stringify({ user_id: user.id, expires_in_seconds: 600 }),
  });
  if (!created.ok) throw new Error(`Clerk sign-in token failed (${created.status})`);
  const body = (await created.json()) as { token?: string };
  if (!body.token) throw new Error("Clerk sign-in token was empty");
  return body.token;
}

async function signIn(target: Page) {
  const ticket = await clerkTicket();
  await target.goto("/hosting/listing", { waitUntil: "domcontentloaded" });
  await target.waitForFunction(() => {
    const clerk = (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk;
    return Boolean(clerk?.loaded);
  }, undefined, { timeout: 30000 });
  const signedIn = await target.evaluate(async (value) => {
    const clerk = (window as unknown as {
      Clerk: {
        client: { signIn: { create: (input: { strategy: string; ticket: string }) => Promise<{ status?: string; createdSessionId?: string | null }> } };
        setActive: (input: { session: string }) => Promise<unknown>;
      };
    }).Clerk;
    const attempt = await clerk.client.signIn.create({ strategy: "ticket", ticket: value });
    if (attempt.status !== "complete" || !attempt.createdSessionId) return attempt.status ?? "incomplete";
    await clerk.setActive({ session: attempt.createdSessionId });
    return "complete";
  }, ticket);
  expect(signedIn).toBe("complete");
  await expect(target.getByRole("button", { name: /credits/i }).first()).toBeVisible({
    timeout: 30000,
  });
}

async function dashboard() {
  const link=page.getByRole('link',{name:'Listings',exact:true});
  if(new URL(page.url()).pathname!=='/hosting/listing' && await link.isVisible().catch(()=>false)) await link.click();
  else await page.goto('/hosting/listing',{waitUntil:'domcontentloaded'});
  await expect(page.getByTestId('listings-workspace')).toBeVisible({timeout:30000});
  await expect(page.getByTestId('listings-loading')).toHaveCount(0,{timeout:30000});
}
async function screenshot(name:string) {
  await page.screenshot({path:path.join(output,`${name}.png`)});
}
async function settledDialog() {
  await expect.poll(()=>page.getByTestId('workspace-dialog').evaluate(el=>{
    let opacity=1;for(let node:Element|null=el;node;node=node.parentElement)opacity*=Number(getComputedStyle(node).opacity);return opacity;
  })).toBe(1);
}
test.describe('host listings workspace',()=>{
 test.describe.configure({mode:'serial'});
 test.beforeAll(async({browser})=>{
  await mkdir(output,{recursive:true});
  const env=require('node:fs').readFileSync(path.resolve('../backend/.env'),'utf8');
  sql=postgres(env.match(/^DATABASE_URL="([^"]+)"/m)?.[1],{max:1});
  const [db]=await sql`select current_database() name`;expect(db.name).toBe('studently_dev');
  [wallet]=await sql`select post_credits,updated_at from users where id=${OWNER}`;
  for(const [name,kind,area] of [['Sunny home','apartment','Achrafieh'],['Bliss House','building','Hamra'],['Cedar Courtyard','building','Achrafieh'],['Sea View House','building','Mar Mikhael']]) {
   const [p]=await sql`insert into places(owner_id,kind,area,building_name,electricity,water,wifi_included) values (${OWNER},${kind},${area},${name},'solar','state_well_24_7',true) returning id`;places.push(p.id);
  }
  for(let i=0;i<24;i++) {
   const group=i===0?0:i<=8?1:i<=16?2:3;
   const shared=i===3||i===7||i===12||i===20;
   const rented=i===4||i===12||i===18;
   const needsBeds=i===3;
   const days=i===1||i===10||i===19?-2:i===2||i===3||i===9?2:18;
   const enabled=i===3||i===5||i===9||i===15;
   const title=i===0?'Sunny home':i===3?'Shared garden room':i===4?'Rented room':i===6?'3-bedroom apartment in Dekwaneh · Campus: Dekouaneh Campus':`Room ${String(i).padStart(2,'0')}`;
   const [unit]=await sql`insert into listings(poster_id,place_id,unit_type,gender_rule,status,availability,space_type,property_type,monthly_rent_usd,title,published_at,expires_at,auto_renew,beds_total,beds_available,inventory_needs_confirmation,view_count,contact_tap_count,price_basis)
    values (${OWNER},${places[group]},${i===0?'whole_apartment':shared?'shared_bed':'private_room'},'any','active',${rented?'rented':i===6?'pending':'available'},${i===0?'entire_place':shared?'shared_room':'private_room'},${i===0?'apartment':'dormitory'},${i===0?650:shared?250:450},${title},now(),now()+${days}*interval '1 day',${enabled},${shared?4:null},${shared?(needsBeds?null:rented?0:2):null},${needsBeds},${148+i*7},${6+i},${shared?'per_bed_month':'per_unit_month'}) returning *`;
   units.push(unit);
  }
  await sql`update users set post_credits=3 where id=${OWNER}`;
  page=await browser.newPage();
  page.on('pageerror',error=>console.log('BROWSER ERROR',error.message));
  // Isolate portfolio fixtures without modifying the host's real draft slots.
  await page.route('**/api/listings/drafts',route=>route.fulfill({json:{data:{main:null,working:null}}}));
  page.on('request',req=>{if(req.method()==='GET'&&/\/api\/listings\/[0-9a-f-]+\/(auto-renew|inventory)$/.test(req.url()))perRowGets.push(req.url());});
  await page.route('**/api/listings/mine',async route=>{
   if(hold)await new Promise<void>(resolve=>{release=resolve;});
   const response=await route.fetch();
   const body=await response.json();
   const visible=new Set(units.slice(0,limit).map(unit=>unit.id));
   await route.fulfill({response,json:{...body,data:body.data.filter((unit:any)=>visible.has(unit.id))}});
  });
  await signIn(page);
 });
 test.afterAll(async()=>{
  release?.();await page?.close().catch(()=>{});if(!sql)return;
  for(const unit of units){
   await sql`delete from listing_charge_ledger where listing_id=${unit.id}`;
   await sql`delete from listing_lifecycle_events where listing_id=${unit.id}`;
   await sql`delete from notification_deliveries where listing_id=${unit.id}`;
   await sql`delete from listings where id=${unit.id}`;
  }
  for(const id of places)await sql`delete from places where id=${id}`;
  if(wallet)await sql`update users set post_credits=${wallet.post_credits},updated_at=${wallet.updated_at} where id=${OWNER}`;
  const [balance]=await sql`select post_credits from users where id=${OWNER}`;
  const [leftover]=await sql`select count(*)::int n from listings where place_id in ${sql(places)}`;
  await writeFile(path.join(output,'restoration.json'),JSON.stringify({walletRestored:balance.post_credits===wallet.post_credits,originalPostCredits:wallet.post_credits,restoredPostCredits:balance.post_credits,temporaryUnitsRemoved:units.length,remainingTemporaryUnits:leftover.n,temporaryPlacesRemoved:places.length},null,2));
  if(timings.length)await writeFile(path.join(output,'render-timings.json'),JSON.stringify(timings,null,2));
  console.log('RESTORED dev wallet; removed temporary units and places');
  await sql.end();
 });

 test('1, 10 and 24 units at 375, 768 and 1440; no per-row requests or horizontal overflow',async()=>{
  for(const count of [1,10,24])for(const width of [375,768,1440]){
   limit=count;perRowGets=[];await page.setViewportSize({width,height:1000});
   const start=Date.now();await dashboard();
   await expect(page.getByTestId('unit-list').getByTestId(/^unit-/)).toHaveCount(count);
   timings.push({units:count,width,readyMs:Date.now()-start});
   expect(perRowGets).toEqual([]);
   const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth,workspace:(()=>{const el=document.querySelector('[data-testid="listings-workspace"]')!;return el.scrollWidth>el.clientWidth+1;})()}));
   expect(overflow).toEqual({body:false,workspace:false});
   const first=page.getByTestId(`unit-${units[0].id}`);
   await expect(first.getByTestId('listing-thumbnail')).toHaveCSS('width',`${width===1440?72:width===768?64:56}px`);
   await expect(first.getByText('Sunny home',{exact:true})).toHaveCSS('font-size','16px');
   const smallText=await page.getByTestId('unit-list').evaluate(el=>Array.from(el.querySelectorAll('div')).filter(node=>node.childElementCount===0&&node.textContent?.trim()).filter(node=>parseFloat(getComputedStyle(node).fontSize)<13).map(node=>node.textContent));
   if(width===375)expect(smallText).toEqual([]);
   await expect(first.getByText('Off',{exact:true})).toHaveCount(0);
   await expect(first.getByText('Sunny home · Achrafieh ⌄',{exact:true})).toHaveCount(0);
   if(count>=10){
    const campus=page.getByTestId(`unit-${units[6].id}`);
    await expect(campus.getByText('3-bedroom apartment in Dekwaneh',{exact:true})).toBeVisible();
    await expect(campus.getByText(/· Dekouaneh Campus$/)).toBeVisible();
    if(width===1440)expect(await campus.getByText('3-bedroom apartment in Dekwaneh',{exact:true}).evaluate(el=>getComputedStyle(el).textOverflow)).not.toBe('ellipsis');
   }
   if(count===1)await expect(page.getByRole('button',{name:/Collapse Sunny home/})).toHaveCount(0);
   if(count>=10&&width===1440){
    const rented=page.getByTestId(`unit-${units[4].id}`);
    const toggle=await rented.getByRole('switch').boundingBox();
    const primary=await rented.getByRole('button',{name:'Update availability Rented room',exact:true}).boundingBox();
    expect(toggle!.x+toggle!.width).toBeLessThanOrEqual(primary!.x);
   }
   await screenshot(`portfolio-${count}-${width}`);
  }
 });

 test('filters, urgency, search, groups, short menus and labeled auto-renew',async()=>{
  limit=24;await page.setViewportSize({width:1440,height:1000});await dashboard();
  await expect(page.getByTestId(`unit-${units[1].id}`).getByRole('button',{name:'Renew Room 01',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Filter Needs attention',exact:true}).click();
  await expect(page.getByTestId(`unit-${units[0].id}`)).toHaveCount(0);
  await page.getByRole('button',{name:'Filter All',exact:true}).click();
  await page.getByRole('textbox',{name:'Search units, places or areas'}).fill('Bliss room 02');
  await expect(page.getByTestId('unit-list').getByTestId(/^unit-/)).toHaveCount(1);
  await expect(page.getByText('1 of 8 units · 3 need attention')).toBeVisible();
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  await page.getByRole('button',{name:'Collapse Bliss House',exact:true}).click();await expect(page.getByTestId(`unit-${units[1].id}`)).toHaveCount(0);
  await page.getByRole('button',{name:'Expand Bliss House',exact:true}).click();
  const normal=page.getByTestId(`unit-${units[0].id}`);
  await normal.getByRole('button',{name:'Actions for Sunny home',exact:true}).click();
  for(const name of ['Update availability','Renew','Analytics','Edit','Promote','Was it rented?','Archive','Remove'])await expect(page.getByTestId('workspace-dialog').getByRole('button',{name,exact:true})).toBeVisible();
  await expect(page.getByTestId('workspace-dialog').getByText('Auto-renew details',{exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(page.getByTestId('workspace-dialog')).toHaveCount(0);
  await expect(normal.getByRole('button',{name:'Actions for Sunny home',exact:true})).toBeFocused();
  const toggle=normal.getByRole('switch',{name:'Auto-renew for Sunny home',exact:true});
  const renewalDate=await page.evaluate(value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric'}),units[0].expires_at.toISOString());
  await toggle.click();await expect(normal.getByText(`Next renewal by ${renewalDate}`)).toBeVisible();
  const switchColors=()=>toggle.evaluate(el=>Array.from(el.parentElement!.children).slice(0,2).map(child=>getComputedStyle(child).backgroundColor));
  await expect.poll(switchColors).toEqual(['rgb(234, 63, 74)','rgb(255, 255, 255)']);
  expect((await sql`select auto_renew from listings where id=${units[0].id}`)[0].auto_renew).toBe(true);
  await toggle.click();
  await expect(page.getByTestId('listings-toast')).toContainText('Auto-renew off.');
  await expect.poll(switchColors).toEqual(['rgb(154, 160, 168)','rgb(255, 255, 255)']);
  await screenshot('auto-renew-toast-1440');
  const beforeToast=await normal.boundingBox();
  await expect(page.getByTestId('listings-toast')).toHaveCount(0,{timeout:6000});
  const afterToast=await normal.boundingBox();
  expect(Math.abs(beforeToast!.y-afterToast!.y)).toBeLessThan(1);
  await normal.getByRole('button',{name:'Auto-renew details for Sunny home',exact:true}).click();await expect(page.getByText(/Renews for 30 days with 1 post credit in the final hour/)).toBeVisible();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  expect(perRowGets.filter(url=>url.endsWith('/auto-renew'))).toEqual([]);
 });

 test('desktop/mobile healthy, attention, rented, empty and loading screenshots',async()=>{
  for(const width of [1440,375]){
   await page.setViewportSize({width,height:1000});limit=24;await dashboard();
   await page.getByRole('textbox',{name:'Search units, places or areas'}).fill('Sunny home');await screenshot(`healthy-${width}`);
   await page.getByRole('button',{name:'Clear search',exact:true}).click();await page.getByRole('button',{name:'Filter Needs attention',exact:true}).click();await screenshot(`attention-${width}`);
   await page.getByRole('button',{name:'Filter Rented',exact:true}).click();await screenshot(`rented-${width}`);
   limit=0;await dashboard();await expect(page.getByText('Add your first listing',{exact:true})).toBeVisible();await screenshot(`empty-${width}`);
   hold=true;release=undefined;await page.goto('/hosting/listing',{waitUntil:'commit'});await expect(page.getByTestId('listings-loading')).toBeVisible({timeout:30000});await expect.poll(()=>Boolean(release),{timeout:30000}).toBe(true);await screenshot(`loading-${width}`);hold=false;releaseLoading();await expect(page.getByTestId('listings-loading')).toHaveCount(0,{timeout:30000});
  }
 });

 test('existing action flows: availability, bed count, renewal, settings, place editing and navigation',async()=>{
  limit=24;await page.setViewportSize({width:1440,height:1000});await dashboard();
  const rented=page.getByTestId(`unit-${units[4].id}`);
  await rented.getByRole('button',{name:'Update availability Rented room',exact:true}).click();await expect(page.getByRole('button',{name:'Mark vacant',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  const shared=page.getByTestId(`unit-${units[3].id}`);
  await shared.getByRole('button',{name:'Renew Shared garden room',exact:true}).click();await settledDialog();
  const conflict=page.waitForResponse(r=>r.url().endsWith(`/${units[3].id}/renew`)&&r.request().method()==='POST');await page.getByRole('button',{name:'Renew · 1 credit',exact:true}).click();expect((await conflict).status()).toBe(409);
  await expect(page.getByText('Confirm available beds before renewing',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Reminder settings',exact:true}).click();await expect(page.getByRole('switch',{name:'Email expiry reminders',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  const normal=page.getByTestId(`unit-${units[0].id}`);
  await normal.getByRole('button',{name:'Place options for Sunny home',exact:true}).click();await page.getByRole('button',{name:'Edit shared details',exact:true}).click();await expect(page.getByRole('button',{name:'Close shared details',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close shared details',exact:true}).click();
  await page.getByRole('button',{name:'Add listing',exact:true}).click();await expect(page.getByRole('button',{name:'New place',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await normal.getByRole('button',{name:'Actions for Sunny home',exact:true}).click();await page.getByTestId('workspace-dialog').getByRole('button',{name:'Renew',exact:true}).click();
  const success=page.waitForResponse(r=>r.url().endsWith(`/${units[0].id}/renew`)&&r.request().method()==='POST');await page.getByRole('button',{name:'Renew · 1 credit',exact:true}).click();expect((await success).status()).toBe(200);await expect(page.getByText('Renewed for 30 more days',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Done',exact:true}).click();
  const [renewed]=await sql`select expires_at from listings where id=${units[0].id}`;expect(renewed.expires_at.getTime()).toBe(units[0].expires_at.getTime()+30*86400000);
  await sql`update users set post_credits=0 where id=${OWNER}`;
  await page.getByTestId(`unit-${units[1].id}`).getByRole('button',{name:'Renew Room 01',exact:true}).click();const noCredits=page.waitForResponse(r=>r.url().endsWith(`/${units[1].id}/renew`)&&r.request().method()==='POST');await page.getByRole('button',{name:'Renew · 1 credit',exact:true}).click();expect((await noCredits).status()).toBe(402);await page.getByRole('button',{name:'Buy credits',exact:true}).last().click();await expect(page).toHaveURL(new RegExp(`/hosting/credits.*${units[1].id}.*renew`));
  await dashboard();await normal.getByRole('button',{name:'Edit Sunny home',exact:true}).click();await expect(page).toHaveURL(new RegExp(`edit=${units[0].id}`));await expect(page.getByRole('button',{name:'Save changes',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close edit',exact:true}).last().click();
  await normal.getByRole('button',{name:'Actions for Sunny home',exact:true}).click();
  await page.getByTestId('workspace-dialog').getByRole('button',{name:'Analytics',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/${units[0].id}/analytics`));
  await dashboard();await normal.getByRole('button',{name:'Actions for Sunny home',exact:true}).click();
  await page.getByTestId('workspace-dialog').getByRole('button',{name:'Promote',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/${units[0].id}/promote`));
  await dashboard();await page.getByTestId(`unit-${units[1].id}`).getByRole('button',{name:'Actions for Room 01',exact:true}).click();
  await page.getByTestId('workspace-dialog').getByRole('button',{name:'Was it rented?',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/${units[1].id}/outcome`));await expect(page.getByText('Was it rented?',{exact:true})).toBeVisible();
  await dashboard();const toArchive=page.getByTestId(`unit-${units[22].id}`);await toArchive.getByRole('button',{name:'Actions for Room 22',exact:true}).click();await page.getByTestId('workspace-dialog').getByRole('button',{name:'Archive',exact:true}).click();await page.getByRole('button',{name:'Confirm archive',exact:true}).click();await expect(page.getByTestId('workspace-dialog')).toHaveCount(0);expect((await sql`select status from listings where id=${units[22].id}`)[0].status).toBe('archived');
  const toRemove=page.getByTestId(`unit-${units[23].id}`);await toRemove.getByRole('button',{name:'Actions for Room 23',exact:true}).click();await page.getByTestId('workspace-dialog').getByRole('button',{name:'Remove',exact:true}).click();await page.getByRole('button',{name:'Confirm remove',exact:true}).click();await expect(page.getByTestId('workspace-dialog')).toHaveCount(0);expect((await sql`select id from listings where id=${units[23].id}`).length).toBe(0);
  await sql`update listings set auto_renew=true where id=${units[19].id}`;await dashboard();const missed=page.getByTestId(`unit-${units[19].id}`);await expect(missed.getByText('Expired · renew manually',{exact:true})).toBeVisible();await missed.getByRole('switch').click();await expect(missed.getByRole('switch')).not.toBeChecked();
 });
});
