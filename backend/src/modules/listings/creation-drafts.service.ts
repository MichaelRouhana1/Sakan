import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';

const screen = z.enum(['place-type','location','utilities','rules','building-photos','layout','photos','rent','copy','another','review','success']);
const position = z.object({ screen, unitId: z.string().max(100) });
const fields = z.record(z.string(), z.unknown());
const photo = z.object({ localId: z.string().max(100), uri: z.string().max(2048), url: z.string().max(2048).optional(),
  status: z.enum(['ready','uploading','error']), caption: z.string().max(48).optional(), error: z.string().max(500).optional() });
export const creationPayloadSchema = z.object({
  version: z.literal(2),
  place: z.object({ id: z.uuid().optional(), kind: z.enum(['apartment','building']).nullable(), data: fields, photos: z.array(photo).max(15) }),
  contact: fields,
  units: z.array(z.object({ id: z.string().min(1).max(100), data: fields, finished: z.boolean() })).max(20),
  position, completedPlace: z.array(z.enum(['place-type','location','utilities','rules','building-photos'])).max(5),
  returnTo: position.nullable(), reviewVisited: z.boolean(),
  pendingAttempt: z.object({ requestId: z.uuid(), body: fields }).optional(),
}).superRefine((value, context) => {
  if (JSON.stringify(value).length > 1_500_000) context.addIssue({ code: 'custom', message: 'Draft is too large' });
  if (new Set(value.units.map(u => u.id)).size !== value.units.length) context.addIssue({ code: 'custom', message: 'Unit IDs must be distinct' });
  if (!['review','success'].includes(value.position.screen) && !value.units.some(u => u.id === value.position.unitId)) context.addIssue({ code: 'custom', message: 'Choose a unit to continue' });
});
export const createDraftSchema = z.object({ id: z.uuid(), payload: creationPayloadSchema });
export const saveDraftSchema = z.object({ payload: creationPayloadSchema, revision: z.number().int().min(0) });

type Payload = z.infer<typeof creationPayloadSchema>;
async function ownedPlace(ownerId: string, payload: Payload) {
  if (!payload.place.id) return;
  const [place] = await db.execute(sql`SELECT id FROM places WHERE id=${payload.place.id}::uuid AND owner_id=${ownerId}::uuid`);
  if (!place) throw new NotFoundError('Place not found');
}
export function draftView(row: Record<string, unknown>) {
  return { id: row.id, revision: Number(row.revision), status: row.status, payload: row.payload, result: row.result,
    updatedAt: row.updated_at, createdAt: row.created_at };
}
export async function listCreationDrafts(ownerId: string) {
  const rows = await db.execute(sql`SELECT * FROM creation_drafts WHERE owner_id=${ownerId}::uuid AND status='active' ORDER BY updated_at DESC,id`);
  return rows.map(draftView);
}
export async function readCreationDraft(ownerId: string, id: string) {
  const [row] = await db.execute(sql`SELECT * FROM creation_drafts WHERE id=${id}::uuid AND owner_id=${ownerId}::uuid AND status<>'discarded'`);
  if (!row) throw new NotFoundError('Draft not found');
  return draftView(row);
}
export async function createCreationDraft(ownerId: string, input: z.infer<typeof createDraftSchema>) {
  await ownedPlace(ownerId, input.payload);
  await db.execute(sql`INSERT INTO creation_drafts(id,owner_id,payload) VALUES(${input.id}::uuid,${ownerId}::uuid,${JSON.stringify(input.payload)}::jsonb) ON CONFLICT(id) DO NOTHING`);
  return readCreationDraft(ownerId, input.id);
}
export async function saveCreationDraft(ownerId: string, id: string, input: z.infer<typeof saveDraftSchema>) {
  await ownedPlace(ownerId, input.payload);
  return db.transaction(async tx => {
    const [row] = await tx.execute(sql`SELECT * FROM creation_drafts WHERE id=${id}::uuid AND owner_id=${ownerId}::uuid FOR UPDATE`);
    if (!row) throw new NotFoundError('Draft not found');
    if (row.status !== 'active') throw new ConflictError('This draft is no longer in progress. Reload to see its result.');
    const [saved] = await tx.execute(sql`UPDATE creation_drafts SET payload=${JSON.stringify(input.payload)}::jsonb,revision=revision+1,updated_at=now() WHERE id=${id}::uuid RETURNING *`);
    return { ...draftView(saved!), updatedElsewhere: Number(row.revision) !== input.revision };
  });
}
export async function discardCreationDraft(ownerId: string, id: string) {
  const [row] = await db.execute(sql`UPDATE creation_drafts SET status='discarded',revision=revision+1,updated_at=now() WHERE id=${id}::uuid AND owner_id=${ownerId}::uuid AND status='active' RETURNING id`);
  if (!row) throw new ConflictError('This draft was already published or removed. Reload your listings.');
}
