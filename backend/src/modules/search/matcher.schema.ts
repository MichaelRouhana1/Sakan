import { z } from 'zod';

const importance = z.enum(['prefer', 'required']);
const answer = <T extends z.ZodType>(value: T) => z.object({ value, importance });
const budget = z.object({ min: z.number().int().positive().nullable(), max: z.number().int().positive().nullable() })
  .refine(b => (b.min != null || b.max != null) && !(b.min != null && b.max != null && b.min > b.max), 'Invalid budget range');
const location = z.object({
  kind: z.enum(['area', 'campus']), label: z.string().max(200),
  areas: z.array(z.string().min(1).max(100)).min(1).max(15).optional(),
  campusId: z.string().uuid().optional(), slug: z.string().min(1).max(100).optional(),
  center: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  radiusKm: z.number().positive().max(100).optional(),
}).refine(l => l.kind === 'area' ? !!l.areas?.length : !!(l.campusId || l.slug), 'Location identity required');
export const matcherPreferencesSchema = z.object({
  version: z.literal(1),
  type: answer(z.array(z.enum(['studio', 'entire_apartment', 'private_room', 'shared_dorm_bed', 'pbsa_building'])).min(1).max(5)).optional(),
  budget: answer(budget).optional(), location: answer(location).optional(),
  gender: answer(z.array(z.enum(['boys_only', 'girls_only'])).min(1).max(2)).optional(),
  power: answer(z.array(z.enum(['solar', 'generator_24_7', 'scheduled_cuts'])).min(1).max(3)).optional(),
  wifi: answer(z.literal(true)).optional(),
});
export const matcherQuerySchema = z.string().max(5000).transform((value, ctx) => {
  try { return JSON.parse(value); } catch { ctx.addIssue({ code: 'custom', message: 'Invalid matcher JSON' }); return z.NEVER; }
}).pipe(matcherPreferencesSchema).optional();
