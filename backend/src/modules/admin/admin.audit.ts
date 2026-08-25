import { db } from "../../db/index.js";
import { adminAuditEvents } from "../../db/schema/index.js";
import type { AdminActor } from "../../middleware/auth.js";

export async function writeAudit(
  actor: AdminActor,
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
) {
  await db.insert(adminAuditEvents).values({
    actorKind: actor.kind,
    actorClerkId: actor.clerkId,
    action,
    entityType,
    entityId,
    payload,
  });
}
