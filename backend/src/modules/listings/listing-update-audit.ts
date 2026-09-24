import type { AuditActor, AuditExecutor } from "../admin/admin.audit.js";
import { writeAudit } from "../admin/admin.audit.js";
import {
  diffListingUpdate,
  isWithinStructuralWindow,
  type ListingUpdateSnapshot,
} from "./listing-edit-fields.js";

export type ListingUpdateAuditChannel = "host_patch" | "admin_patch";

export type ListingUpdateAuditPayload = {
  channel: ListingUpdateAuditChannel;
  editClass: "soft" | "hard" | "mixed";
  withinStructuralWindow: boolean;
  changedKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  publishedAt: string | null;
};

export type RecordListingUpdateAuditInput = {
  actor: AuditActor;
  listingId: string;
  channel: ListingUpdateAuditChannel;
  publishedAt: Date | string | null | undefined;
  before: ListingUpdateSnapshot;
  after: ListingUpdateSnapshot;
  now?: Date;
};

function serializePublishedAt(
  publishedAt: Date | string | null | undefined,
): string | null {
  if (publishedAt == null || publishedAt === "") return null;
  if (publishedAt instanceof Date) return publishedAt.toISOString();
  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) return String(publishedAt);
  return parsed.toISOString();
}

/**
 * Persist a listing field-edit row on `admin_audit_events`.
 * No-op (returns false) when nothing materially changed.
 * Call from listing PATCH in the same transaction as the update.
 * Pass full whitelist snapshots (pre/post row), not a sparse patch body.
 */
export async function recordListingUpdateAudit(
  input: RecordListingUpdateAuditInput,
  executor?: AuditExecutor,
): Promise<boolean> {
  const diff = diffListingUpdate(input.before, input.after);
  if (!diff) return false;

  const now = input.now ?? new Date();
  const payload: ListingUpdateAuditPayload = {
    channel: input.channel,
    editClass: diff.editClass,
    withinStructuralWindow: isWithinStructuralWindow(input.publishedAt, now),
    changedKeys: diff.changedKeys,
    before: diff.before,
    after: diff.after,
    publishedAt: serializePublishedAt(input.publishedAt),
  };

  await writeAudit(
    input.actor,
    "listing.update",
    "listing",
    input.listingId,
    payload,
    executor,
  );
  return true;
}

export {
  classifyListingEdit,
  diffListingUpdate,
  HARD_LISTING_KEYS,
  isMaterialPinMove,
  isWithinStructuralWindow,
  SOFT_LISTING_KEYS,
  STRUCTURAL_PIN_MAX_METERS,
} from "./listing-edit-fields.js";
