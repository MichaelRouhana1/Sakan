import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
const require = createRequire(path.resolve('../backend/ops/places/seed-admin.mjs'));
const { adminEmail } = require('./seed-admin.mjs');
const postgres = createRequire(path.resolve('../backend/node_modules/postgres/package.json'))('postgres');
const OWNER = '626bf397-4751-40ba-8d5e-6aadfe5545e6';
const API = 'http://127.0.0.1:3001';
const output = path.resolve('../artifacts/renew-ux');
let sql: any;
let units: any[] = [];
let placeId: string;
let wallet: any;
let page: Page;
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


test.describe('unit renewal UX', () => {
 test.describe.configure({mode:'serial'});
 test.beforeAll(async ({browser}) => {
  const env = require('node:fs').readFileSync(path.resolve('../backend/.env'),'utf8');
  const url=env.match(/^DATABASE_URL="([^"]+)"/m)?.[1];
  sql=postgres(url,{max:1});
  const [db]=await sql`select current_database() name`; if(db.name!=='studently_dev')throw new Error('Only studently_dev');
  [wallet]=await sql`select post_credits,updated_at from users where id=${OWNER}`;
  const [place]=await sql`insert into places(owner_id,kind,area,building_name,electricity,water,wifi_included) values (${OWNER},'building','Hamra','Listing time · Renewal preview','solar','state_well_24_7',true) returning id`;
  placeId=place.id;
  const defs=[['Sunny studio',10,false,false],['Garden room',2,false,false],['Courtyard room',-2,false,false],['Balcony studio',7,true,false],['Shared room',2,true,true]];
  for(const [title,days,auto,beds] of defs) {
   const [unit]=await sql`insert into listings(poster_id,place_id,unit_type,gender_rule,status,availability,space_type,property_type,monthly_rent_usd,title,published_at,expires_at,auto_renew,beds_total,beds_available,inventory_needs_confirmation)
     values (${OWNER},${placeId},${beds?'shared_bed':'private_room'},'any','active','available',${beds?'shared_room':'private_room'},'dormitory',450,${title},now(),now()+${Number(days)}*interval '1 day',${auto},${beds?3:null},${null},${beds}) returning *`;
   units.push(unit);
  }
  await sql`update users set post_credits=10 where id=${OWNER}`;
  await mkdir(output,{recursive:true});
  page=await browser.newPage();
  await signIn(page);
 });
 test.afterAll(async () => {
  await page?.close().catch(()=>{});
  if(!sql)return;
  for(const unit of units){
   await sql`delete from listing_charge_ledger where listing_id=${unit.id}`;
   await sql`delete from notification_deliveries where listing_id=${unit.id}`;
   await sql`delete from listing_lifecycle_events where listing_id=${unit.id}`;
   await sql`delete from listings where id=${unit.id}`;
  }
  if(placeId)await sql`delete from places where id=${placeId}`;
  if(wallet)await sql`update users set post_credits=${wallet.post_credits},updated_at=${wallet.updated_at} where id=${OWNER}`;
  const [restored]=await sql`select post_credits from users where id=${OWNER}`;
  const [leftover]=await sql`select count(*)::int n from places where id=${placeId}`;
  require('node:fs').writeFileSync(path.join(output,'restoration.json'),JSON.stringify({
    walletRestored:restored.post_credits===wallet.post_credits,
    originalPostCredits:wallet.post_credits,
    restoredPostCredits:restored.post_credits,
    previewPlacesRemaining:leftover.n,
    temporaryUnitsRemoved:units.length,
  },null,2));
  console.log('RESTORED dev wallet and removed preview units/place');
  await sql.end();
 });
 test('card states, compact auto-renew, and confirmation screenshots',async()=>{
  await page.setViewportSize({width:1600,height:1900});
  await page.goto('/hosting/listing', { waitUntil: 'commit' });
  await expect(page.getByTestId(`place-${placeId}`)).toBeVisible({timeout:30000});
  const group=page.getByTestId(`place-${placeId}`);
  await expect(group.getByText(/Live · 10 days left/)).toBeVisible();
  await expect(group.getByText('Expiring in 2 days',{exact:true}).first()).toBeVisible();
  await expect(group.getByText('Expired',{exact:true})).toBeVisible();
  await expect(group.getByText(/Next renewal by/)).toBeVisible();
  await expect(group.getByText('Blocked: confirm beds',{exact:true})).toBeVisible();
  await group.scrollIntoViewIfNeeded();
  await group.screenshot({path:path.join(output,'card-states.png')});
  const cards=group.getByTestId(/^unit-/);
  for(const [i,name] of ['live','expiring','expired','auto-renew-on','auto-renew-blocked'].entries()){
   await cards.filter({has:page.getByText(units[i].title,{exact:true})}).screenshot({path:path.join(output,`${name}.png`)});
  }
  const live=cards.filter({has:page.getByText('Sunny studio',{exact:true})});
  const toggle=live.getByRole('switch');
  await toggle.click();
  await expect(live.getByText(/Next renewal by/)).toBeVisible();
  expect((await sql`select auto_renew from listings where id=${units[0].id}`)[0].auto_renew).toBe(true);
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await live.getByRole('button',{name:'Auto-renew details for Sunny studio',exact:true}).click();
  await expect(page.getByText(/Renews for 30 days with 1 post credit in the final hour/)).toBeVisible();
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await live.getByRole('button',{name:'Actions for Sunny studio',exact:true}).click();
  await page.getByTestId('workspace-dialog').getByRole('button',{name:'Renew',exact:true}).click();
  await expect(page.getByText('Renew this unit?',{exact:true})).toBeVisible();
  await expect(page.getByText('CURRENT EXPIRY',{exact:true})).toBeVisible();
  await expect(page.getByText('NEW EXPIRY',{exact:true})).toBeVisible();
  await expect.poll(() => page.getByTestId('renew-confirmation').evaluate(element => {
    let opacity=1;
    for(let node: Element | null=element;node;node=node.parentElement) opacity*=Number(getComputedStyle(node).opacity);
    return opacity;
  })).toBe(1);
  await page.getByTestId('renew-confirmation').screenshot({path:path.join(output,'renew-confirmation.png')});
  const response=page.waitForResponse(r=>r.url().endsWith(`/${units[0].id}/renew`)&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Renew · 1 credit',exact:true}).click();expect((await response).status()).toBe(200);
  await expect(page.getByText('Renewed for 30 more days',{exact:true})).toBeVisible();
  const [renewed]=await sql`select expires_at from listings where id=${units[0].id}`;
  expect(renewed.expires_at.getTime()).toBe(units[0].expires_at.getTime()+30*86400000);
  const [untouched]=await sql`select expires_at from listings where id=${units[1].id}`;expect(untouched.expires_at.getTime()).toBe(units[1].expires_at.getTime());
 });
 test('402 buy-credit return and 409 bed-count recovery',async()=>{
  await sql`update users set post_credits=0 where id=${OWNER}`;
  await page.goto(`/hosting/listing/${units[2].id}/renew`, { waitUntil: 'commit' });
  const failure=page.waitForResponse(r=>r.url().endsWith(`/${units[2].id}/renew`)&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Renew · 1 credit',exact:true}).click();expect((await failure).status()).toBe(402);
  await expect(page.getByText('You need 1 post credit to renew this unit.')).toBeVisible();
  await page.getByRole('button',{name:'Buy credits',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/hosting/credits.*${units[2].id}.*renew`));
  await expect(page.getByText('How listing time works',{exact:true})).toBeVisible();
  await sql`update users set post_credits=2 where id=${OWNER}`;
  await page.goto(`/hosting/listing/${units[4].id}/renew`, { waitUntil: 'commit' });
  const beds=page.waitForResponse(r=>r.url().endsWith(`/${units[4].id}/renew`)&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Renew · 1 credit',exact:true}).click();expect((await beds).status()).toBe(409);
  await expect(page.getByText('Confirm available beds before renewing',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Confirm available beds',exact:true})).toBeVisible();
  expect(Number((await sql`select post_credits from users where id=${OWNER}`)[0].post_credits)).toBe(2);
  await page.getByRole('button',{name:'Confirm available beds',exact:true}).click();
  await page.getByRole('textbox',{name:'Available beds',exact:true}).fill('2');
  await page.getByRole('button',{name:'Save bed counts',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Available beds',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Renew · 1 credit',exact:true}).click();await expect(page.getByText('Renewed for 30 more days',{exact:true})).toBeVisible();
 });
 test('check-in Yes is free; expired hidden from search and public pages',async()=>{
  await page.goto(`/hosting/listing/${units[1].id}/outcome`, { waitUntil: 'commit' });
  const before=Number((await sql`select post_credits from users where id=${OWNER}`)[0].post_credits);
  await page.getByRole('button',{name:/Yes, still available/}).click();
  await expect(page.getByText('Thanks — confirmed still available. No credit was spent.',{exact:true})).toBeVisible();
  expect(Number((await sql`select post_credits from users where id=${OWNER}`)[0].post_credits)).toBe(before);
  expect((await page.request.get(`${API}/api/listings/${units[2].id}`)).status()).toBe(404);
  const result=await page.request.get(`${API}/api/listings?q=Courtyard&pageSize=100`);const body=await result.json();expect(body.data.some((l:any)=>l.id===units[2].id)).toBe(false);
 });
});
