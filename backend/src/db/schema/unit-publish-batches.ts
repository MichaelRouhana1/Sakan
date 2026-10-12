import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const unitPublishBatches=pgTable('unit_publish_batches',{
 ownerId:uuid('owner_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 requestId:uuid('request_id').notNull(),
 requestHash:text('request_hash').notNull(),
 result:jsonb('result').$type<{placeId:string;listingIds:string[];credits:number[];total:number}>().notNull(),
 createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[primaryKey({columns:[t.ownerId,t.requestId]})]);
