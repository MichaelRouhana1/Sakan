import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function creationDraftChecks(client, check, details) {
  const migration = await readFile(new URL('../drizzle/0040_creation_drafts.sql', import.meta.url), 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) await client.unsafe(statement);
  const drafts = await import('../dist/modules/listings/creation-drafts.service.js');
  const { publishUnits, publishUnitsSchema, publishedBatch, publishQuote } = await import('../dist/modules/listings/unit-publish.service.js');
  const [owner, other] = await client`INSERT INTO users(role,post_credits) VALUES ('poster',20),('poster',0) RETURNING id`;
  const payload = () => ({ version: 2, place: { kind: 'apartment', data: {}, photos: [] }, contact: {},
    units: [{ id: randomUUID(), data: { photos: [] }, finished: false }], position: { screen: 'layout', unitId: '' }, completedPlace: [], returnTo: null, reviewVisited: false });
  function document() { const p = payload(); p.position.unitId = p.units[0].id; return p; }
  let draft;
  await check('server drafts have IDs, enforce ownership and survive another device reading them', async () => {
    const id = randomUUID(); draft = await drafts.createCreationDraft(owner.id, { id, payload: document() });
    assert.equal(draft.revision, 1); assert.equal((await drafts.createCreationDraft(owner.id, { id, payload: document() })).id, id);
    assert.equal((await drafts.readCreationDraft(owner.id, id)).id, id);
    await assert.rejects(() => drafts.readCreationDraft(other.id, id), /not found/);
    await assert.rejects(() => drafts.createCreationDraft(other.id, { id, payload: document() }), /not found/);
  });
  await check('last save wins, increments revisions and reports another device changing the draft', async () => {
    const a = structuredClone(draft.payload), b = structuredClone(draft.payload);
    a.units[0].data.title = 'Device A'; b.units[0].data.title = 'Device B';
    const savedA = await drafts.saveCreationDraft(owner.id, draft.id, { payload: a, revision: 1 });
    const savedB = await drafts.saveCreationDraft(owner.id, draft.id, { payload: b, revision: 1 });
    assert.equal(savedA.revision, 2); assert.equal(savedA.updatedElsewhere, false);
    assert.equal(savedB.revision, 3); assert.equal(savedB.updatedElsewhere, true);
    assert.equal((await drafts.readCreationDraft(owner.id, draft.id)).payload.units[0].data.title, 'Device B');
    draft = savedB;
  });
  await check('incomplete drafts save, but version/unit count/duplicate IDs and foreign places are rejected', async () => {
    assert.equal(drafts.creationPayloadSchema.safeParse(document()).success, true);
    const p = document(); p.units.push(...Array.from({ length: 20 }, () => ({ ...p.units[0], id: randomUUID() })));
    assert.equal(drafts.creationPayloadSchema.safeParse(p).success, false);
    const duplicate = document(); duplicate.units.push(duplicate.units[0]); assert.equal(drafts.creationPayloadSchema.safeParse(duplicate).success, false);
    const foreign = document(); foreign.place.id = randomUUID();
    await assert.rejects(() => drafts.createCreationDraft(owner.id, { id: randomUUID(), payload: foreign }), /not found/);
    assert.equal(drafts.creationPayloadSchema.safeParse({ ...document(), version: 1 }).success, false);
  });
  const batch = (row, count = 1, extra = {}) => publishUnitsSchema.parse({ draftId: row.id, expectedDraftRevision: row.revision, requestId: randomUUID(), expectedTotal: count - 1,
    kind: 'apartment', shared: details, sharedPhotos: [], units: Array.from({ length: count }, () => ({ details, bathroomPrivacy: 'shared' })), ...extra });
  await check('publishing closes its draft atomically, receipts recover the same result and cannot charge twice', async () => {
    const quote = await publishQuote(owner.id, 1); const input = batch(draft, 1, { expectedTotal: quote.total });
    const [a,b] = await Promise.all([publishUnits(owner.id, input), publishUnits(owner.id, input)]);
    assert.deepEqual(a,b); assert.deepEqual(await publishedBatch(owner.id, input.requestId),a);
    const saved = await drafts.readCreationDraft(owner.id,draft.id); assert.equal(saved.status,'published'); assert.deepEqual(saved.result,a);
    assert.equal((await drafts.listCreationDrafts(owner.id)).length,0);
    await assert.rejects(() => drafts.saveCreationDraft(owner.id,draft.id,{payload:document(),revision:1}), e => e.statusCode === 409);
    await assert.rejects(() => publishUnits(owner.id,{...input,requestId:randomUUID()}), e => e.statusCode === 409);
  });
  await check('402 rolls back all units and charges while preserving its active server draft', async () => {
    const row = await drafts.createCreationDraft(other.id,{id:randomUUID(),payload:document()});
    const before = (await client`SELECT count(*)::int n FROM listings`)[0].n;
    await assert.rejects(() => publishUnits(other.id,batch(row,2,{expectedTotal:1})),e => e.statusCode === 402);
    assert.equal((await client`SELECT count(*)::int n FROM listings`)[0].n,before);
    assert.equal((await drafts.readCreationDraft(other.id,row.id)).status,'active');
    assert.equal((await client`SELECT count(*)::int n FROM listing_charge_ledger WHERE owner_id=${other.id}`)[0].n,0);
  });
  await check('409 rejects stale draft revisions without publishing or spending', async () => {
    const row = await drafts.createCreationDraft(owner.id,{id:randomUUID(),payload:document()});
    await drafts.saveCreationDraft(owner.id,row.id,{payload:document(),revision:row.revision});
    const balance = (await client`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits;
    await assert.rejects(() => publishUnits(owner.id,batch(row)),e => e.statusCode === 409);
    assert.equal((await client`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits,balance);
  });
  await check('existing-place publishing rejects changed shared details without spending, then accepts a reviewed version', async () => {
    const [place] = await client`SELECT id,updated_at FROM places WHERE owner_id=${owner.id} LIMIT 1`;
    const p=document();p.place.id=place.id;
    const row=await drafts.createCreationDraft(owner.id,{id:randomUUID(),payload:p});
    const quote=await publishQuote(owner.id,1),balance=(await client`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits;
    const input=batch(row,1,{placeId:place.id,expectedTotal:quote.total,expectedPlaceUpdatedAt:new Date(place.updated_at).toISOString()});
    await client`UPDATE places SET updated_at=updated_at+interval '1 second' WHERE id=${place.id}`;
    await assert.rejects(()=>publishUnits(owner.id,input),e=>e.statusCode===409&&/Place details changed/.test(e.message));
    assert.equal((await client`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits,balance);
    assert.equal((await drafts.readCreationDraft(owner.id,row.id)).status,'active');
    const [fresh]=await client`SELECT updated_at FROM places WHERE id=${place.id}`;
    const result=await publishUnits(owner.id,{...input,expectedPlaceUpdatedAt:new Date(fresh.updated_at).toISOString()});
    assert.equal(result.placeId,place.id);assert.equal(result.listingIds.length,1);
  });
  await check('discard is account scoped and cannot be undone by late autosaves', async () => {
    const row = await drafts.createCreationDraft(owner.id,{id:randomUUID(),payload:document()});
    await assert.rejects(() => drafts.discardCreationDraft(other.id,row.id),e => e.statusCode === 409);
    await drafts.discardCreationDraft(owner.id,row.id);
    await assert.rejects(() => drafts.saveCreationDraft(owner.id,row.id,{payload:document(),revision:1}),e => e.statusCode === 409);
    await assert.rejects(() => drafts.readCreationDraft(owner.id,row.id),/not found/);
  });
}
