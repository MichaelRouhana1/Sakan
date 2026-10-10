import { sql } from 'drizzle-orm';
import { check,index,integer,pgTable,text,timestamp,uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { listings } from './listings.js';

export const listingChargeLedger=pgTable('listing_charge_ledger',{
 id:uuid('id').defaultRandom().primaryKey(),
 ownerId:uuid('owner_id').notNull().references(()=>users.id),
 listingId:uuid('listing_id').references(()=>listings.id,{onDelete:'set null'}),
 listingIdSnapshot:uuid('listing_id_snapshot').notNull(),
 operationKey:text('operation_key').notNull().unique(),
 reason:text('reason').$type<'publish'|'renew'>().notNull(),
 credits:integer('credits').notNull(),
 createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[
 index('listing_charge_owner_idx').on(t.ownerId,t.createdAt),
 check('listing_charge_ledger_reason_check',sql`${t.reason} IN ('publish','renew')`),
 check('listing_charge_ledger_credits_check',sql`${t.credits} IN (0,1)`),
]);
