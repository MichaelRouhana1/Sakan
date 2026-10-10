// Creates and removes its own database. Never applies migrations to DATABASE_URL itself.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const source = new URL(process.env.DATABASE_URL);
const name = `skoun_promotion_test_${randomUUID().replaceAll('-', '')}`;
const admin = postgres(source.toString(), { max: 1, onnotice: () => {} });
let database;
let passed = 0;
const check = (label, fn) => Promise.resolve().then(fn).then(() => { passed++; console.log(`PASS ${label}`); });
try {
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  source.pathname = `/${name}`;
  process.env.DATABASE_URL = source.toString();
  database = postgres(source.toString(), { max: 1, onnotice: () => {} });
  const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  for (const entry of journal.entries) {
    const migration = await readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) await database.unsafe(statement);
  }
  console.log('PASS all migrations on isolated database');
  const { DEFAULT_PROMOTION_CATALOG, getPromotionCatalog } = await import('../dist/config/promotion-catalog.js');
  const config = structuredClone(DEFAULT_PROMOTION_CATALOG);
  config.salesEnabled = true;
  config.products.forEach(p => p.priceStatus = 'published');
  config.packs.forEach((p, i) => { p.priceStatus = 'published'; p.amountUsdCents = [1200, 5000, 10000][i]; });
  process.env.PROMOTION_CATALOG_JSON = JSON.stringify(config);
  process.env.PROMOTION_PLACEMENT_ENABLED = 'true';
  const service = await import('../dist/modules/promotions/promotions.service.js');
  const activity = await import('../dist/modules/listing-activity/listing-activity.service.js');
  const placement = await import('../dist/modules/listing-activity/placement.service.js');
  const { db } = await import('../dist/db/index.js');
  const { sql } = await import('drizzle-orm');
  const [owner] = await database`INSERT INTO users(role,boost_credits,boost_credit_units_version,legacy_boost_credit_unit_rate) VALUES ('poster',100000,1,1200) RETURNING id`;
  async function listing(area = 'Hamra', posterId = owner.id) {
    const [l] = await database`INSERT INTO listings(poster_id,status,availability,listing_type,monthly_rent_usd,electricity,water,wifi_included,area,title,published_at,expires_at) VALUES (${posterId},'active','available','studio',500,'solar','state_well_24_7',true,${area},'Test home',now()-interval '20 days',now()+interval '30 days') RETURNING *`;
    await database`INSERT INTO listing_photos(listing_id,url,sort_order) VALUES (${l.id},'https://example.com/1',0),(${l.id},'https://example.com/2',1),(${l.id},'https://example.com/3',2)`;
    return l;
  }
  const buy = (l, productId = 'featured_7', mode = 'start', extra = {}) => service.createPromotion(owner.id, { listingId:l.id, productId, mode, marketKey:`area:${l.area}`, autoRenew:false, catalogVersion:config.version, idempotencyKey:randomUUID(), ...extra });
  const homes = await Promise.all(Array.from({ length: 5 }, () => listing()));
  let live;
  await check('slot cap under concurrent purchases', async () => {
    const attempts = await Promise.allSettled(homes.map(l => buy(l)));
    live = attempts.filter(x => x.status === 'fulfilled').map(x => x.value);
    if (!live.length) throw attempts[0].reason;
    assert.equal(live.length, 3);
    assert.equal(attempts.filter(x => x.status === 'rejected').length, 2);
  });
  let queued;
  await check('queue is uncharged and undo refunds once, then worker fills vacancy', async () => {
    const unused = homes.find(l => !live.some(c => c.listingId === l.id));
    queued = await buy(unused, 'featured_7', 'queue');
    assert.equal(queued.spentUnits, 0);
    assert.equal(queued.autoRenew, false);
    const before = (await database`SELECT boost_credits FROM users WHERE id=${owner.id}`)[0].boost_credits;
    await Promise.all([service.campaignAction(owner.id,live[0].id,'undo'),service.campaignAction(owner.id,live[0].id,'undo')]);
    const after = (await database`SELECT boost_credits FROM users WHERE id=${owner.id}`)[0].boost_credits;
    assert.equal(after-before, 1200);
    await Promise.all([service.processPromotions(),service.processPromotions()]);
    assert.equal((await service.readPromotion(owner.id,queued.id)).status,'active');
  });
  await check('stable session ordering, fair first position, filters exclude paid cards', async () => {
    const ids = await database`SELECT listing_id FROM promotion_campaigns WHERE status='active'`;
    const candidates = ids.map(x => ({id:x.listing_id}));
    const session = randomUUID();
    const a = await placement.enrichPlacements(candidates,{areas:['Hamra']},session);
    const b = await placement.enrichPlacements(candidates,{areas:['Hamra']},session);
    assert.deepEqual(a.map(l => l.promotion.position),b.map(l => l.promotion.position));
    const first = {};
    for(let i=0;i<9;i++) { const rows = await placement.enrichPlacements(candidates,{areas:['Hamra']},randomUUID()); const id = rows.find(l => l.promotion.position===0).id; first[id]=(first[id]??0)+1; }
    assert.deepEqual(Object.values(first),[3,3,3]);
    assert.deepEqual(await placement.enrichPlacements([],{areas:['Hamra']},randomUUID()),[]);
    assert.ok((await placement.enrichPlacements(candidates,{areas:['Elsewhere']},randomUUID())).every(l => !l.promotion));
  });
  await check('durable impression/tap dedupe, signed attribution, cost per tap', async () => {
    const c = live[1]; const sessionId=randomUUID();
    const [row] = await placement.enrichPlacements([{id:c.listingId}],{areas:['Hamra']},sessionId);
    const input={sessionId,eventId:randomUUID(),platform:'web',placementToken:row.promotion.token};
    const actor={ip:'127.0.0.10'};
    await database`INSERT INTO listing_activity_coverage(id,started_at) VALUES ('listing_activity',now()+interval '1 second') ON CONFLICT(id) DO UPDATE SET started_at=EXCLUDED.started_at`;
    await Promise.all([activity.recordActivity(c.listingId,'featured_impression',input,actor,'web_viewable'),activity.recordActivity(c.listingId,'featured_impression',{...input,eventId:randomUUID()},actor,'web_viewable')]);
    await Promise.all([activity.recordActivity(c.listingId,'contact_tap',{...input,eventId:randomUUID()},actor),activity.recordActivity(c.listingId,'contact_tap',{...input,eventId:randomUUID()},actor)]);
    const report=await activity.getCampaignAnalytics(owner.id,c.id);
    assert.equal(report.impressions.total,1); assert.equal(report.attributedTaps,1); assert.equal(report.costPerWhatsappTap,12); assert.equal(report.before,null);
    assert.equal((await activity.recordActivity(c.listingId,'featured_impression',{...input,placementToken:'forged',eventId:randomUUID()},actor,'web_viewable')).counted,false);
  });
  await check('under offer, rented, archived, expired and quality gates', async () => {
    for(const change of ["availability='pending'","availability='rented'","status='archived'","expires_at=now()-interval '1 day'","electricity='generator_24_7',generator_amperes=NULL"]) {
      const l=await listing('Gate');await database.unsafe(`UPDATE listings SET ${change} WHERE id=$1`,[l.id]);
      await assert.rejects(()=>buy(l));
    }
    const l=await listing('Gate');await database`DELETE FROM listing_photos WHERE listing_id=${l.id}`;await assert.rejects(()=>buy(l));
  });
  await check('pause releases slot and resume preserves remaining time', async () => {
    const l=await listing('Dorm');const c=await buy(l,'featured_14');
    const paused=await service.campaignAction(owner.id,c.id,'pause');assert.equal(paused.status,'paused');assert.equal(paused.spentUnits,2100);
    assert.equal((await service.promotionOptions(owner.id,l.id)).markets[0].availableSlots,3);
    const resumed=await service.campaignAction(owner.id,c.id,'resume');assert.equal(resumed.status,'active');assert.equal(resumed.spentUnits,2100);
  });
  await check('stop on rented returns only unused time and never refunds twice', async () => {
    const l=await listing('Refund');const c=await buy(l,'featured_7');
    await database`UPDATE promotion_campaigns SET active_since=now()-interval '2 days',undo_until=now()-interval '1 day' WHERE id=${c.id}`;
    await db.transaction(async tx => {await service.promotionLock(tx);await tx.execute(sql`UPDATE listings SET availability='rented' WHERE id=${l.id}::uuid`);await service.stopListingPromotions(tx,l.id,'listing_rented');});
    await service.processPromotions();await service.campaignAction(owner.id,c.id,'stop');
    const final=await service.readPromotion(owner.id,c.id);assert.equal(final.refundedUnits,858);assert.equal(final.status,'stopped');
    await assert.rejects(()=>service.campaignAction(owner.id,c.id,'undo'));
  });
  await check('Bump executes once per Beirut day and retries do not repeat', async () => {
    const l=await listing('Bump');const c=await buy(l,'bump_3');
    const tomorrow=new Date(Date.parse(c.nextBumpAt)+1000);
    await service.processPromotions(tomorrow);await service.processPromotions(tomorrow);
    const rows=await database`SELECT * FROM promotion_bump_executions WHERE campaign_id=${c.id}`;
    assert.equal(rows.length,2);assert.equal(new Set(rows.map(r=>r.local_date)).size,2);
  });
  await check('idempotent purchase and disabled sales', async () => {
    const l=await listing('Repeat');const idempotencyKey=randomUUID();
    const [a,b]=await Promise.all([buy(l,'bump_3','start',{idempotencyKey}),buy(l,'bump_3','start',{idempotencyKey})]);assert.equal(a.id,b.id);
    process.env.PROMOTION_PLACEMENT_ENABLED='false';await assert.rejects(()=>buy(homes[4]));process.env.PROMOTION_PLACEMENT_ENABLED='true';
    assert.equal(getPromotionCatalog().products.length,6);
  });
  await check('listing mutations immediately stop promotions and deletion preserves reports', async () => {
    const { listingsRepository: repo }=await import('../dist/modules/listings/listings.repository.js');
    for (const mutation of ['pending','archive','delete']) {
      const l=await listing(`Mutation ${mutation}`);const c=await buy(l);
      if(mutation==='pending') await repo.setAvailability(l.id,owner.id,'pending');
      if(mutation==='archive') await repo.archiveById(l.id,owner.id);
      if(mutation==='delete') await repo.deleteByOwner(l.id,owner.id);
      const stopped=await service.readPromotion(owner.id,c.id);assert.equal(stopped.status,'stopped');assert.equal(stopped.refundedUnits,1200);
      assert.equal((await service.listPromotions(owner.id,l.id)).length,1);
      await activity.getCampaignAnalytics(owner.id,c.id);
    }
  });
  await check('expiry stops search immediately and worker refunds from actual expiry', async () => {
    const l=await listing('Expired');const c=await buy(l);
    await database`UPDATE promotion_campaigns SET active_since=now()-interval '2 days' WHERE id=${c.id}`;
    await database`UPDATE listings SET expires_at=now()-interval '1 day' WHERE id=${l.id}`;
    assert.equal((await service.getListingPromotions([l.id])).length,0);
    await service.processPromotions();const stopped=await service.readPromotion(owner.id,c.id);
    assert.equal(stopped.status,'stopped');assert.equal(stopped.refundedUnits,1029);
  });
  await check('server catalog, legacy conversion and credit pack approval are atomic', async () => {
    const { getCreditCatalog }=await import('../dist/config/promotion-catalog.js');
    const { createPurchaseSchema }=await import('../dist/modules/credits/credits.schemas.js');
    const { creditsRepository }=await import('../dist/modules/credits/credits.repository.js');
    const { ensurePromotionWallet }=await import('../dist/modules/credits/promotion-wallet.js');
    assert.equal(createPurchaseSchema.safeParse({packId:'promotion_60',catalogVersion:config.version,amountUsdCents:1}).success,false);
    const packs=getCreditCatalog();assert.equal(packs.autoRenewDefault,false);assert.ok(packs.packs.find(p=>p.id==='promotion_150').savingsPercent>0);
    const [legacy]=await database`INSERT INTO users(role,boost_credits) VALUES ('poster',2) RETURNING id`;
    const wallets=await Promise.all([db.transaction(tx=>ensurePromotionWallet(tx,legacy.id)),db.transaction(tx=>ensurePromotionWallet(tx,legacy.id))]);
    assert.ok(wallets.every(w=>w.boostCreditUnits===2400));
    const transaction=await creditsRepository.createPending({userId:legacy.id,referenceId:randomUUID().replaceAll("-", ""),bundleType:'boost_pack',boostCreditUnitsVersion:1,boostCreditsDelta:6000,postCreditsDelta:0,amountUsdCents:5000,channel:'whish'});
    const review={kind:'api_key',clerkId:null,userId:null};
    await Promise.all([creditsRepository.approveTransaction(transaction.id,review),creditsRepository.approveTransaction(transaction.id,review)]);
    assert.equal((await db.transaction(tx=>ensurePromotionWallet(tx,legacy.id))).boostCreditUnits,8400);
  });
  await check('opt-in auto-renew creates only one successor and never renews the listing', async () => {
    const l=await listing('Renew');const c=await buy(l,'bump_3','start',{autoRenew:true});
    const expiryBefore=(await database`SELECT expires_at FROM listings WHERE id=${l.id}`)[0].expires_at;
    const after=new Date(Date.parse(c.endsAt)+1000);
    await Promise.all([service.processPromotions(after),service.processPromotions(after)]);
    const children=await database`SELECT * FROM promotion_campaigns WHERE renewed_from_id=${c.id}`;
    assert.equal(children.length,1);assert.equal(children[0].status,'active');
    assert.equal(String((await database`SELECT expires_at FROM listings WHERE id=${l.id}`)[0].expires_at),String(expiryBefore));
  });
  await check('Phase 0 sorting ignores expired boosts, cutover credits remaining legacy time once', async () => {
    const { listingsRepository: repo }=await import('../dist/modules/listings/listings.repository.js');
    const { cutoverLegacyPromotions }=await import('../dist/modules/promotions/legacy-promotions.service.js');
    const old=await listing('Legacy');const fresh=await listing('Legacy');
    await database`UPDATE listings SET published_at=now()-interval '10 days',boosted_until=now()-interval '1 day' WHERE id=${old.id}`;
    await database`UPDATE listings SET published_at=now()-interval '1 day' WHERE id=${fresh.id}`;
    process.env.PROMOTION_PLACEMENT_ENABLED='false';
    assert.deepEqual((await repo.listActiveByAreas(['Legacy'],'newest')).map(l=>l.id),[fresh.id,old.id]);
    await database`UPDATE listings SET boosted_until=now()+interval '3.5 days' WHERE id=${old.id}`;
    assert.equal((await repo.listActiveByAreas(['Legacy'],'newest'))[0].id,old.id);
    const before=(await database`SELECT boost_credits FROM users WHERE id=${owner.id}`)[0].boost_credits;
    await Promise.all([cutoverLegacyPromotions(),cutoverLegacyPromotions()]);
    assert.equal((await database`SELECT boost_credits FROM users WHERE id=${owner.id}`)[0].boost_credits-before,600);
    assert.equal((await database`SELECT boosted_until FROM listings WHERE id=${old.id}`)[0].boosted_until,null);
    process.env.PROMOTION_PLACEMENT_ENABLED='true';
  });
  await check('simultaneous purchases cannot overspend a wallet', async () => {
    const [small]=await database`INSERT INTO users(role,boost_credits,boost_credit_units_version,legacy_boost_credit_unit_rate) VALUES ('poster',100,1,1200) RETURNING id`;
    const choices=await Promise.all([listing('Small wallet',small.id),listing('Small wallet',small.id)]);
    const attempts=await Promise.allSettled(choices.map(l=>service.createPromotion(small.id,{listingId:l.id,productId:'bump_3',mode:'start',autoRenew:false,catalogVersion:config.version,idempotencyKey:randomUUID()})));
    assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
    assert.equal((await database`SELECT boost_credits FROM users WHERE id=${small.id}`)[0].boost_credits,0);
    const other=choices.find(l=>!attempts.some(a=>a.status==='fulfilled'&&a.value.listingId===l.id));
    const queued=await service.createPromotion(small.id,{listingId:other.id,productId:'featured_3',mode:'queue',autoRenew:false,catalogVersion:config.version,idempotencyKey:randomUUID()});
    await service.processPromotions();
    assert.equal((await service.readPromotion(small.id,queued.id)).status,'action_needed');
    assert.equal((await service.readPromotion(small.id,queued.id)).spentUnits,0);
  });
  await check('before/after reports use equal active intervals and net cost per attributed tap', async () => {
    const l=await listing('Report');const c=await buy(l,'featured_14');
    await service.campaignAction(owner.id,c.id,'stop');
    const start=new Date(Date.now()-4*86400000),end=new Date(start.getTime()+2*86400000);
    await database`UPDATE promotion_campaigns SET started_at=${start},ends_at=${end},refunded_units=700 WHERE id=${c.id}`;
    await database`UPDATE promotion_service_intervals SET started_at=${start},ended_at=${end} WHERE campaign_id=${c.id}`;
    await database`UPDATE listing_activity_coverage SET started_at=now()-interval '40 days'`;
    for (const [when,count] of [[new Date(start.getTime()-86400000),3],[new Date(start.getTime()+86400000),5],[new Date(end.getTime()+86400000),7]]) {
      await database`INSERT INTO listing_activity_events(event_id,listing_id,listing_id_snapshot,kind,actor_key,platform,occurred_at) SELECT gen_random_uuid(),${l.id},${l.id},'view','test','web',${when} FROM generate_series(1,${count})`;
    }
    await database`INSERT INTO listing_activity_events(event_id,listing_id,listing_id_snapshot,boost_id,kind,actor_key,platform,occurred_at) VALUES (gen_random_uuid(),${l.id},${l.id},${c.id},'contact_tap','test','web',${new Date(start.getTime()+86400000)})`;
    const report=await activity.getCampaignAnalytics(owner.id,c.id);
    assert.equal(report.period.activeSeconds,2*86400);assert.equal(report.before.views,3);assert.equal(report.during.views,5);assert.equal(report.costPerWhatsappTap,14);
  });
  await check('spring daylight-saving transition cannot add a fourth daily bump', async () => {
    const l=await listing('DST');const c=await buy(l,'bump_3');
    const start=new Date('2027-03-27T10:00:00Z');
    await database`UPDATE listings SET expires_at='2028-01-01' WHERE id=${l.id}`;
    await database`UPDATE promotion_campaigns SET started_at=${start},active_since=${start},ends_at=${new Date(start.getTime()+3*86400000)},next_bump_at=((${start}::timestamptz AT TIME ZONE 'Asia/Beirut')+interval '1 day') AT TIME ZONE 'Asia/Beirut' WHERE id=${c.id}`;
    await database`DELETE FROM promotion_bump_executions WHERE campaign_id=${c.id}`;
    await database`INSERT INTO promotion_bump_executions(campaign_id,local_date,executed_at) VALUES (${c.id},'2027-03-27',${start})`;
    for(const hours of [24,48,71.5]) await service.processPromotions(new Date(start.getTime()+hours*3600000));
    assert.equal((await database`SELECT count(*)::int AS n FROM promotion_bump_executions WHERE campaign_id=${c.id}`)[0].n,3);
  });
  console.log(`${passed} promotion integration scenarios passed`);
} catch(error) {
  console.error(error); process.exitCode=1;
} finally {
  if(database) await database.end();
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
  process.exit(process.exitCode ?? 0);
}
