import { db, type Database } from "../../db/index.js";
import { adminAuditEvents } from "../../db/schema/index.js";
import type { AdminActor } from "../../middleware/auth.js";

export type AuditActorKind = "clerk" | "api_key" | "poster" | "system";

export type AuditActor = {
  kind: AuditActorKind;
  clerkId: string | null;
  userId: string | null;
};

export type AuditExecutor = Pick<Database, "insert">;

export async function writeAudit(
  actor: AuditActor | AdminActor,
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  executor?: AuditExecutor,
) {
  const client = executor ?? db;
  await client.insert(adminAuditEvents).values({
    actorKind: actor.kind,
    actorClerkId: actor.clerkId,
    actorUserId: actor.userId,
    action,
    entityType,
    entityId,
    payload,
  });
}
